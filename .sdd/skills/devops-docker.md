---
skill: devops-docker
version: "Docker Engine WSL2 + Traefik v3 + MongoDB 7"
projects: [api-laravel, web1-astro, web2-nuxt, web3-next]
triggers: [docker, compose, traefik, wsl, wsl2, network, volume, portproxy, container, infra]
---

# Docker / Traefik / WSL2 — Patrones de infraestructura LIHER

Esta skill documenta CÓMO está construida la infraestructura del workspace y los
edge cases conocidos — conocimiento implícito que hoy solo vive disperso en
`config.yaml` (sección `calibration.checks`) y en la cabeza de Liher.

## Topología

```
LAN -> Traefik (:80, dashboard :8080) -> servicios web (routing por Host header)
                                          MongoDB (red interna, NO expuesta)
Portainer :9100 <- gestión visual de contenedores
```

Dos redes Docker, con propósitos distintos:

- **`traefik_net`**: Traefik + TODOS los servicios web (frontends + API).
  Permite que Traefik enrute por `Host()` a cualquier servicio.
- **`backend_net`**: solo `api-laravel` + `mongodb`. MongoDB nunca toca `traefik_net`
  — no es alcanzable desde fuera, ni siquiera vía el reverse proxy.

```bash
# Crear redes (idempotente — se ejecuta en `make infra-up` y en setup.sh)
docker network create traefik_net 2>/dev/null || true
docker network create backend_net 2>/dev/null || true
```

## Labels de Traefik (routing por Host header)

Patrón estándar de un `docker-compose.yml` de proyecto web (ejemplo real, `api-laravel`):

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.api.rule=Host(`api.tracklife.test`)"
  - "traefik.http.routers.api.entrypoints=web"
  - "traefik.http.services.api.loadbalancer.server.port=8000"
  # CORS vía middleware de Traefik (alternativa a configurarlo en el framework)
  - "traefik.http.middlewares.api-cors.headers.accesscontrolalloworiginlist=http://app.tracklife.test,..."
  - "traefik.http.middlewares.api-cors.headers.accesscontrolallowmethods=GET,POST,PUT,DELETE,OPTIONS"
  - "traefik.http.middlewares.api-cors.headers.accesscontrolallowheaders=Content-Type,Authorization"
  - "traefik.http.routers.api.middlewares=api-cors"
```

Reglas:

- Un router por servicio, nombre corto y único (`api`, `web1`, `web3`...) — colisiones
  de nombre de router hacen que Traefik ignore uno de los dos servicios silenciosamente
- `entrypoints=web` (puerto 80) salvo necesidad explícita de TLS
- El puerto del `loadbalancer.server.port` debe coincidir con el puerto interno
  real del contenedor (el que expone el proceso, NO el publicado en `ports:`)
- Middlewares (CORS, CSP, auth) se declaran una vez y se asocian al router vía
  `traefik.http.routers.<name>.middlewares=<m1>,<m2>`

## Volúmenes nombrados — por qué y cómo

Regla de rendimiento WSL2 (documentada en `CLAUDE.md` raíz): todo directorio con
muchos archivos pequeños y reescrituras frecuentes (`node_modules`, `vendor`, datos
de BD) va en un **volumen nombrado Docker** (filesystem nativo WSL2/ext4), nunca
en un bind mount NTFS — el rendimiento de I/O en NTFS vía 9p es órdenes de magnitud peor.

```yaml
# Patrón estándar — bind mount para código, volumen nombrado para deps
volumes:
  - .:/app                    # código fuente — bind mount NTFS, OK para edición
  - api_vendor:/app/vendor    # dependencias — volumen nombrado, filesystem nativo

volumes:
  api_vendor:
