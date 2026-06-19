<div align="center">

# 📱 TrackLife — App

**Aplicación web SSR · Next.js 16 · React 19 · TypeScript · Tailwind CSS**

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

`app.tracklife.test`

</div>

---

Aplicación principal de TrackLife. Dashboard completo con módulos de entrenamiento, nutrición, biométricos, coach IA y comunidad.

## Módulos

| Ruta | Módulo | Descripción |
|------|--------|-------------|
| `/entrenamiento` | 🏋️ Gym + Cardio | Planes, ejercicios, sesión activa, progreso |
| `/nutricion` | 🥗 Nutrición | Diario, macros, escáner, recetas |
| `/biometricos` | 📊 Biométricos | FC, HRV, sueño, composición corporal, wearables |
| `/coach` | 🤖 Coach IA | Insights y plan personalizado |
| `/comunidad` | 👥 Comunidad | Feed, clubs, retos |

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # build de producción
npm run lint       # eslint
```

## Docker

```bash
docker compose up --build
# disponible en app.tracklife.test (vía Traefik)
```

## Variables de entorno

```env
NEXT_PUBLIC_API_URL=http://api.tracklife.test
```

---

Parte de [TrackLife](../) · Stack: Next.js 16 · React 19 · TypeScript · Tailwind 4
