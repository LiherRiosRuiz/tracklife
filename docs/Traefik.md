# Traefik

Reverse proxy que enruta peticiones HTTP por Host header a cada contenedor.

- **Imagen**: `traefik:latest` (v3.x)
- **Config**: `infra/traefik/traefik.yml` + `docker-compose.yml`
- **Dashboard**: http://192.168.20.123:8080 o http://traefik.test
- **Ruta**: `infra/traefik/`

## Como funciona

Traefik lee labels de los contenedores Docker para auto-descubrir servicios.
Cada docker-compose define sus propias labels de enrutamiento:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.web1.rule=Host(`web1.test`)"
  - "traefik.http.services.web1.loadbalancer.server.port=4321"
```

No hay que tocar la config de Traefik para anadir un servicio nuevo. Solo
anadir labels al docker-compose del servicio.

## Notas tecnicas

- `DOCKER_API_VERSION=1.45` — necesario porque Docker Engine 29.5 depreco API v1.24
- Escucha en `:80` (entrypoint `web`) y `:8080` (dashboard)
- Red: `traefik_net` (external)

## Anadir un nuevo servicio

1. Crear docker-compose con labels de Traefik
2. Conectar a `traefik_net`
3. `docker compose up -d`
4. Traefik lo detecta automaticamente

---

Ver tambien: [[Arquitectura Docker]], [[Hosts y DNS]], [[Stack Web]]
