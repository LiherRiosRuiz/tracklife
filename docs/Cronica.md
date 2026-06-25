# Cronica

Registro cronologico de sesiones del workspace LIHER. Cada entrada resume lo que ocurrio, lo que se decidio y lo que queda pendiente. Sin dialogo literal — solo lo sustancial.

Las cronicas tecnicas detalladas se guardan en `.sdd/chronicle/daily/`. Esta nota recoge los resumenes de alto nivel visibles desde Obsidian.

---

## 2026-06-25 — Sprint P3.1 Completado (Tests de API con TDD)

**Sesion**: P3.1 — cobertura de tests en WorkoutController, BiometricController, ActivityController usando strict TDD. Sprint completado.

**Resultado**: **74 tests / 274 assertions** (vs. baseline 44/170).
- Creados: `WorkoutTest.php` (8), `BiometricTest.php` (9), `ActivityTest.php` (8)
- Ampliado: `AuthTest.php` (+5 → 14 total)
- Sprint TEST-ONLY: cero cambios de produccion — no habia bugs latentes

**Incidencia anotada**: contenedor `web1-astro` (Landing) en crash-loop (scope diferido a sesion dedicada).

**Proximos**: P3.2 (Server Components Dashboard) → P3.3 (búsqueda real usuarios).

Ver detalle en `.sdd/chronicle/daily/2026-06-25.md`.

---

## 2026-06-13 — Tres bugs encadenados en TRACKLIFE

### Bug 1 — Loading infinito en `/app` (web3-next)

Ya documentado en la sesion anterior. Resumen: `request()` sin timeout +
`.catch(console.error)` en 16 paginas causaba spinners eternos cuando la API
no respondia. Fix: AbortController 10s en `lib/api.ts` + hook `useApiData<T>` +
`components/Skeleton.tsx` + `components/ErrorState.tsx`.

### Bug 2 — Internal Server Error en todas las rutas

**Causa**: `npm run build` ejecutado desde Windows genero `.next/` con binarios
SWC compilados para x64-Windows. El contenedor Docker (Linux) no podia usar esos
artefactos — `next dev` crasheaba al arrancar.

**Fix**: borrar `.next/` y reiniciar el contenedor desde WSL2.

**Regla establecida**: nunca ejecutar `npm run build` desde Windows en proyectos
que viven en Docker Linux. Para verificar TypeScript sin generar artefactos:
`npx tsc --noEmit`.

### Bug 3 — Autenticacion siempre "Unauthenticated"

**Causa**: Sanctum 4.x valida el ID del Bearer token con `ctype_digit()` —
espera entero SQL. MongoDB usa ObjectId hexadecimales (24 chars). El modelo
`PersonalAccessToken` heredaba `$keyType = 'int'`; el Guard descartaba el token
antes de buscar en la coleccion.

**Fix** — una linea en `app/Models/PersonalAccessToken.php`:

```php
protected $keyType = 'string';
```

**Verificado**: `GET /api/auth/me` y `GET /api/dashboard` devuelven 200 con
datos reales. Login end-to-end funcional. Usuario de prueba: `liher@tracklife.test`.

### Workflow establecido

A partir de esta sesion: **cualquier mejora o cambio pasa por Quevedo antes de
implementarse**. Quevedo narra la peticion al inicio y el resultado al final.
Regla registrada en [[Quevedo]].

---

## 2026-06-12 — (sin sesion registrada)

---

## 2026-06-10 — Modulo Hevy completo para TRACKLIFE

Fases 0 a 5 ejecutadas en una sesion:

- **Fase 0**: `phpunit.xml` configurado para MongoDB (`tracklife_testing`)
- **Fase 1**: `Exercise` ampliado + 60 ejercicios sembrados desde dataset libre
  (`yuhonas/free-exercise-db`). `ExerciseController` con filtros y busqueda regex.
  4 tests — RED/GREEN.
- **Fase 2**: `WorkoutPlan` CRUD + `WorkoutController::fromPlan` (pre-poblado sin
  persistir). 7 tests — RED/GREEN. Total backend: 13 tests, 41 assertions.
- **Fase 3**: biblioteca de ejercicios con imagenes, filtros pills, busqueda en
  tiempo real, pagina de detalle con toggle imagen.
- **Fase 4**: `ExercisePickerModal`, lista de planes, creador de plan con tabla
  de sets (tipo/peso/reps/descanso), detalle con "Iniciar Workout".
- **Fase 5**: `RestTimer` (circulo SVG animado), pantalla de workout activo con
  timer, progreso y sets completables. `npm run build` 42 rutas sin errores.

14 archivos creados, 10 modificados. Ver [[TRACKLIFE]] para detalle completo.

---

## 2026-06-09 — Bugs en splash de Quevedo y calibracion de Platon

- **Bug A** (Quevedo): parser de wikilinks capturaba `Nota\` (con barra invertida)
  en `[[Nota\|Alias]]` de tablas Obsidian → 6 falsos positivos de enlaces rotos.
- **Bug B** (Quevedo): archivos `.canvas` ignorados → `[[Mapa de Agentes]]` contaba
  como roto. Fix: inicializar nodos desde `.canvas` tambien.
- **Calibracion Platon**: `make calibrate` ejecutado por primera vez. Resultado:
  `pass` (2 warnings conocidos: composer.lock api-laravel, ESLint web3-next).
  `config.yaml` actualizado.

---

## 2026-06-08 — 7 recomendaciones de Skills Pendientes completadas

Platon analizo capacidades faltantes del ecosistema. LIHER implemento las 7 en el dia:

1. `mongodb-laravel.md` — skill stack MongoDB + laravel-mongodb
2. `calibrate.sh` + `make calibrate` — calibration runner
3. `test-bootstrap.sh` + `make test-setup` — test setup para frontends
4. `devops-docker.md` — skill DevOps Docker/Traefik/WSL2
5. `portproxy.sh` + `backup.sh` + targets make — portproxy y backup MongoDB
6. `/decide` en `platon.mjs` — captura decisiones como entidades
7. `security.md` — skill de seguridad (Sanctum, CORS, CSP, Zod)

Skills de stack: 7 → 10. Ver [[Skills Pendientes]].

---

Ver tambien: [[TRACKLIFE]], [[API Laravel]], [[Web3 Next]], [[Quevedo]], [[Pendientes]]
