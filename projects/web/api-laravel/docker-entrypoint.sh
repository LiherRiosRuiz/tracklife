#!/bin/bash
set -e

# Auto-scaffold si Laravel no está instalado
if [ ! -f "artisan" ]; then
    echo "==> Scaffolding Laravel 11 (via /tmp para evitar conflictos)..."
    rm -rf /tmp/laravel-scaffold
    cd /tmp
    composer create-project laravel/laravel laravel-scaffold --no-interaction
    cp -r /tmp/laravel-scaffold/. /app/
    cd /app
    echo "==> Instalando paquete MongoDB para Laravel..."
    composer require mongodb/laravel-mongodb --no-interaction
    echo "==> Laravel scaffold completado"
fi

# Instalar dependencias si vendor esta vacio (volumen anonimo Docker lo crea vacio)
if [ ! -d "vendor" ] || [ -z "$(ls -A vendor 2>/dev/null)" ]; then
    echo "==> Instalando dependencias Composer..."
    composer install --no-interaction
fi

echo "==> Generando APP_KEY si no existe..."
php artisan key:generate --no-interaction 2>/dev/null || true

echo "==> Sembrando datos TRACKLIFE..."
php artisan db:seed --no-interaction 2>/dev/null || true

echo "==> Iniciando Laravel dev server en 0.0.0.0:8000"
exec php artisan serve --host=0.0.0.0 --port=8000
