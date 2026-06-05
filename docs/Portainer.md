# Portainer

UI web para gestionar contenedores Docker visualmente.

- **Imagen**: `portainer/portainer-ce:lts`
- **URL**: http://portainer.test o http://192.168.20.123:9100
- **Config**: `infra/portainer/docker-compose.yml`
- **Ruta**: `infra/portainer/`

## Notas

- Primera vez: tienes 5 minutos para crear el usuario admin antes de que
  Portainer se bloquee por seguridad. Si se pasa el tiempo, reiniciar el
  contenedor (`docker restart portainer-linux`).
- Volumen `portainer_data` persiste la config entre reinicios.
- Hay DOS Portainer en el servidor:
  - **Portainer Linux** (este) en :9100 — gestiona el stack WSL2
  - **Portainer Windows** en :9443 — gestiona contenedores Windows nativos

---

Ver tambien: [[Arquitectura Docker]], [[Comandos]]
