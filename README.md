<div align="center">

<br/>

```
████████╗██████╗  █████╗  ██████╗██╗  ██╗██╗     ██╗███████╗███████╗
╚══██╔══╝██╔══██╗██╔══██╗██╔════╝██║ ██╔╝██║     ██║██╔════╝██╔════╝
   ██║   ██████╔╝███████║██║     █████╔╝ ██║     ██║█████╗  █████╗
   ██║   ██╔══██╗██╔══██║██║     ██╔═██╗ ██║     ██║██╔══╝  ██╔══╝
   ██║   ██║  ██║██║  ██║╚██████╗██║  ██╗███████╗██║██║     ███████╗
   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝╚═╝     ╚══════╝
```

**Plataforma integral de seguimiento fitness**

*Entrena · Nutre · Mide · Conecta · Supérate*

<br/>

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Astro](https://img.shields.io/badge/Astro-6-BC52EE?style=for-the-badge&logo=astro&logoColor=white)](https://astro.build)
[![Laravel](https://img.shields.io/badge/Laravel-13-FF2D20?style=for-the-badge&logo=laravel&logoColor=white)](https://laravel.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Docker](https://img.shields.io/badge/Docker-WSL2-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

<br/>

[🌐 Landing](#) · [📱 App](#) · [⚙️ API](#) · [🐛 Issues](../../issues)

<br/>

</div>

---

## ¿Qué es TrackLife?

TrackLife es una plataforma fitness **full-stack y open-source** que integra entrenamiento, nutrición, biométricos y comunidad en un único ecosistema. No es un simple contador de calorías ni un registro de ejercicios — es tu compañero de salud integral, con IA y seguimiento real.

<br/>

## 🧩 Módulos

<table>
<tr>
<td width="50%" valign="top">

### 🏋️ Entrenamiento
- Sesiones de gym con ejercicios y series
- Planes de entrenamiento personalizados
- Registro de cardio y actividad libre
- Calendario de entrenamientos
- Seguimiento de progreso y PRs

</td>
<td width="50%" valign="top">

### 🥗 Nutrición
- Diario alimentario diario
- Seguimiento de macros (proteína, carbs, grasa)
- Escáner de código de barras (OpenFoodFacts)
- Recetas personalizadas
- Plan de alimentación semanal

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 📊 Biométricos
- Frecuencia cardíaca y HRV
- Composición corporal (peso, grasa, músculo)
- Calidad y fases del sueño
- Conexión con wearables
- Historial y tendencias

</td>
<td width="50%" valign="top">

### 👥 Comunidad
- Feed social de actividad
- Clubs y grupos de entrenamiento
- Retos y competiciones
- Sistema de rachas y logros
- Búsqueda de usuarios y coaches

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 🤖 Coach IA
- Análisis de rendimiento personalizado
- Insights basados en tus datos
- Plan de mejora adaptativo
- Recomendaciones de carga y descanso

</td>
<td width="50%" valign="top">

### 🌐 Landing
- Página de presentación pública
- Sección "Cómo funciona"
- Página de precios y planes
- Diseño estático ultra-rápido (Astro)

</td>
</tr>
</table>

<br/>

## 🏗️ Arquitectura

```
                        ┌──────────────────────────────────────────────┐
                        │                   INTERNET                   │
                        └───────────────────────┬──────────────────────┘
                                                │
                        ┌───────────────────────▼──────────────────────┐
                        │              Traefik v3  (:80 / :443)        │
                        │              Reverse Proxy + SSL              │
                        └──────┬─────────────────┬──────────┬──────────┘
                               │                 │          │
               ┌───────────────▼──┐  ┌───────────▼───┐  ┌──▼──────────────┐
               │   www.tracklife  │  │ app.tracklife  │  │  api.tracklife  │
               │   Astro 6        │  │ Next.js 16     │  │  Laravel 13     │
               │   Landing page   │  │ React 19 + TS  │  │  REST API       │
               │   Static SSG     │  │ SSR + Tailwind │  │  Sanctum Auth   │
               └──────────────────┘  └───────────────┘  └────────┬────────┘
                                                                  │
                                                     ┌────────────▼────────────┐
                                                     │       MongoDB 7         │
                                                     │   (red interna,         │
                                                     │   no expuesto)          │
                                                     └─────────────────────────┘
```

<br/>

## 📦 Stack técnico

| Capa | Tecnología | Versión | Dominio local |
|------|-----------|---------|---------------|
| 🌐 Landing | Astro + TypeScript | 6.x | `www.tracklife.test` |
| 📱 App | Next.js + React + Tailwind | 16 / 19 / 4 | `app.tracklife.test` |
| ⚙️ API | Laravel + Sanctum | 13.x | `api.tracklife.test` |
| 🍃 Base de datos | MongoDB | 7.x | interno (`backend_net`) |
| 🔀 Proxy | Traefik | v3 | `traefik.test` / `:8080` |
| 🐳 Contenedores | Docker Engine (WSL2 Ubuntu) | — | — |
| 📊 Gestión infra | Portainer CE | — | `portainer.test` |

<br/>

## 🚀 Inicio rápido

### Prerrequisitos

- **Docker** con **WSL2** (Ubuntu)
- **Node.js** 20+
- **PHP** 8.3+ y **Composer**

### 1. Configurar hosts locales

Añade estas líneas a `C:\Windows\System32\drivers\etc\hosts` (o `/etc/hosts`):

```
192.168.20.123  www.tracklife.test app.tracklife.test api.tracklife.test
192.168.20.123  traefik.test portainer.test
```

### 2. Variables de entorno

```bash
cp api/.env.example api/.env
# Editar api/.env con tu configuración de MongoDB y demás
```

### 3. Levantar todos los servicios

```bash
# Primera vez
bash setup.sh

# Día a día
make up       # 🟢 levanta todo el stack
make down     # 🔴 para todos los contenedores
make ps       # 📋 estado de servicios
```

### 4. Servicios individuales

```bash
make landing-up   # solo Astro landing
make app-up       # solo Next.js app
make api-up       # solo Laravel API
make logs-api     # logs en tiempo real del API
```

<br/>

## 📁 Estructura del repositorio

```
tracklife/
│
├── landing/                  # 🌐 Astro 6 — www.tracklife.test
│   └── src/pages/
│       ├── index.astro
│       ├── como-funciona.astro
│       └── precios.astro
│
├── app/                      # 📱 Next.js 16 — app.tracklife.test
│   ├── app/
│   │   ├── (app)/            # rutas autenticadas
│   │   │   ├── entrenamiento/
│   │   │   │   ├── gym/      # planes · ejercicios · sesión activa
│   │   │   │   ├── cardio/
│   │   │   │   ├── planes/
│   │   │   │   └── progreso/
│   │   │   ├── nutricion/
│   │   │   │   ├── diario/
│   │   │   │   ├── macros/
│   │   │   │   ├── escaner/  # barcode scanner
│   │   │   │   └── recetas/
│   │   │   ├── biometricos/
│   │   │   │   ├── corazon/
│   │   │   │   ├── hrv/
│   │   │   │   ├── sueno/
│   │   │   │   └── cuerpo/
│   │   │   ├── coach/
│   │   │   └── comunidad/
│   │   ├── login/
│   │   └── registro/
│   └── components/           # UI components compartidos
│
├── api/                      # ⚙️ Laravel 13 — api.tracklife.test
│   ├── app/Http/Controllers/Api/
│   ├── app/Models/
│   └── app/Services/
│       ├── CoachService.php
│       ├── HealthScoreService.php
│       ├── OpenFoodFactsService.php
│       └── StreakService.php
│
├── Makefile                  # comandos de gestión del stack
└── setup.sh                  # primer arranque
```

<br/>

## 🔌 API — Endpoints principales

<details>
<summary><b>🔐 Autenticación</b></summary>

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Login + token Sanctum |
| `POST` | `/api/auth/register` | Registro de usuario |
| `POST` | `/api/auth/logout` | Cierre de sesión |

</details>

<details>
<summary><b>🏋️ Entrenamiento</b></summary>

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/workouts` | Historial de entrenamientos |
| `POST` | `/api/workouts` | Registrar entrenamiento |
| `GET` | `/api/workout-plans` | Planes de entrenamiento |
| `GET` | `/api/exercises` | Catálogo de ejercicios |

</details>

<details>
<summary><b>🥗 Nutrición</b></summary>

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/meals` | Registro de comidas |
| `POST` | `/api/meals` | Añadir entrada de comida |
| `GET` | `/api/macros` | Objetivos y seguimiento de macros |
| `GET` | `/api/recipes` | Recetas del usuario |
| `GET` | `/api/products` | Búsqueda de alimentos (OpenFoodFacts) |

</details>

<details>
<summary><b>📊 Biométricos y más</b></summary>

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/biometrics` | Lecturas biométricas |
| `GET` | `/api/activities` | Actividades registradas |
| `GET` | `/api/challenges` | Retos activos |
| `GET` | `/api/clubs` | Clubs y grupos |
| `GET` | `/api/feed` | Feed social |
| `GET` | `/api/dashboard` | Resumen del dashboard |

</details>

<br/>

## 🛠️ Desarrollo

### API (Laravel)

```bash
cd api
composer install
php artisan migrate
php artisan db:seed           # carga ejercicios + datos de prueba
php artisan serve
```

### App (Next.js)

```bash
cd app
npm install
npm run dev                   # http://localhost:3000
```

### Landing (Astro)

```bash
cd landing
npm install
npm run dev                   # http://localhost:4321
```

<br/>

## 📄 Licencia

MIT © [LiherRiosRuiz](https://github.com/LiherRiosRuiz)

---

<div align="center">

Construido con ☕ sudor y demasiadas horas de gym

⭐ Si te resulta útil, deja una estrella

</div>
