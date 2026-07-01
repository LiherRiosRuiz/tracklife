# Publicar TrackLife — Guía paso a paso (para ti)

> Esto es **lo único que tienes que hacer tú manualmente** ahora. Todo lo técnico ya está hecho y en `master` (GitHub `LiherRiosRuiz/tracklife`). Sigue los pasos en orden. Al final tendrás la app pública con HTTPS, lista para el Play Store. **No hace falta comprar dominio.**
>
> Tiempo total: ~15-20 min. Coste: **0 €** (todo en planes gratis).
> Cuando termines, pásame las 3 URLs y yo sigo (validación + empaquetado Android).

Referencia técnica completa: [[Deploy TrackLife]].

---

## Resumen de lo que vas a montar

```
[Navegador] → Vercel (front Next.js, gratis)
                 │
                 ▼
             Railway (API Laravel, gratis)
                 │
                 ▼
             MongoDB Atlas (base de datos, gratis)
```

Necesitas 3 cuentas gratis. Puedes crearlas todas con tu cuenta de **GitHub** (botón "Continue with GitHub").

---

## PASO 1 — Base de datos: MongoDB Atlas (~5 min)

1. Entra en **https://www.mongodb.com/cloud/atlas/register** y crea cuenta (o con Google/GitHub).
2. Crea un cluster: elige **M0 (Free)**. Región: la más cercana (ej. Frankfurt/Ireland). Dale a *Create*.
3. Te pedirá crear un **usuario de base de datos**: pon un nombre (ej. `tracklife`) y una contraseña → **apúntala**.
4. En **Network Access** (menú izquierdo) → *Add IP Address* → **Allow access from anywhere** (`0.0.0.0/0`) → Confirm.
5. Vuelve a **Database** → botón **Connect** → **Drivers** → copia la *connection string*. Se ve así:
   ```
   mongodb+srv://tracklife:<db_password>@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Sustituye `<db_password>` por tu contraseña real y añade `tracklife` como nombre de BD antes del `?`:
   ```
   mongodb+srv://tracklife:TU_PASS@cluster0.xxxx.mongodb.net/tracklife?retryWrites=true&w=majority
   ```
   **Guarda esta cadena** — la necesitas en el Paso 2.

---

## PASO 2 — API (Laravel): Railway (~5 min)

1. Entra en **https://railway.app** → *Login with GitHub*.
2. **New Project** → **Deploy from GitHub repo** → autoriza y elige `LiherRiosRuiz/tracklife`.
3. En *Settings* del servicio → **Root Directory**: escribe `projects/web/api-laravel`.
   *(Railway usará el `Dockerfile` que ya está ahí.)*
4. En la pestaña **Variables**, añade estas (los nombres exactos están en `projects/web/api-laravel/.env.production.example`):
   | Variable | Valor |
   |----------|-------|
   | `APP_ENV` | `production` |
   | `APP_DEBUG` | `false` |
   | `APP_KEY` | *(déjala vacía por ahora; si el arranque falla, dímelo y te doy una)* |
   | `DB_CONNECTION` | `mongodb` |
   | `MONGODB_URI` | *(la cadena de Atlas del Paso 1)* |
   | `MONGO_DATABASE` | `tracklife` |
   | `CORS_ALLOWED_ORIGINS` | *(la rellenas en el Paso 4)* |
5. Deploy. Cuando termine, en *Settings* → **Networking** → *Generate Domain*. Copia la URL pública:
   ```
   https://tracklife-api-production.up.railway.app
   ```
   **Guárdala** — la necesitas en el Paso 3.

> Alternativa a Railway: **Render** (https://render.com, *New → Web Service → Docker*, mismo root dir y variables).

---

## PASO 3 — Front (Next.js): Vercel (~5 min)

1. Entra en **https://vercel.com** → *Continue with GitHub*.
2. **Add New… → Project** → importa `LiherRiosRuiz/tracklife`.
3. En la configuración del proyecto → **Root Directory**: pon `projects/web/web3-next` (Vercel detecta Next.js solo).
4. Despliega el bloque **Environment Variables** y añade (nombres en `projects/web/web3-next/.env.production.example`):
   | Variable | Valor |
   |----------|-------|
   | `API_INTERNAL_URL` | *(la URL de Railway del Paso 2)* |
   | `NEXT_PUBLIC_API_URL` | *(la misma URL de Railway)* |
5. **Deploy**. Al terminar copia la URL pública:
   ```
   https://tracklife.vercel.app
   ```

---

## PASO 4 — Cerrar el círculo (~1 min)

1. Vuelve a **Railway** → tu servicio → **Variables**.
2. Pon en `CORS_ALLOWED_ORIGINS` la URL de Vercel del Paso 3 (ej. `https://tracklife.vercel.app`).
3. Railway redesplega solo. **Listo.**

Abre tu URL de Vercel → deberías poder **registrarte y entrar**. 🎉

---

## PASO 5 — Pásame las URLs

Cuando lo tengas, dime:
- URL del front (Vercel): `https://…vercel.app`
- URL de la API (Railway): `https://…up.railway.app`

**Yo sigo desde ahí, solo:**
- Valido registro / login / persistencia en producción.
- Genero el `assetlinks.json` real y empaqueto la app como **Android (TWA con Bubblewrap)** → un `.aab` firmado.
- Te doy el `.aab` y la guía de 5 pasos para subirlo a **Google Play Console** (eso sí lleva un pago único de 25 USD de Google, tuyo).

---

## Dominio propio (opcional, para más adelante)

No lo necesitas para publicar. Cuando quieras marca propia: `tracklife.fit` (recomendado) o `gettracklife.com` (`tracklife.com`/`.app` están ocupados). Se compra en Cloudflare/Porkbun (~10 €/año) y se añade como *Custom Domain* en Vercel en 2 min. Detalles en [[Deploy TrackLife]].

---

Ver también: [[Deploy TrackLife]], [[Pendientes]], [[TRACKLIFE]], [[Home]].
