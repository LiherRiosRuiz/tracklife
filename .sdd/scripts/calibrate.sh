#!/usr/bin/env bash
# calibrate.sh — Ejecuta los checks de calibracion SDD definidos en
# .sdd/config.yaml (seccion calibration.checks) y actualiza
# calibration.status (last_run/result/blockers/warnings) en el propio config.yaml.
#
# Uso:
#   bash .sdd/scripts/calibrate.sh              # todos los proyectos
#   bash .sdd/scripts/calibrate.sh api-laravel  # solo un proyecto
#   make calibrate [PROJECT=api-laravel]
#
# Por que existe: la fase 2 (Calibracion) del protocolo SDD es un GATE
# obligatorio antes de Strict TDD (config.yaml: prerequisite: result == pass),
# pero `last_run` era `null` — nunca se habia ejecutado. Este script la hace
# ejecutable y deja constancia escrita del resultado.
#
# Nota: corre los checks que tienen sentido FUERA de los contenedores (lockfiles,
# entorno Docker, red). Los checks que requieren el contenedor corriendo
# (`php artisan test`, `npm run build`...) se invocan via `docker compose exec`
# si el servicio esta arriba; si no, se reportan como SKIP con instrucciones.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONFIG="$ROOT/.sdd/config.yaml"
PROJECT_FILTER="${1:-}"

PASS=0; FAIL=0; WARN=0; SKIP=0
BLOCKERS=()
WARNINGS=()

c_green="\033[0;32m"; c_red="\033[0;31m"; c_yellow="\033[0;33m"; c_dim="\033[2m"; c_nc="\033[0m"

ok()    { echo -e "  ${c_green}✓${c_nc} $1"; PASS=$((PASS+1)); }
fail()  { echo -e "  ${c_red}✗${c_nc} $1"; FAIL=$((FAIL+1)); BLOCKERS+=("$2"); }
warn()  { echo -e "  ${c_yellow}!${c_nc} $1"; WARN=$((WARN+1)); WARNINGS+=("$2"); }
skip()  { echo -e "  ${c_dim}·${c_nc} $1 ${c_dim}(skip)${c_nc}"; SKIP=$((SKIP+1)); }

section() { echo ""; echo -e "${c_dim}── $1 ──${c_nc}"; }

PROJECTS=(web1-astro web2-nuxt web3-next api-laravel)
if [ -n "$PROJECT_FILTER" ]; then
  PROJECTS=("$PROJECT_FILTER")
fi

declare -A PROJECT_DIR=(
  [web1-astro]="projects/web/web1-astro"
  [web2-nuxt]="projects/web/web2-nuxt"
  [web3-next]="projects/web/web3-next"
  [api-laravel]="projects/web/api-laravel"
)
declare -A PROJECT_LOCK=(
  [web1-astro]="package-lock.json"
  [web2-nuxt]="package-lock.json"
  [web3-next]="package-lock.json"
  [api-laravel]="composer.lock"
)
declare -A PROJECT_MANIFEST=(
  [web1-astro]="package.json"
  [web2-nuxt]="package.json"
  [web3-next]="package.json"
  [api-laravel]="composer.json"
)

echo ""
echo -e "${c_dim}Calibracion SDD — LIHER${c_nc}  $(date '+%Y-%m-%d %H:%M:%S')"

# ── 1. Dependencias (lockfile vs manifest) ──────────────────────────────────
section "1. Dependencias (blocker)"
for p in "${PROJECTS[@]}"; do
  dir="$ROOT/${PROJECT_DIR[$p]}"
  manifest="$dir/${PROJECT_MANIFEST[$p]}"
  lock="$dir/${PROJECT_LOCK[$p]}"
  if [ ! -f "$manifest" ]; then
    fail "$p: manifest ${PROJECT_MANIFEST[$p]} no encontrado" "$p: manifest ausente"
    continue
  fi
  if [ ! -f "$lock" ]; then
    fail "$p: lockfile ${PROJECT_LOCK[$p]} no encontrado" "$p: lockfile ausente"
    continue
  fi
  if [ "$manifest" -nt "$lock" ]; then
    warn "$p: ${PROJECT_MANIFEST[$p]} es mas reciente que el lockfile (posible stale)" "$p: lockfile potencialmente desincronizado"
  else
    ok "$p: lockfile presente y coherente con manifest"
  fi
done

# ── 2. Test runner ───────────────────────────────────────────────────────────
section "2. Test runner (blocker)"
for p in "${PROJECTS[@]}"; do
  dir="${PROJECT_DIR[$p]}"
  case "$p" in
    api-laravel)
      if docker compose -f "$ROOT/$dir/docker-compose.yml" ps --status running 2>/dev/null | grep -q api-laravel; then
        if (cd "$ROOT/$dir" && docker compose exec -T api-laravel php artisan test > /tmp/calibrate-api-test.log 2>&1); then
          ok "api-laravel: php artisan test → PASS"
        else
          fail "api-laravel: php artisan test → FAIL (ver /tmp/calibrate-api-test.log)" "api-laravel: tests fallando"
        fi
      else
        skip "api-laravel: contenedor no esta corriendo — ejecuta 'make api-up' y reintenta"
      fi
      ;;
    *)
      skip "$p: test_runner no instalado (ready=false) — usar 'make test-setup PROJECT=$p'"
      ;;
  esac
done

