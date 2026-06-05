#!/bin/bash
set -e

# Auto-scaffold si el proyecto no existe
if [ ! -f "package.json" ]; then
    echo "==> Scaffolding Next.js (via /tmp para evitar conflictos)..."
    rm -rf /tmp/next-scaffold
    cd /tmp
    npx create-next-app@latest next-scaffold \
        --typescript \
        --tailwind \
        --eslint \
        --app \
        --no-src-dir \
        --import-alias "@/*" \
        --yes
    cp -r /tmp/next-scaffold/. /app/
    cd /app
    echo "==> Next.js scaffold completado"
fi

# Instalar dependencias si node_modules esta vacio (volumen anonimo Docker lo crea vacio)
if [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
    echo "==> Instalando dependencias..."
    npm install
fi

echo "==> Iniciando Next.js dev server en 0.0.0.0:3000"
exec npx next dev -H 0.0.0.0 -p 3000
