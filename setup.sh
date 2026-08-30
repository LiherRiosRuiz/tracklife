#!/bin/bash
# =============================================================================
# setup.sh — Primera vez. Ejecutar desde WSL2 Ubuntu:
#   cd /mnt/d/Compartida/LIHER && bash setup.sh
# =============================================================================
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${GREEN}=== Servidor Stack — Setup inicial ===${NC}"
echo ""

# 1. Redes Docker
echo -e "${YELLOW}[1/3] Creando redes Docker...${NC}"
docker network create traefik_net  2>/dev/null && echo "  traefik_net  creada" || echo "  traefik_net  ya existe"
docker network create backend_net  2>/dev/null && echo "  backend_net  creada" || echo "  backend_net  ya existe"
docker network create admin_net    2>/dev/null && echo "  admin_net    creada" || echo "  admin_net    ya existe"

# 2. Copiar .env de MongoDB si no existe
if [ ! -f "$ROOT/infra/mongodb/.env" ]; then
    cp "$ROOT/infra/mongodb/.env.example" "$ROOT/infra/mongodb/.env"
    echo ""
    echo -e "${YELLOW}  IMPORTANTE: Edita infra/mongodb/.env y cambia la contraseña${NC}"
fi

# 3. Preparar secretos/estado de Traefik (bind mounts que Docker crearía como
#    directorios si no existen, rompiendo el arranque de Traefik)
echo ""
echo -e "${YELLOW}[2/4] Preparando secretos de Traefik...${NC}"
TRAEFIK_DIR="$ROOT/infra/traefik"
if [ ! -f "$TRAEFIK_DIR/acme.json" ]; then
    touch "$TRAEFIK_DIR/acme.json"
    chmod 600 "$TRAEFIK_DIR/acme.json"
    echo "  acme.json creado (vacío, inactivo hasta que se active HTTPS)"
fi
mkdir -p "$TRAEFIK_DIR/secrets"
if [ ! -f "$TRAEFIK_DIR/secrets/dashboard_users" ]; then
    DASHBOARD_PASSWORD="$(openssl rand -base64 18 | tr -d '/+=' | head -c 24)"
    docker run --rm httpd:alpine htpasswd -nbB admin "$DASHBOARD_PASSWORD" > "$TRAEFIK_DIR/secrets/dashboard_users"
    chmod 600 "$TRAEFIK_DIR/secrets/dashboard_users"
    echo -e "  ${YELLOW}Credencial del dashboard generada — usuario: admin / contraseña: $DASHBOARD_PASSWORD${NC}"
    echo -e "  ${YELLOW}Guardala ahora, no se vuelve a mostrar. Podés rotarla regenerando este archivo.${NC}"
fi

# 4. Levantar infraestructura
echo ""
echo -e "${YELLOW}[3/4] Levantando infraestructura...${NC}"
cd "$ROOT/infra/traefik"  && docker compose up -d && echo "  Traefik    OK"
cd "$ROOT/infra/mongodb"  && docker compose up -d && echo "  MongoDB    OK"
cd "$ROOT/infra/portainer" && docker compose up -d && echo "  Portainer  OK"

echo ""
echo -e "${YELLOW}[4/4] Listo${NC}"
echo ""
echo -e "${GREEN}=== Infraestructura activa ===${NC}"
echo ""
echo "  Dashboard Traefik :  http://traefik.test (solo desde la LAN, con usuario/contraseña)"
echo "  Portainer (Linux) :  http://portainer.test (solo desde la LAN)"
echo ""
echo "  Para levantar los proyectos web (primera vez es lenta, scaffoldea):"
echo "    cd $ROOT && make web-up"
echo ""
echo "  Añade al hosts de cada máquina de la red:"
echo "    192.168.20.123  www.tracklife.test app.tracklife.test api.tracklife.test traefik.test portainer.test"
echo ""