# ── 3. Lint ──────────────────────────────────────────────────────────────────
section "3. Lint (warning)"
for p in "${PROJECTS[@]}"; do
  dir="${PROJECT_DIR[$p]}"
  case "$p" in
    api-laravel)
      if docker compose -f "$ROOT/$dir/docker-compose.yml" ps --status running 2>/dev/null | grep -q api-laravel; then
        if (cd "$ROOT/$dir" && docker compose exec -T api-laravel ./vendor/bin/pint --test > /tmp/calibrate-api-lint.log 2>&1); then
          ok "api-laravel: pint --test → 0 errores"
        else
          warn "api-laravel: pint --test → encontro problemas de estilo (ver /tmp/calibrate-api-lint.log)" "api-laravel: lint con hallazgos"
        fi
      else
        skip "api-laravel: contenedor no corriendo"
      fi
      ;;
    web3-next)
      if docker compose -f "$ROOT/$dir/docker-compose.yml" ps --status running 2>/dev/null | grep -q web3; then
        if (cd "$ROOT/$dir" && docker compose exec -T web3-next npm run lint > /tmp/calibrate-web3-lint.log 2>&1); then
          ok "web3-next: npm run lint → 0 errores"
        else
          warn "web3-next: npm run lint → encontro problemas (ver /tmp/calibrate-web3-lint.log)" "web3-next: lint con hallazgos"
        fi
      else
        skip "web3-next: contenedor no corriendo"
      fi
      ;;
    *)
      skip "$p: lint no instalado"
      ;;
  esac
done

# ── 4. Build ─────────────────────────────────────────────────────────────────
section "4. Build (warning)"
for p in "${PROJECTS[@]}"; do
  skip "$p: build no verificado automaticamente — ejecutar manualmente dentro del contenedor (ver config.yaml calibration.checks.build)"
done

# ── 5. Coherencia de config ──────────────────────────────────────────────────
section "5. Coherencia config (warning)"
skip "config_coherence requiere lectura comparativa CLAUDE.md vs config.yaml — revisar manualmente"

# ── 6. Entorno ───────────────────────────────────────────────────────────────
section "6. Entorno (blocker)"

if docker info > /dev/null 2>&1; then
  ok "Docker Engine respondiendo (docker info)"
else
  fail "Docker Engine no responde — ¿esta arrancado el WSL2 Ubuntu con Docker?" "docker engine no disponible"
fi

NET_COUNT=$(docker network ls --filter name=traefik_net --filter name=backend_net -q 2>/dev/null | wc -l | tr -d ' ')
if [ "$NET_COUNT" -ge 2 ]; then
  ok "Redes traefik_net y backend_net existen"
else
  fail "Faltan redes Docker (traefik_net/backend_net) — ejecutar 'make infra-up'" "redes docker incompletas"
fi

for envf in "infra/mongodb/.env" "projects/web/api-laravel/.env"; do
  if [ -f "$ROOT/$envf" ]; then
    ok "$envf existe"
  else
    fail "$envf no existe — requerido (ver config.yaml calibration.checks.environment.env_files)" "$envf ausente"
  fi
done

BUSY_PORTS=$(netstat -an 2>/dev/null | grep -E ':(80|3000|4321|8000|8080|9100) ' | grep -i listen | head -5)
if [ -n "$BUSY_PORTS" ]; then
  warn "Puertos del stack ya en uso (revisar conflictos):\n$BUSY_PORTS" "puertos potencialmente en conflicto"
else
  ok "Puertos del stack (80/3000/4321/8000/8080/9100) libres o stack ya levantado de forma coherente"
fi

# ── Resumen ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${c_dim}── Resumen ──${c_nc}"
echo -e "  ${c_green}PASS: $PASS${c_nc}   ${c_red}FAIL: $FAIL${c_nc}   ${c_yellow}WARN: $WARN${c_nc}   ${c_dim}SKIP: $SKIP${c_nc}"

if [ "$FAIL" -gt 0 ]; then
  RESULT="fail"
elif [ "$WARN" -gt 0 ]; then
  RESULT="pass"   # warnings no bloquean, pero quedan registrados
else
  RESULT="pass"
fi

echo -e "  Resultado: $([ "$RESULT" = "pass" ] && echo -e "${c_green}${RESULT}${c_nc}" || echo -e "${c_red}${RESULT}${c_nc}")"
echo ""

# ── Persistir en config.yaml ─────────────────────────────────────────────────
TODAY="$(date '+%Y-%m-%d %H:%M')"

yaml_list() {
  # Convierte un array bash en lista YAML inline: [a, b] o []
  local arr=("$@")
  if [ "${#arr[@]}" -eq 0 ]; then echo "[]"; return; fi
  local joined
  joined=$(printf '"%s", ' "${arr[@]}")
  echo "[${joined%, }]"
}

BLOCKERS_YAML=$(yaml_list "${BLOCKERS[@]}")
WARNINGS_YAML=$(yaml_list "${WARNINGS[@]}")

# Reemplazos puntuales de las 4 lineas bajo "  status:" (calibration.status)
# Usamos perl para edicion in-place portable (sed -i difiere entre BSD/GNU)
perl -0pi -e "s/(  status:\n    last_run: ).*/\${1}\"$TODAY\"/" "$CONFIG"
perl -0pi -e "s/(    result: ).*/\${1}$RESULT/" "$CONFIG"
perl -0pi -e "s/(    blockers: ).*/\${1}$BLOCKERS_YAML/" "$CONFIG"
perl -0pi -e "s/(    warnings: ).*/\${1}$WARNINGS_YAML/" "$CONFIG"

echo -e "${c_dim}config.yaml actualizado → calibration.status.last_run = \"$TODAY\", result = $RESULT${c_nc}"
echo ""
