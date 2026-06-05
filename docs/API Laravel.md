# API Laravel

Backend REST basado en Laravel 11.

- **Dominio**: http://api.test
- **Puerto interno**: 8000
- **Ruta**: `projects/web/api-laravel/`
- **Framework**: Laravel 11 (v13.13.0)

## Archivos clave

| Archivo | Funcion |
|---------|---------|
| `Dockerfile` | Imagen PHP + Composer + scaffold |
| `docker-entrypoint.sh` | Crea proyecto Laravel si no existe, migra DB |
| `docker-compose.yml` | Labels Traefik, env vars, redes traefik_net + backend_net |

## Base de datos

**Actualmente**: SQLite (temporal, funcional).
**Objetivo**: [[MongoDB]] via `mongodb/laravel-mongodb`.

Variables de entorno para MongoDB ya estan definidas en el docker-compose:
```
MONGO_HOST: mongodb
MONGO_PORT: 27017
MONGO_DATABASE: laravel
```

Solo falta instalar el package y cambiar `DB_CONNECTION` de `sqlite` a `mongodb`.

## CORS

Traefik gestiona CORS con middleware:
- Origins permitidos: `http://web1.test`, `http://web2.test`, `http://web3.test`
- Metodos: GET, POST, PUT, DELETE, OPTIONS
- Headers: Content-Type, Authorization

## Redes

Conectado a dos redes:
- `traefik_net` — para recibir trafico de [[Traefik]]
- `backend_net` — para hablar con [[MongoDB]]

---

Ver tambien: [[Stack Web]], [[MongoDB]], [[Pendientes]]
