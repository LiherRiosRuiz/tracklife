#!/bin/bash
set -e

# Auto-scaffold si el proyecto no existe
if [ ! -f "package.json" ]; then
    echo "==> Scaffolding Astro (via /tmp)..."
    rm -rf /tmp/astro-scaffold
    cd /tmp
    npm create astro@latest astro-scaffold -- --template minimal --install --no-git --yes
    cp -r /tmp/astro-scaffold/. /app/
    cd /app
    npx astro add react vue --yes
    echo "==> Astro scaffold completado"
fi

# Instalar dependencias si node_modules esta vacio (volumen anonimo Docker lo crea vacio)
if [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
    echo "==> Instalando dependencias..."
    npm install
fi

echo "==> Iniciando Astro dev server en 0.0.0.0:4321"
exec ./node_modules/.bin/astro dev --host 0.0.0.0 --port 4321
