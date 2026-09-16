# Inventario de datos — insumo para la política de privacidad

Actualizado: 2026-09-16. Derivado leyendo el código, no de memoria ni de plantillas.

> **Qué es esto y qué no es.** Es el inventario factual de qué datos recoge TrackLife
> hoy, de dónde salen, quién los ve y dónde viven. **No es una política de privacidad
> ni texto legal**, y no sustituye la revisión de alguien competente en protección de
> datos. Es la parte que solo se obtiene leyendo el código, para que quien redacte la
> política no tenga que deducirla.
>
> Si el código cambia, esto caduca. Cada afirmación es verificable en el repo.

---

## 1. Lo primero: hay datos de salud

TrackLife almacena **datos de salud**: peso, porcentaje de grasa corporal, masa
muscular, frecuencia cardíaca en reposo, variabilidad de frecuencia cardíaca (HRV),
puntuación de sueño, índice de recuperación, carga de entrenamiento y saturación de
oxígeno (`app/Models/BiometricReading.php`), más la frecuencia cardíaca media en
actividades (`app/Models/Activity.php`).

En el RGPD esto es **categoría especial** (art. 9): no basta el interés legítimo ni el
contrato, hace falta **consentimiento explícito** y separado, y el estándar de
seguridad y minimización es más alto. No es un detalle menor de redacción: condiciona
cómo se pide el alta y qué se promete.

Lo mismo aplica, en menor medida, al **historial dietético completo** (todo lo que
come el usuario y cuándo), que permite inferir estado de salud, hábitos y hasta
prácticas religiosas.

---

## 2. Qué se recoge, por categoría

### Identidad y cuenta
| Dato | Origen | Dónde |
|---|---|---|
| Nombre, nombre de usuario, email | El usuario, al registrarse | `User` |
| Contraseña | El usuario | `User`, **hasheada** (cast `hashed` de Laravel, bcrypt) |
| Biografía | El usuario, opcional | `User` |
| URL de avatar | El usuario, texto libre | `User` — ver §5 |

### Salud y cuerpo *(categoría especial)*
| Dato | Origen |
|---|---|
| Peso, % grasa, masa muscular | Registro manual |
| FC en reposo, HRV, sueño, recuperación, strain, SpO2, pasos | Registro manual |
| FC media por actividad | Registro manual |
| Objetivo de transformación (peso y % grasa objetivo, fecha límite) | El usuario |

> Nota: hasta el 2026-09-15 existía una integración de wearables que **fabricaba**
> estas lecturas con `rand()` y las guardaba como reales. Se eliminó por completo.
> Hoy el 100% de estos datos los introduce el usuario a mano.

### Alimentación
Cada comida registrada: tipo (desayuno/almuerzo/…), fecha, lista de alimentos con
macros, totales calculados, notas libres y un campo `photo_url`. Más objetivos de
macros y la racha de días registrando (`streak_days`, `last_meal_log_date`).

### Entrenamiento y actividad
Entrenamientos (nombre, fecha, series con peso y repeticiones, volumen, duración,
notas), planes de entrenamiento, y actividades de cardio con duración, distancia,
calorías y **un campo `route`**.

> ⚠️ `route` está pensado para trazas GPS. **Hoy no se rellena** — la UI dice
> "Registro manual — GPS próximamente". Pero el campo existe: si algún día se activa,
> pasa a haber **datos de geolocalización**, que cambian sustancialmente la política.
> Decidir si se menciona ya o se retrasa hasta implementarlo.

### Social
Seguidores/seguidos, publicaciones del feed, "me gusta" (se guarda **quién** dio like:
`kudos_user_ids`), comentarios con su texto, pertenencia a clubs y retos, favoritos.

### Técnicos
No hay analítica ni trackers de terceros instalados — verificado: cero coincidencias de
gtag, GTM, Plausible, PostHog, Mixpanel, Segment o Hotjar. **Si se añade analítica, este
documento y la política dejan de ser correctos.**

---

## 3. Quién ve qué

El usuario controla la visibilidad por categoría (`privacy_settings`). Valores por
defecto, definidos en `User::defaultPrivacySettings()`:

| Categoría | Por defecto | Significa |
|---|---|---|
| Biométricos | **Privado** | Solo tú |
| Fotos de progreso | **Privado** | Solo tú |
| Comidas | Seguidores | Quien te sigue |
| Entrenamientos | Seguidores | Quien te sigue |
| Escaneos de producto | **Público** | Cualquier usuario registrado |

Los datos de salud son privados por defecto, que es lo correcto. El filtrado real lo
aplica `FeedService::isVisibleTo()` en cada lectura del feed.

**El perfil público de otro usuario** expone solo: nombre, nombre de usuario,
biografía, avatar y racha. No expone email ni datos de salud.

**Búsqueda de usuarios**: busca por nombre, usuario **y email**, pero no devuelve el
email en la respuesta. Consecuencia a valorar: permite **confirmar si un email está
registrado** (enumeración). Es común y de bajo impacto, pero conviene saberlo.

---

