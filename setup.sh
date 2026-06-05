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

# 2. Copiar .env de MongoDB si no existe
if [ ! -f "$ROOT/infra/mongodb/.env" ]; then
    cp "$ROOT/infra/mongodb/.env.example" "$ROOT/infra/mongodb/.env"
    echo ""
    echo -e "${YELLOW}  IMPORTANTE: Edita infra/mongodb/.env y cambia la contraseña${NC}"
fi

# 3. Levantar infraestructura
echo ""
echo -e "${YELLOW}[2/3] Levantando infraestructura...${NC}"
cd "$ROOT/infra/traefik"  && docker compose up -d && echo "  Traefik    OK"
cd "$ROOT/infra/mongodb"  && docker compose up -d && echo "  MongoDB    OK"
cd "$ROOT/infra/portainer" && docker compose up -d && echo "  Portainer  OK"

echo ""
echo -e "${YELLOW}[3/3] Listo${NC}"
echo ""
echo -e "${GREEN}=== Infraestructura activa ===${NC}"
echo ""
echo "  Dashboard Traefik :  http://192.168.20.123:8080"
echo "  Portainer (Linux) :  http://192.168.20.123:9100"
echo ""
echo "  Para levantar los proyectos web (primera vez es lenta, scaffoldea):"
echo "    cd $ROOT && make web-up"
echo ""
echo "  Añade al hosts de cada máquina de la red:"
echo "    192.168.20.123  web1.test web2.test web3.test api.test traefik.test portainer.test"
echo ""
