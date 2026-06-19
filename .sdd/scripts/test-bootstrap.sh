#!/usr/bin/env bash
# test-bootstrap.sh — Instala el runner de tests recomendado para un proyecto
# frontend, crea su config y un test ejemplo que PASA, y verifica que corre.
#
# Uso:
#   bash .sdd/scripts/test-bootstrap.sh web1-astro
#   bash .sdd/scripts/test-bootstrap.sh web2-nuxt
#   bash .sdd/scripts/test-bootstrap.sh web3-next
#   make test-setup PROJECT=web3-next
#
# Por que existe: 3 de 4 proyectos tienen test_ready=false en config.yaml —
# Strict TDD (fase 3 del protocolo SDD) es imposible sin runner instalado.
# Los comandos de instalacion ya estaban documentados en config.yaml/registries;
# este script los ejecuta y deja el primer ciclo RED→GREEN listo para usar.
#
# Requiere el contenedor del proyecto corriendo (`make {project}-up`) — los
# node_modules viven en volumenes nombrados, no en el host.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROJECT="${1:-}"

c_green="\033[0;32m"; c_red="\033[0;31m"; c_yellow="\033[0;33m"; c_dim="\033[2m"; c_nc="\033[0m"
ok()   { echo -e "  ${c_green}✓${c_nc} $1"; }
err()  { echo -e "  ${c_red}✗${c_nc} $1"; }
info() { echo -e "  ${c_dim}→${c_nc} $1"; }

usage() {
  echo ""
  echo "Uso: bash .sdd/scripts/test-bootstrap.sh <proyecto>"
  echo "Proyectos soportados: web1-astro | web2-nuxt | web3-next"
  echo "(api-laravel ya tiene PHPUnit instalado — test_ready=true)"
  echo ""
  exit 1
}

[ -z "$PROJECT" ] && usage

case "$PROJECT" in
  web1-astro) DIR="projects/web/web1-astro"; SERVICE="web1-astro" ;;
  web2-nuxt)  DIR="projects/web/web2-nuxt";  SERVICE="web2-nuxt" ;;
  web3-next)  DIR="projects/web/web3-next";  SERVICE="web3-next" ;;
  api-laravel)
    echo ""
    echo "  api-laravel ya tiene PHPUnit instalado y test_ready=true."
    echo "  Ejecuta directamente: cd $ROOT/projects/web/api-laravel && php artisan test"
    echo ""
    exit 0
    ;;
  *) usage ;;
esac

PDIR="$ROOT/$DIR"
[ -d "$PDIR" ] || { err "No existe $PDIR"; exit 1; }

echo ""
echo -e "${c_dim}Test bootstrap — $PROJECT${c_nc}"
echo ""

# ── 1. Verificar contenedor corriendo ────────────────────────────────────────
if ! docker compose -f "$PDIR/docker-compose.yml" ps --status running 2>/dev/null | grep -q "$SERVICE"; then
  err "El contenedor '$SERVICE' no esta corriendo."
  info "Arranca con: make ${PROJECT#web}-up   (o 'make api-up' para api-laravel)"
  info "Los node_modules viven en un volumen Docker nombrado — necesitamos el contenedor activo."
  exit 1
fi
ok "Contenedor '$SERVICE' corriendo"

run_in() { (cd "$PDIR" && docker compose exec -T "$SERVICE" bash -lc "$1"); }

# ── 2. Instalar runner + crear config + test ejemplo, por proyecto ──────────
case "$PROJECT" in

  web1-astro)
    info "Instalando vitest + @testing-library/dom (npm install -D)..."
    if run_in "npm install -D vitest @testing-library/dom"; then ok "Dependencias instaladas"; else err "Fallo npm install"; exit 1; fi

    if [ ! -f "$PDIR/vitest.config.ts" ]; then
      cat > "$PDIR/vitest.config.ts" <<'EOF'
import { getViteConfig } from "astro/config";

export default getViteConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
EOF
      ok "Creado vitest.config.ts (integrado con la config de Vite de Astro)"
    else
      info "vitest.config.ts ya existe — no se sobreescribe"
    fi

    mkdir -p "$PDIR/src/__tests__"
    if [ ! -f "$PDIR/src/__tests__/sanity.test.ts" ]; then
      cat > "$PDIR/src/__tests__/sanity.test.ts" <<'EOF'
