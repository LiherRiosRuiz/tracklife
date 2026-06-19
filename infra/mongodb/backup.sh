#!/usr/bin/env bash
# backup.sh — Backup del volumen mongodb_data via mongodump + rotacion
#
# Uso manual:    bash infra/mongodb/backup.sh
# Via Makefile:  make mongo-backup
# Programable:   cron en WSL2, ej. "0 3 * * * cd /mnt/d/Compartida/LIHER && make mongo-backup"
#
# Por que existe: el volumen `mongodb_data` es un volumen nombrado (filesystem
# nativo WSL2). Si se corrompe, se borra por accidente o se hace
# `docker volume prune`, los datos se pierden sin posibilidad de recuperacion
# (regla del workspace: "Sin papelera. Confirmar antes de borrar"). Este script
# cierra ese punto de fallo, documentado en Pendientes.md.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKUP_DIR="$ROOT/infra/mongodb/backups"
RETENTION_DAYS="${MONGO_BACKUP_RETENTION_DAYS:-7}"
CONTAINER="mongodb"
TIMESTAMP="$(date +%Y-%m-%d_%H%M%S)"
DUMP_NAME="dump_${TIMESTAMP}"

# Cargar credenciales desde infra/mongodb/.env (requerido — sin el, MongoDB no arranca)
ENV_FILE="$ROOT/infra/mongodb/.env"
if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  set -a; source "$ENV_FILE"; set +a
fi
MONGO_USER="${MONGO_USER:-admin}"
MONGO_PASSWORD="${MONGO_PASSWORD:-changeme_in_production}"

mkdir -p "$BACKUP_DIR"

echo "→ Verificando que el contenedor '$CONTAINER' esta corriendo..."
if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "✗ ERROR: el contenedor '$CONTAINER' no esta corriendo. Arranca la infra con 'make infra-up'."
  exit 1
fi

echo "→ Ejecutando mongodump dentro del contenedor (dump: $DUMP_NAME)..."
docker exec "$CONTAINER" mongodump \
  --username "$MONGO_USER" \
  --password "$MONGO_PASSWORD" \
  --authenticationDatabase admin \
  --archive="/tmp/${DUMP_NAME}.archive" \
  --gzip

echo "→ Copiando dump fuera del contenedor..."
docker cp "$CONTAINER:/tmp/${DUMP_NAME}.archive" "$BACKUP_DIR/${DUMP_NAME}.archive.gz"
docker exec "$CONTAINER" rm -f "/tmp/${DUMP_NAME}.archive"

echo "✓ Backup guardado: $BACKUP_DIR/${DUMP_NAME}.archive.gz"

echo "→ Rotando backups (conservando $RETENTION_DAYS dias)..."
find "$BACKUP_DIR" -maxdepth 1 -name 'dump_*.archive.gz' -type f -mtime "+${RETENTION_DAYS}" -print -delete | sed 's/^/  eliminado: /'

echo ""
echo "Backups actuales:"
ls -lh "$BACKUP_DIR"/dump_*.archive.gz 2>/dev/null || echo "  (ninguno todavia, este es el primero)"
echo ""
echo "Restaurar con:"
echo "  docker cp $BACKUP_DIR/${DUMP_NAME}.archive.gz $CONTAINER:/tmp/restore.archive.gz"
echo "  docker exec $CONTAINER bash -c 'gunzip -c /tmp/restore.archive.gz > /tmp/restore.archive'"
echo "  docker exec $CONTAINER mongorestore --username \$MONGO_USER --password \$MONGO_PASSWORD --authenticationDatabase admin --archive=/tmp/restore.archive --drop"
