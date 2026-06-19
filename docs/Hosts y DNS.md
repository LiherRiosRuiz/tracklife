# Hosts y DNS

Los dominios `.test` se resuelven vía archivo hosts, no DNS real.

---

## Configuración

Añadir en `C:\Windows\System32\drivers\etc\hosts` de cada máquina de la red:

```
# Infraestructura
192.168.20.123  traefik.test portainer.test

# TRACKLIFE
192.168.20.123  tracklife.test app.tracklife.test www.tracklife.test api.tracklife.test

# Otros proyectos
192.168.20.123  web2.test
```

En Linux/macOS añadir en `/etc/hosts`.

---

## Mapa completo de dominios

| Dominio | Contenedor | Descripción |
|---------|-----------|-------------|
| `traefik.test` | traefik | Dashboard de Traefik |
| `portainer.test` | portainer-linux | UI de Portainer |
| `www.tracklife.test` | web1-astro | Landing de TRACKLIFE |
| `app.tracklife.test` | tracklife | App TRACKLIFE |
| `tracklife.test` | tracklife | Alias de app |
| `api.tracklife.test` | api-laravel | API REST de TRACKLIFE |
| `web2.test` | web2-nuxt | Proyecto sandbox Nuxt 4 |

---

## Cómo funciona el flujo completo

```
Navegador (cualquier PC de la red)
    │
    │  DNS local: tracklife.test → 192.168.20.123  (via /etc/hosts)
    ▼
Windows Server :80
    │
    │  netsh portproxy (wsl-portforward.ps1)
    │  :80 → WSL2 IP:80
    ▼
WSL2 Ubuntu — Docker — Traefik :80
    │
    │  Header: Host: app.tracklife.test
    ▼
Contenedor tracklife :3000
```

---

## Port forwarding WSL2

WSL2 tiene su propia IP interna (cambia en cada reinicio del servidor). El tráfico de la LAN llega a Windows en `:80`, pero Docker escucha en WSL2. El script `infra/scripts/wsl-portforward.ps1` hace el puente:

**Puertos reenviados:**
| Puerto | Servicio |
|--------|---------|
| 80 | Traefik (todo el tráfico HTTP) |
| 8080 | Dashboard de Traefik |
| 9100 | Portainer |

**Ejecutar** (como Administrador en PowerShell):
```powershell
powershell -ExecutionPolicy Bypass -File D:\Compartida\LIHER\infra\scripts\wsl-portforward.ps1
```

**Ver reglas activas:**
```powershell
netsh interface portproxy show all
```

**Pendiente**: automatizar con Task Scheduler para que se ejecute en cada arranque del servidor.

---

## Acceso directo (sin Traefik)

| Servicio | URL directa |
|---------|------------|
| Traefik dashboard | `http://192.168.20.123:8080` |
| Portainer | `http://192.168.20.123:9100` |

---

Ver también: [[Traefik]], [[Arquitectura Docker]], [[Pendientes]]
