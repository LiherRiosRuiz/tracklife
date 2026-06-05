# =============================================================================
# Makefile — Ejecutar desde WSL2:  cd /mnt/d/Compartida/LIHER && make <target>
# =============================================================================

ROOT := $(shell pwd)

.PHONY: setup infra-up infra-down infra-restart \
        web1-up web2-up web3-up api-up web-up \
        web1-down web2-down web3-down api-down \
        up down restart ps logs clean help

# ── Setup ────────────────────────────────────────────────────────────────────
setup:
	@bash $(ROOT)/setup.sh

# ── Infraestructura ──────────────────────────────────────────────────────────
infra-up:
	@docker network create traefik_net 2>/dev/null || true
	@docker network create backend_net 2>/dev/null || true
	@cd infra/traefik   && docker compose up -d
	@cd infra/mongodb   && docker compose up -d
	@cd infra/portainer && docker compose up -d

infra-down:
	@cd infra/portainer && docker compose down || true
	@cd infra/mongodb   && docker compose down || true
	@cd infra/traefik   && docker compose down || true

infra-restart: infra-down infra-up

# ── Proyectos web ────────────────────────────────────────────────────────────
web1-up:
	@cd projects/web/web1-astro   && docker compose up -d --build

web2-up:
	@cd projects/web/web2-nuxt    && docker compose up -d --build

web3-up:
	@cd projects/web/web3-next    && docker compose up -d --build

api-up:
	@cd projects/web/api-laravel  && docker compose up -d --build

web-up: web1-up web2-up web3-up api-up

web1-down:
	@cd projects/web/web1-astro   && docker compose down || true

web2-down:
	@cd projects/web/web2-nuxt    && docker compose down || true

web3-down:
	@cd projects/web/web3-next    && docker compose down || true

api-down:
	@cd projects/web/api-laravel  && docker compose down || true

# ── Global ───────────────────────────────────────────────────────────────────
up: infra-up web-up

down: web1-down web2-down web3-down api-down infra-down

restart: down up

# ── Utilidades ───────────────────────────────────────────────────────────────
ps:
	@docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

logs-web1:
	@cd projects/web/web1-astro  && docker compose logs -f

logs-web2:
	@cd projects/web/web2-nuxt   && docker compose logs -f

logs-web3:
	@cd projects/web/web3-next   && docker compose logs -f

logs-api:
	@cd projects/web/api-laravel && docker compose logs -f

logs-traefik:
	@cd infra/traefik     && docker compose logs -f

logs-mongo:
	@cd infra/mongodb     && docker compose logs -f

clean: down
	@docker network rm traefik_net backend_net 2>/dev/null || true
	@docker system prune -f

# ── Help ─────────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "Targets disponibles:"
	@echo "  make setup          Primera vez: redes + env + infraestructura"
	@echo "  make infra-up       Solo infraestructura (Traefik + MongoDB + Portainer)"
	@echo "  make web-up         Solo proyectos web (scaffoldea si no existen)"
	@echo "  make up             Todo"
	@echo "  make down           Para todo"
	@echo "  make ps             Estado de los contenedores"
	@echo "  make logs-web1      Logs de web1-astro"
	@echo "  make logs-web2      Logs de web2-nuxt"
	@echo "  make logs-web3      Logs de web3-next"
	@echo "  make logs-api       Logs de api-laravel"
	@echo "  make clean          Para todo + limpia redes + prune"
	@echo ""
