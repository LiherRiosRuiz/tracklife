#!/bin/bash
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "=== git status (projects/) ==="
git -C "$ROOT" status --short -- projects/ 2>/dev/null || echo "(sin cambios)"
echo ""
echo "=== git diff --stat (projects/) ==="
git -C "$ROOT" diff --stat -- projects/ 2>/dev/null || echo "(sin diff)"
