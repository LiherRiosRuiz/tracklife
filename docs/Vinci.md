# Vinci

Agente ejecutor del workspace LIHER. Implementa los planes producidos por Platon.

> Leonardo da Vinci — construye lo que otros imaginan.

---

## Que hace

| Funcion | Descripcion |
|---------|-------------|
| Ejecucion | Implementa planes paso a paso, escribe codigo, crea archivos |
| Verificacion | Ejecuta tests despues de cada cambio |
| Reporte | Informa a LIHER de pasos completados y resultado |

---

## Arquitectura

```
LIHER (gobernador)
    |
    +--- Platon (opus-4-6) → produce plan
    |
    +--- Vinci (sonnet-4-6) → ejecuta plan (este agente)
    |
    +--- Quevedo (sonnet-4-6) → documenta resultado
```

Vinci es un **subagente** de LIHER. No tiene launcher standalone.
Se activa automaticamente cuando LIHER recibe una tarea de implementacion.

---

## Modelo

| Aspecto | Valor |
|---------|-------|
| Modelo | claude-sonnet-4-6 |
| Effort | high |
| maxTurns | 40 |
| Tools | Read, Write, Edit, Glob, Grep, Bash |

---

## Reglas de ejecucion

- Sigue el plan exactamente — no agrega features
- Ejecuta tests despues de cada paso
- No hace commits salvo que el plan lo indique
- Si hay ambiguedad, elige la opcion mas simple
- Reporta hechos, no opiniones

---

## Archivos

| Archivo | Ubicacion |
|---------|-----------|
| Prompt | `.sdd/vinci-prompt.md` |
| Definicion | `.sdd/cli/liher.mjs` |
| Docs proyecto | `projects/agentes/vinci/` |

---

Ver tambien: [[Liher Agente]], [[Platon SDD]], [[Quevedo]], [[Lecciones - Panel Multiagente]], [[Home]]
