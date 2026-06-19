#!/usr/bin/env bash
# portproxy.sh — Wrapper WSL2 -> Windows para wsl-portforward.ps1
#
# Uso manual:    bash infra/scripts/portproxy.sh
# Via Makefile:  make portproxy
#
# Por que existe: la IP de WSL2 cambia en cada reinicio de la maquina/distro.
# Sin actualizar las reglas de `netsh portproxy`, la LAN (192.168.20.123) deja
# de poder llegar a *.test aunque todo funcione bien DESDE el host Windows.
# Edge case recurrente, documentado en Pendientes.md.
#
# Requiere permisos de Administrador en Windows — powershell.exe lanzara un
# prompt UAC si no se ejecuta ya elevado. Para evitar el prompt en cada arranque,
# usar `make portproxy-install` (registra una tarea programada elevada).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Traducir la ruta WSL (/mnt/d/...) a ruta Windows (D:\...) para powershell.exe
WIN_SCRIPT="$(wslpath -w "$ROOT/infra/scripts/wsl-portforward.ps1")"

echo "→ Ejecutando wsl-portforward.ps1 (requiere Administrador — puede pedir confirmacion UAC)..."
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command \
  "Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File \"$WIN_SCRIPT\"' -Wait"

echo ""
echo "✓ Reglas de portproxy actualizadas para la IP actual de WSL2."
echo "  Si la LAN sigue sin acceder a *.test, revisa: make ps, docker network ls, infra/mongodb/.env"
