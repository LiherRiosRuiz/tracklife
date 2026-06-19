# Comandos

Referencia rápida de operaciones del workspace. Todos desde WSL2.

```bash
cd /mnt/d/Compartida/LIHER
```

---

## Día a día

| Comando | Qué hace |
|---------|----------|
| `make up` | Levanta infra + todas las webs |
| `make down` | Para todo |
| `make restart` | Down + Up |
| `make ps` | Estado de contenedores (nombres + status + puertos) |

---

## Solo infraestructura

| Comando | Qué hace |
|---------|----------|
| `make infra-up` | Solo Traefik + MongoDB + Portainer |
| `make infra-down` | Para solo infra |
| `make infra-restart` | Reinicia infra |

---

## Proyectos individuales

| Comando | Qué hace |
|---------|----------|
| `make web1-up` | Solo web1-astro (rebuild) |
| `make web2-up` | Solo web2-nuxt (rebuild) |
| `make web3-up` | Solo tracklife app (rebuild) |
| `make tracklife-up` | Alias de web3-up |
| `make api-up` | Solo api-laravel (rebuild) |
| `make web-up` | Las 4 webs |
| `make web1-down` | Para web1-astro |
| `make web2-down` | Para web2-nuxt |
| `make web3-down` | Para tracklife |
| `make tracklife-down` | Alias de web3-down |
| `make api-down` | Para api-laravel |

---

## Logs

| Comando | Qué hace |
|---------|----------|
| `make logs-web1` | Logs de web1-astro (follow) |
| `make logs-web2` | Logs de web2-nuxt (follow) |
| `make logs-web3` | Logs de tracklife app (follow) |
| `make logs-api` | Logs de api-laravel (follow) |
| `make logs-traefik` | Logs de Traefik (follow) |
| `make logs-mongo` | Logs de MongoDB (follow) |

---

## Framework Platón SDD

```bash
bash platon.sh              # Iniciar sesión Platón (desde LIHER/)
bash .sdd/guard/install.sh  # Instalar Guardian Angel pre-commit hook
```

---

## API Laravel (dentro del contenedor o en local)

```bash
php artisan test                    # Suite completa
php artisan test tests/Feature      # Solo Feature tests
php artisan test tests/Unit         # Solo Unit tests
php artisan test --parallel         # Paralelo
./vendor/bin/pint                   # Formatear código
./vendor/bin/pint --test            # Solo verificar formato
php artisan db:seed                 # Sembrar datos de TracklifeSeeder
php artisan route:list              # Ver todas las rutas
```

---

## Docker directo

```bash
docker ps                           # Contenedores activos
docker logs <container> -f          # Logs en vivo
docker exec -it api-laravel bash    # Shell en el contenedor
docker exec -it mongodb mongosh     # Consola MongoDB
docker network ls                   # Ver redes
docker volume ls                    # Ver volúmenes
```

---

## Primera vez

```bash
bash setup.sh    # Crea redes Docker + levanta infra
make web-up      # Levanta webs (scaffold automático la primera vez, lento)
```

---

## Port forwarding WSL2 (en Windows, como Administrador)

```powershell
powershell -ExecutionPolicy Bypass -File D:\Compartida\LIHER\infra\scripts\wsl-portforward.ps1
```

Necesario después de cada reinicio del servidor.

---

## Limpieza

```bash
make clean       # Para todo + borra redes Docker + docker system prune
```

---

Ver también: [[Arquitectura Docker]], [[Hosts y DNS]], [[TRACKLIFE]]
