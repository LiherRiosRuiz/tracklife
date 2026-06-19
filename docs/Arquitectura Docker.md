# Arquitectura Docker

Todo el stack corre en Docker Engine dentro de WSL2 Ubuntu (contenedores Linux).
El servidor Windows tiene también Docker Engine Windows (modo Windows containers)
con Portainer original en `:9443`, pero el stack web usa exclusivamente WSL2.

---

## Diagrama de red

```
LAN / Internet  →  192.168.20.123 (Windows Server)
                        │
                        │  netsh portproxy (wsl-portforward.ps1)
                        │  :80, :8080, :9100 → WSL2 Ubuntu
                        ▼
                   WSL2 Ubuntu (Docker Engine Linux)
                        │
                        ▼
                   Traefik (:80)  ←── lee labels Docker automáticamente
                        │
                        ├── Host(www.tracklife.test) ──→ web1-astro (:4321)
                        ├── Host(app.tracklife.test)  ──→ tracklife   (:3000)
                        │   Host(tracklife.test)      ──→
                        ├── Host(api.tracklife.test)  ──→ api-laravel (:8000)
                        ├── Host(web2.test)           ──→ web2-nuxt   (:3000)
                        ├── Host(traefik.test)        ──→ API Traefik (dashboard)
                        └── Host(portainer.test)      ──→ portainer   (:9000)
                                                              ↕
                                                       api-laravel (:backend_net)
                                                              ↕
                                                        mongodb (:27017)
                                                       [solo backend_net]
```

---

## Contenedores

| Nombre | Imagen | Dominio | Puerto host |
|--------|--------|---------|-------------|
| `traefik` | traefik:latest | traefik.test | 80, 8080 |
| `mongodb` | mongo:7 | — (interno) | — |
| `portainer-linux` | portainer-ce:lts | portainer.test | 9100 |
| `web1-astro` | build local | www.tracklife.test | — |
| `tracklife` | build local | app.tracklife.test | — |
| `api-laravel` | build local | api.tracklife.test | — |
| `web2-nuxt` | build local | web2.test | — |

Los servicios web **no exponen puertos al host** — solo son accesibles vía Traefik.

---

## Redes Docker

| Red | Externa | Miembros | Propósito |
|-----|---------|----------|-----------|
| `traefik_net` | Sí (manual) | traefik, web1-astro, tracklife, api-laravel, web2-nuxt, portainer | Traefik ↔ servicios web |
| `backend_net` | Sí (manual) | api-laravel, mongodb | API ↔ base de datos |

MongoDB **NO está en `traefik_net`** — inaccesible desde el exterior.

Crear redes manualmente (primera vez):
```bash
docker network create traefik_net
docker network create backend_net
```
O automáticamente: `make setup` / `make infra-up`.

---

## Volúmenes

| Nombre | Tipo | Montado en | Propósito |
|--------|------|-----------|-----------|
| `mongodb_data` | Named | /data/db en `mongodb` | Datos MongoDB — ext4 WSL2 |
| `portainer_data` | Named | /data en `portainer-linux` | Config Portainer |
| `web1_node_modules` | Named | /app/node_modules en `web1-astro` | Deps Node — ext4 WSL2 |
| `tracklife_node_modules` | Named | /app/node_modules en `tracklife` | Deps Node — ext4 WSL2 |
| `web2_node_modules` | Named | /app/node_modules en `web2-nuxt` | Deps Node — ext4 WSL2 |
| `api_vendor` | Named | /app/vendor en `api-laravel` | Deps PHP — ext4 WSL2 |

**Regla**: dependencias y caches de build van en volúmenes named (ext4 nativo WSL2). El código fuente va en bind mount desde `/mnt/d/...` (NTFS, suficiente para dev con hot-reload).

---

## Port forwarding WSL2

WSL2 tiene su propia IP interna que cambia en cada reinicio. El script `infra/scripts/wsl-portforward.ps1` configura `netsh portproxy` para redirigir puertos del host Windows a WSL2:

```powershell
# Puertos reenviados: 80 (Traefik), 8080 (dashboard), 9100 (Portainer)
$wslIP = (wsl -d Ubuntu -- hostname -I).Trim().Split(" ")[0]
netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=80 connectaddress=$wslIP connectport=80
# (idem para 8080 y 9100)
```

**Ejecución**: como Administrador, después de cada reinicio de Windows.
```powershell
powershell -ExecutionPolicy Bypass -File D:\Compartida\wsl-portforward.ps1
```

**Pendiente**: automatizar con Task Scheduler (la IP de WSL2 cambia en cada arranque).

---

## Patrón Docker por proyecto

Todos los proyectos siguen el mismo patrón:

```
proyecto/
├── Dockerfile          # FROM node:22-alpine (o php:8.3-cli)
│                       # Instala dependencias base (composer, git, etc.)
├── docker-entrypoint.sh # Auto-scaffold si el proyecto no existe
│                       # Instala deps si volumen está vacío
│                       # Lanza el servidor de desarrollo
└── docker-compose.yml  # Bind mount .:/app + named volume para node_modules/vendor
                        # Labels Traefik con Host rule
                        # Networks: traefik_net (+ backend_net para api)
```

**Auto-scaffold**: si el proyecto aún no tiene código (solo el Dockerfile), el entrypoint crea el proyecto la primera vez. Esto permite levantar todo con `make web-up` en una sola operación.

---

## Traefik (detalle técnico)

Config en `infra/traefik/traefik.yml`:
```yaml
api:
  dashboard: true
  insecure: true    # Dashboard sin auth (dev local)

entryPoints:
  web:
    address: ":80"

providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false   # Solo containers con traefik.enable=true
    network: traefik_net
```

Cada servicio se registra con labels en su docker-compose:
```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.{name}.rule=Host(`{dominio}`)"
  - "traefik.http.routers.{name}.entrypoints=web"
  - "traefik.http.services.{name}.loadbalancer.server.port={puerto_interno}"
```

**Variable de entorno**: `DOCKER_API_VERSION=1.45` en el contenedor Traefik (necesaria porque Docker Engine 29.5 deprecó API v1.24).

---

## Rendimiento NTFS vs ext4

El código fuente en NTFS (`/mnt/d/...`) tiene overhead de I/O pero es funcional para development. Las dependencias y caches son el cuello de botella real:

| Directorio | Solución | Ganancia |
|-----------|---------|----------|
| `node_modules/` | Volumen named Docker (ext4) | Alto |
| `vendor/` (PHP) | Volumen named Docker (ext4) | Alto |
| `.nuxt/`, `.next/` | Volumen anónimo Docker (ext4) | Medio |

Si un proyecto necesita máximo rendimiento: moverlo a `~/projects/` dentro de WSL2 (filesystem nativo, sin bind mount NTFS).

---

Ver también: [[Traefik]], [[MongoDB]], [[Portainer]], [[Hosts y DNS]], [[Comandos]]
