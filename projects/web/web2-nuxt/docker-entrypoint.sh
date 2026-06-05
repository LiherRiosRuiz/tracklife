#!/bin/bash
set -e

# Auto-scaffold si el proyecto no existe
if [ ! -f "package.json" ]; then
    echo "==> Scaffolding Nuxt 3 (via /tmp para evitar conflictos)..."
    rm -rf /tmp/nuxt-scaffold
    cd /tmp
    # -t minimal evita el selector interactivo de template
    npx nuxi@latest init nuxt-scaffold -t minimal --no-install --no-gitInit
    cp -r /tmp/nuxt-scaffold/. /app/
    cd /app
    npm install
    echo "==> Nuxt scaffold completado"
fi

# Instalar dependencias si node_modules esta vacio (volumen anonimo Docker lo crea vacio)
if [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
    echo "==> Instalando dependencias..."
    npm install
fi

echo "==> Iniciando Nuxt dev server en 0.0.0.0:3000"
exec npx nuxt dev --host 0.0.0.0 --port 3000
