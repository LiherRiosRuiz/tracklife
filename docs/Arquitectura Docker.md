# Arquitectura Docker

Todo corre en Docker Engine dentro de WSL2 Ubuntu (contenedores Linux).
El servidor Windows tiene tambien Docker Engine Windows (modo Windows containers)
con Portainer original en :9443, pero el stack web usa exclusivamente WSL2.

## Diagrama

```
LAN / Internet
      |
      v
  Traefik (:80)
      |
      +---> web1-astro (:4321)     Host: web1.test
      +---> web2-nuxt  (:3000)     Host: web2.test
      +---> web3-next  (:3000)     Host: web3.test
      +---> api-laravel (:8000)    Host: api.test
                |
                v
            MongoDB (:27017)   [solo red interna]
```

## Redes

| Red | Proposito | Miembros |
|-----|-----------|----------|
| `traefik_net` | Traefik habla con los servicios web | Traefik, web1, web2, web3, api, Portainer |
| `backend_net` | API habla con la DB | api-laravel, MongoDB |

MongoDB NO esta en `traefik_net`. No es accesible desde fuera.

## Volumenes

| Volumen | Tipo | Proposito |
|---------|------|-----------|
| `mongodb_data` | Named | Datos MongoDB, filesystem nativo WSL2 |
| `portainer_data` | Named | Config Portainer |
| `/app/node_modules` | Anonimo | Deps de Node fuera de NTFS (rendimiento) |
| `/app/vendor` | Anonimo | Deps de PHP fuera de NTFS |
| `/app/.nuxt`, `/app/.next` | Anonimo | Cache de build fuera de NTFS |

## Puertos expuestos

| Puerto | Servicio | Nota |
|--------|----------|------|
| 80 | Traefik | Enruta por Host header |
| 8080 | Traefik dashboard | Acceso directo |
| 9100 | Portainer | Mapeado desde 9000 interno |

Los servicios web NO exponen puertos al host. Solo son accesibles via [[Traefik]].

## Rendimiento NTFS

El codigo fuente vive en NTFS (bind mount desde `/mnt/d/`). Es suficiente para
desarrollo. Las dependencias y caches van en volumenes Docker (ext4 nativo WSL2)
para evitar la penalizacion de I/O de NTFS.

Si un proyecto necesita maximo rendimiento: moverlo a `~/projects/` dentro de WSL2.

---

Ver tambien: [[Traefik]], [[MongoDB]], [[Portainer]], [[Comandos]]
