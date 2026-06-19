# =============================================================================
# Makefile — Ejecutar desde WSL2:  cd /mnt/d/Compartida/LIHER && make <target>
# =============================================================================

ROOT := $(shell pwd)

.PHONY: setup panel status infra-up infra-down infra-restart \
        web1-up web2-up web3-up api-up web-up tracklife-up tracklife-down \
        web1-down web2-down web3-down api-down \
        up down restart ps logs clean help \
        portproxy portproxy-install mongo-backup calibrate test-setup

# ── Setup ────────────────────────────────────────────────────────────────────
setup:
	@bash $(ROOT)/setup.sh

# ── Panel Multi-Agente (WSL2 only) ──────────────────────────────────────────
panel:
	@bash $(ROOT)/panel.sh

# ── Estado del sistema (genera docs/Estado del Sistema.md) ──────────────────
status:
	@bash $(ROOT)/update-status.sh

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

tracklife-up:
	@cd projects/web/web3-next    && docker compose up -d --build

tracklife-down:
	@cd projects/web/web3-next    && docker compose down || true

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

# ── Portproxy WSL2 -> Windows -> LAN ─────────────────────────────────────────
# La IP de WSL2 cambia en cada reinicio. Sin actualizar netsh portproxy, la LAN
# pierde acceso a *.test (edge case recurrente, ver Pendientes.md).
portproxy:
	@bash $(ROOT)/infra/scripts/portproxy.sh

# Registra tarea programada (una sola vez, requiere Administrador) para que el
# reenvio se actualice solo al iniciar sesion — sin ejecutar `make portproxy` cada vez.
portproxy-install:
	@powershell.exe -NoProfile -Command \
		"Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File \"$$(wslpath -w $(ROOT)/infra/scripts/install-portproxy-task.ps1)\"' -Wait"

# ── Backup de MongoDB ────────────────────────────────────────────────────────
# mongodump + rotacion. El volumen `mongodb_data` es nombrado (sin backup, sin
# papelera): si se corrompe o se hace `docker volume prune`, se pierde todo.
mongo-backup:
	@bash $(ROOT)/infra/mongodb/backup.sh

# ── Calibracion SDD ──────────────────────────────────────────────────────────
# Ejecuta los checks de .sdd/config.yaml (calibration.checks) y actualiza
# calibration.status. Gate obligatorio antes de entrar en Strict TDD.
# Uso: make calibrate  |  make calibrate PROJECT=api-laravel
calibrate:
	@bash $(ROOT)/.sdd/scripts/calibrate.sh $(PROJECT)

# ── Bootstrap de testing en frontends ────────────────────────────────────────
# Instala el runner de tests recomendado (vitest/nuxi test), crea config y un
# test ejemplo que pasa. Desbloquea Strict TDD en proyectos con test_ready=false.
# Uso: make test-setup PROJECT=web3-next
test-setup:
	@bash $(ROOT)/.sdd/scripts/test-bootstrap.sh $(PROJECT)

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
	@echo "  make panel          Panel multi-agente tmux 2x2 (WSL2)"
	@echo "  make status         Genera/actualiza docs/Estado del Sistema.md"
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
	@echo "  make portproxy            Actualiza netsh portproxy con la IP actual de WSL2"
	@echo "  make portproxy-install    Registra tarea programada (una vez, requiere Admin)"
	@echo "  make mongo-backup         mongodump + rotacion de backups antiguos"
	@echo "  make calibrate [PROJECT=] Ejecuta checks de calibracion SDD (gate antes de TDD)"
	@echo "  make test-setup PROJECT=  Instala runner de tests + config + test ejemplo"
	@echo ""
