# MongoDB

Base de datos compartida para todos los proyectos que la necesiten.

- **Imagen**: `mongo:7`
- **Config**: `infra/mongodb/docker-compose.yml`
- **Credenciales**: `infra/mongodb/.env` (copiado de `.env.example`)
- **Ruta**: `infra/mongodb/`

## Acceso

MongoDB solo esta en la red `backend_net`. No expone puertos al host.
Para conectar desde un contenedor:

```
Host: mongodb
Puerto: 27017
User: $MONGO_USER (default: admin)
Pass: $MONGO_PASSWORD
```

Para conectar con MongoDB Compass desde Windows, descomentar el port mapping
en el docker-compose:

```yaml
ports:
  - "27017:27017"
```

## Datos

Volumen nombrado `mongodb_data` — filesystem nativo WSL2, no NTFS.
Persiste entre reinicios de contenedor.

## Estado actual

[[API Laravel]] esta configurado con SQLite temporalmente. Pendiente migrar
a MongoDB como DB principal (requiere `mongodb/laravel-mongodb` package).

---

Ver tambien: [[Arquitectura Docker]], [[API Laravel]], [[Pendientes]]