```

**Edge case crítico**: si se recrea el contenedor (`docker compose up -d --build`
tras borrar el volumen, o `docker volume rm`), el volumen nombrado queda VACÍO —
hay que reinstalar dependencias (`composer install` / `npm install`) dentro del
contenedor. Esto rompe builds silenciosamente si no se sabe que puede pasar.

```bash
# Reinstalar deps dentro de un contenedor tras volumen vacío
docker compose exec api-laravel composer install
docker compose exec web3-next npm install
```

## Variables de entorno — dónde viven

- **Nunca** en `docker-compose.yml` directamente (regla BLOCKER del Guardian Angel)
- Sí: defaults con `${VAR:-default}` en compose, valores reales en `.env` por servicio
- `infra/mongodb/.env` es REQUERIDO — sin él, MongoDB no arranca (edge case
  documentado en `config.yaml calibration.checks.environment.env_files`)
- `projects/web/api-laravel/.env` REQUERIDO — sin `APP_KEY`, `php artisan test` falla
  en cifrado de sesión

```yaml
# Patrón: default seguro para dev, override real vía .env
environment:
  MONGO_PASSWORD: ${MONGO_PASSWORD:-changeme_in_production}
```

## Port forwarding WSL2 -> Windows -> LAN

WSL2 corre en una red NAT interna con IP que **cambia en cada reinicio** de la
máquina o de la distro. Para que la LAN (`192.168.20.123`) llegue a los servicios,
Windows necesita reglas de `netsh portproxy` apuntando a la IP actual de WSL2.

`infra/scripts/wsl-portforward.ps1` automatiza esto:

```powershell
$wslIP = (wsl -d Ubuntu -- hostname -I).Trim().Split(" ")[0]
$ports = @(80, 8080, 9100)   # Traefik, dashboard, Portainer
foreach ($port in $ports) {
    netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=$port
    netsh interface portproxy add    v4tov4 listenaddress=0.0.0.0 listenport=$port connectaddress=$wslIP connectport=$port
}
```

**Edge case crítico** (el más recurrente del workspace, según `Pendientes.md`):
si la máquina se reinicia y el script no se vuelve a ejecutar, todas las reglas
de portproxy apuntan a una IP de WSL2 que ya no existe -> la LAN deja de poder
acceder a `*.test`. Requiere ejecución como Administrador tras cada arranque de
WSL2 — automatizable vía Task Scheduler con trigger "al iniciar sesión" (ver
`make portproxy` en el Makefile, que envuelve este script).

## Edge cases del entorno (checklist mental antes de depurar "no funciona")

Lista derivada de `config.yaml calibration.checks.environment` — repasar en orden
cuando algo del stack "no arranca" sin motivo aparente:

1. `docker info` responde — ¿Docker Engine WSL2 está corriendo? (hay DOS engines:
   uno en modo Windows containers para Portainer original, otro en modo Linux
   para todo el stack web — confirmar que se está usando el correcto)
2. `docker network ls` muestra `traefik_net` y `backend_net` — si faltan, nada enruta
3. `infra/mongodb/.env` y `projects/web/api-laravel/.env` existen y tienen las
   variables requeridas (`APP_KEY`, credenciales Mongo)
4. Puertos `80, 3000, 4321, 8000, 8080, 9100` libres — conflictos típicos con
   IIS/Skype/otros servicios Windows que reservan el 80
5. La IP de WSL2 ha cambiado desde el último `wsl-portforward.ps1` — síntoma:
   todo funciona DESDE el host pero no desde la LAN
6. PHP: extensión `pecl mongodb` cargada — si falta, Laravel no puede conectar
   a MongoDB aunque el contenedor esté sano
7. Espacio en disco del volumen ext4 de WSL2 (`wsl --shutdown` + comprobar
   tamaño de `ext4.vhdx` si los builds empiezan a fallar sin razón aparente)

## Anti-patterns

- Bind-mountear `node_modules`/`vendor` desde NTFS — mata el rendimiento de I/O
- Hardcodear la IP de WSL2 en cualquier sitio (cambia en cada reinicio — usar
  siempre resolución dinámica vía `wsl -d Ubuntu -- hostname -I`)
- Exponer el puerto 27017 de MongoDB fuera de `backend_net` (regla BLOCKER del
  Guardian Angel — MongoDB solo debe ser alcanzable desde `api-laravel`)
- Variables sensibles directamente en `docker-compose.yml` en lugar de `.env`
- Asumir que un volumen nombrado persiste datos tras `docker compose down -v`
  o `docker volume prune` — son operaciones destructivas, requieren backup previo
- Routers de Traefik con nombres duplicados entre proyectos (colisión silenciosa)