import { describe, it, expect } from "vitest";

// Test de arranque — confirma que el runner esta cableado correctamente.
// Sustituir por tests reales en el primer ciclo RED de Strict TDD.
describe("test runner bootstrap", () => {
  it("ejecuta y compara valores basicos", () => {
    expect(1 + 1).toBe(2);
  });
});
EOF
      ok "Creado src/__tests__/sanity.test.ts (test ejemplo que pasa)"
    fi

    RUN_CMD="npx vitest run"
    ;;

  web2-nuxt)
    info "Instalando @nuxt/test-utils + vitest (npm install -D)..."
    if run_in "npm install -D @nuxt/test-utils vitest"; then ok "Dependencias instaladas"; else err "Fallo npm install"; exit 1; fi

    if [ ! -f "$PDIR/vitest.config.ts" ]; then
      cat > "$PDIR/vitest.config.ts" <<'EOF'
import { defineVitestConfig } from "@nuxt/test-utils/config";

export default defineVitestConfig({
  test: {
    environment: "nuxt",
    include: ["**/*.test.ts"],
  },
});
EOF
      ok "Creado vitest.config.ts (entorno @nuxt/test-utils)"
    else
      info "vitest.config.ts ya existe — no se sobreescribe"
    fi

    mkdir -p "$PDIR/tests"
    if [ ! -f "$PDIR/tests/sanity.test.ts" ]; then
      cat > "$PDIR/tests/sanity.test.ts" <<'EOF'
import { describe, it, expect } from "vitest";

// Test de arranque — confirma que el runner esta cableado correctamente.
// Sustituir por tests reales (mountSuspended, etc.) en el primer ciclo RED.
describe("test runner bootstrap", () => {
  it("ejecuta y compara valores basicos", () => {
    expect(1 + 1).toBe(2);
  });
});
EOF
      ok "Creado tests/sanity.test.ts (test ejemplo que pasa)"
    fi

    RUN_CMD="npx vitest run"
    ;;

  web3-next)
    info "Instalando vitest + @vitejs/plugin-react + testing-library (npm install -D)..."
    if run_in "npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/dom"; then
      ok "Dependencias instaladas"
    else
      err "Fallo npm install"; exit 1
    fi

    if [ ! -f "$PDIR/vitest.config.ts" ]; then
      cat > "$PDIR/vitest.config.ts" <<'EOF'
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next"],
  },
});
EOF
      ok "Creado vitest.config.ts (con plugin React + entorno jsdom)"
    else
      info "vitest.config.ts ya existe — no se sobreescribe"
    fi

    mkdir -p "$PDIR/__tests__"
    if [ ! -f "$PDIR/__tests__/sanity.test.tsx" ]; then
      cat > "$PDIR/__tests__/sanity.test.tsx" <<'EOF'
import { describe, it, expect } from "vitest";

// Test de arranque — confirma que el runner esta cableado correctamente.
// Sustituir por tests reales (render de componentes, etc.) en el primer ciclo RED.
describe("test runner bootstrap", () => {
  it("ejecuta y compara valores basicos", () => {
    expect(1 + 1).toBe(2);
  });
});
EOF
      ok "Creado __tests__/sanity.test.tsx (test ejemplo que pasa)"
    fi

    # jsdom es requerido por el entorno pero no siempre viene como dep directa
    run_in "npm install -D jsdom" > /dev/null 2>&1 || true

    RUN_CMD="npx vitest run"
    ;;
esac

# ── 3. Verificar que corre y pasa ─────────────────────────────────────────────
echo ""
info "Ejecutando '$RUN_CMD' dentro del contenedor para confirmar el cableado..."
if run_in "$RUN_CMD"; then
  echo ""
  ok "RUNNER OPERATIVO — el test ejemplo pasa. test_ready puede marcarse 'true' en config.yaml/skills.yaml."
  echo ""
  info "Siguiente paso (Strict TDD): escribir un test real que FALLE (RED) antes de implementar."
else
  echo ""
  err "El runner se instalo pero la ejecucion fallo — revisar el log de arriba antes de marcar test_ready=true."
  exit 1
fi
