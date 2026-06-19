# CLAUDE.md — Proyecto Platón (ΠΛΑΤΏΝ)

Agente SDD personalizado del workspace LIHER.
Ruta: `D:\Compartida\LIHER\projects\agentes\platon\`

> Esta carpeta es el punto de entrada humano al proyecto Platón.
> La implementación real vive en `D:\Compartida\LIHER\.sdd/`.

---

## Modo de trabajo

**Este proyecto es infraestructura del workspace, no una aplicación.**

- No hay Docker, no hay `make up`, no hay servidor de dev.
- El "runtime" de Platón es Node.js directamente via `bash platon.sh`.
- Cambios en `.sdd/` tienen efecto inmediato en la próxima sesión.

## Archivos críticos

| Archivo | Rol |
|---------|-----|
| `LIHER/.sdd/cli/platon.mjs` | CLI principal — punto de entrada del agente |
| `LIHER/.sdd/platon-prompt.md` | System prompt del agente |
| `LIHER/.sdd/config.yaml` | Configuración del workspace (stack, fases, calibración) |
| `LIHER/.sdd/skills.yaml` | Índice de skills y registries |
| `LIHER/.sdd/skills/*.md` | Patrones por tecnología (7 archivos) |
| `LIHER/.sdd/registries/*.yaml` | Skills por proyecto |
| `LIHER/.sdd/memory/` | Memoria persistente (sesiones + entidades) |
| `LIHER/.sdd/guard/guard.sh` | Guardian Angel pre-commit hook |
| `LIHER/platon.sh` | Launcher (instala deps + lanza CLI) |

## Cómo probar cambios

```bash
# Verificar sintaxis del CLI
node --check /mnt/d/Compartida/LIHER/.sdd/cli/platon.mjs

# Lanzar para probar interactivamente
cd /mnt/d/Compartida/LIHER
bash platon.sh
```

## Añadir una nueva skill

1. Crear `.sdd/skills/<tecnologia>.md` con frontmatter:
   ```markdown
   ---
   skill: <nombre>
   version: <versión>
   ---
   ```
2. Añadir al mapa `skills:` en `.sdd/skills.yaml`
3. Referenciar desde el registry del proyecto en `skills_ref:`

## Añadir un nuevo proyecto al workspace

1. Crear `.sdd/registries/<proyecto>.yaml` siguiendo el patrón de los existentes
2. Añadir entrada en `projects:` de `.sdd/config.yaml`
3. Referenciar las skills relevantes en `skills_ref:`

## Instalar Guardian Angel

```bash
bash /mnt/d/Compartida/LIHER/.sdd/guard/install.sh
```

Se instala en `.git/hooks/pre-commit` del repositorio activo.
Revisar reglas en `.sdd/guard/AGENTS.md` antes de instalar.

## Dependencias

```bash
# Node.js >= 22 requerido
node --version

# SDK instalado en .sdd/cli/node_modules/ (auto por platon.sh)
# No instalar globalmente
```

## Estructura de memoria

```
.sdd/memory/
├── MEMORY.md              <- índice de sesiones y entidades
├── sessions/              <- sesiones guardadas con /end
│   └── YYYY-MM-DD_HH-MM.md
└── entities/              <- entidades guardadas con /mem save
    └── <titulo>.md
```

---

Ver también:
- `README.md` — documentación de usuario de Platón
- `LIHER/docs/Platon SDD.md` — documentación extensa del framework
- `LIHER/.sdd/` — implementación completa