## 4. Terceros que reciben datos

| Tercero | Qué recibe | Cuándo |
|---|---|---|
| **Open Food Facts** (`world.openfoodfacts.org`) | El código de barras escaneado o el texto buscado | Al escanear un producto o buscar un alimento |

La petición la hace **el servidor**, no el navegador del usuario, así que Open Food
Facts no recibe su IP ni cookies. Sí recibe *qué* se busca, sin identificador de
usuario asociado.

Las imágenes de ejercicios vienen de GitHub, pero pasan por el optimizador de Next del
lado servidor; el navegador del usuario no contacta con GitHub. Los avatares se sirven
por `/api/avatar/[userId]`, misma razón: se añadió precisamente para que una URL de
terceros no recibiera la IP de quien mira un perfil.

A esto habrá que sumar, al desplegar, los **proveedores de infraestructura** (alojamiento
de la API, del front y base de datos) como encargados del tratamiento.

---

## 5. Un punto abierto: los avatares

`avatar_url` es texto libre; no hay subida de imágenes. El usuario pega una URL
cualquiera. Se validó que sea una URL bien formada (PR #38) y se sirve proxeada para no
filtrar la IP de quien la ve (PR de septiembre), pero **el usuario sigue pudiendo
apuntar a cualquier dominio**. Para la política, implica: puede haber contenido alojado
en terceros que TrackLife no controla.

---

## 6. Qué se guarda en el navegador

| Nombre | Tipo | Para qué | Duración |
|---|---|---|---|
| `tracklife_session` | Cookie | Sesión autenticada | 30 días |
| `tracklife_active_workout` | sessionStorage | Entrenamiento en curso sin guardar | Hasta cerrar la pestaña |
| `tracklife_workout_start` | sessionStorage | Hora de inicio del entrenamiento | Hasta cerrar la pestaña |
| `tracklife_favorites` | localStorage | Restos de la versión anterior; se migran al servidor y se borra | Hasta migrar |

La cookie es `httpOnly` (JavaScript no puede leerla), `sameSite=lax` y `secure` en
producción. **Ninguna es de analítica ni publicidad**, todas son estrictamente
necesarias para el funcionamiento — lo que normalmente exime del banner de cookies,
pero confírmalo con quien redacte.

---

## 7. Seguridad realmente implementada

Afirmaciones verificables, no aspiracionales:

- Contraseñas hasheadas (bcrypt vía el cast `hashed` de Laravel). En texto plano, nunca.
- El token de sesión **no es accesible desde JavaScript**: vive en una cookie httpOnly y
  se adjunta del lado servidor. Un XSS no puede robarlo.
- Cifrado en tránsito hacia la base de datos: `MONGODB_URI` es un DSN completo, así que
  una URI de MongoDB Atlas (`mongodb+srv://`) usa TLS por defecto.
- Cifrado en reposo: Atlas lo aplica por defecto en todos los planes.
- Limitación de intentos en registro y login (5 por minuto).
- Cada consulta de datos propios está acotada por `user_id` en el servidor.
- Las respuestas no exponen identificadores internos de otros usuarios (se auditó y
  corrigió: clubs y retos enviaban la lista completa de IDs de sus miembros).

---

## 8. ⚠️ Huecos que hay que resolver ANTES de publicar la política

Esto es lo más importante del documento. Hay derechos del RGPD que **hoy no se pueden
cumplir**, así que la política no puede prometerlos sin mentir:

1. **No existe borrado de cuenta.** No hay endpoint ni pantalla. El derecho de supresión
   (art. 17) no se puede atender salvo entrando a la base a mano. Verificado: no hay
   ninguna ruta de borrado de usuario.
2. **No existe exportación de datos.** El derecho de portabilidad (art. 20) tampoco.
3. **No hay política de conservación.** Nada caduca ni se borra nunca: comidas,
   biométricos y publicaciones se guardan indefinidamente. Hay que decidir cuánto se
   conservan y qué pasa al darse de baja.
4. **No hay registro de consentimiento.** Al registrarse no se pide ni se guarda
   consentimiento explícito para tratar datos de salud (art. 9). No hay casilla ni marca
   de fecha en `User`.
5. **Falta identificar al responsable del tratamiento** — nombre o razón social,
   dirección y correo de contacto. Es el dato tuyo que la política no puede omitir.

Mi recomendación, en orden: **1 y 4 antes de aceptar el primer usuario real.** El
borrado de cuenta es trabajo acotado (endpoint + confirmación en ajustes + borrado en
cascada de sus colecciones) y el consentimiento es una casilla más un campo con fecha.
El 2 y el 3 pueden ir después, documentados como pendientes, pero no deberían tardar.

---

## 9. Si quieres que lo siga yo

Puedo implementar el borrado de cuenta con borrado en cascada y el registro de
consentimiento — son cambios de código acotados y verificables. Lo que no haré es
redactar el texto legal: eso necesita a alguien que responda de ello.

Ver también: [[Deploy TrackLife]], [[Pendientes]], [[TRACKLIFE]]
