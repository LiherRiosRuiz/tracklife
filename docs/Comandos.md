# Comandos

Referencia rapida de operaciones del workspace. Todos desde WSL2.

```bash
cd /mnt/d/Compartida/LIHER
```

## Dia a dia

| Comando | Que hace |
|---------|----------|
| `make up` | Levanta infra + todas las webs |
| `make down` | Para todo |
| `make restart` | Down + Up |
| `make ps` | Estado de contenedores |

## Solo infraestructura

| Comando | Que hace |
|---------|----------|
| `make infra-up` | Solo Traefik + MongoDB + Portainer |
| `make infra-down` | Para solo infra |
| `make infra-restart` | Reinicia infra |

## Proyectos individuales

| Comando | Que hace |
|---------|----------|
| `make web1-up` | Solo Astro (rebuild) |
| `make web2-up` | Solo Nuxt (rebuild) |
| `make web3-up` | Solo Next.js (rebuild) |
| `make api-up` | Solo Laravel (rebuild) |
| `make web-up` | Las 4 webs |

## Logs

| Comando | Que hace |
|---------|----------|
| `make logs-web1` | Logs de Astro |
| `make logs-web2` | Logs de Nuxt |
| `make logs-web3` | Logs de Next.js |
| `make logs-api` | Logs de Laravel |
| `make logs-traefik` | Logs de Traefik |
| `make logs-mongo` | Logs de MongoDB |

## Primera vez

```bash
bash setup.sh    # Crea redes Docker + levanta infra
make web-up      # Levanta webs (scaffold automatico)
```

## Limpieza

```bash
make clean       # Para todo + borra redes + docker prune
```

---

Ver tambien: [[Home]], [[Arquitectura Docker]]
