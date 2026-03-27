# 🚀 Guía de Instalación y Setup

Instrucciones paso a paso para configurar TopOne en tu máquina local o en producción.

---

## ⚡ Quick Start (5 minutos)

```bash
# 1. Clonar
git clone https://github.com/khryztiam/topone.git
cd topone

# 2. Instalar
npm install

# 3. Configurar variables (copy .env.example)
cp .env.example .env.local
# EDITAR .env.local con tus claves Supabase

# 4. Ejecutar
npm run dev

# 5. Abrir navegador
# http://localhost:3000
```

---

## 📋 Requisitos Previos

- **Node.js** 18.x o superior ([descargar](https://nodejs.org))
- **npm** o **yarn** (incluido con Node.js)
- **Git** ([descargar](https://git-scm.com))
- **Cuenta Supabase** (gratuita en [supabase.com](https://supabase.com))
- **Navegador moderno** (Chrome, Firefox, Edge, Safari)

### Verificar Versiones

```powershell
node --version      # Debe ser v18.x o mayor
npm --version       # Debe ser 10.x o mayor
git --version       # Debe estar instalado
```

---

## 🔧 Setup Local - Paso a Paso

### Paso 1: Clonar Repositorio

```bash
git clone https://github.com/khryztiam/topone.git
cd topone
```

### Paso 2: Instalar Dependencias

```bash
npm install
```

Este comando instala todos los paquetes en `node_modules/`:
- `next` — Framework web
- `react@19` — UI
- `@supabase/supabase-js` — BD y auth
- `exceljs` — Importación de Excel
- Otros...

### Paso 3: Crear y Configurar `.env.local`

#### Opción A: Manual

1. Copiar `.env.example`:
   ```bash
   cp .env.example .env.local
   ```

2. Editar `.env.local` en tu editor favorito y llenar:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

#### Opción B: Automatizada (Windows PowerShell)

```powershell
copy .env.example .env.local
```

### Paso 4: Obtener Claves de Supabase

1. Ir a [supabase.com](https://supabase.com) y loguearse (o crear cuenta gratuita)
2. Crear nuevo proyecto o usar existente
3. Ir a **Settings → API**
4. Copiar:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_KEY`

> ⚠️ **IMPORTANTE**: `SUPABASE_SERVICE_KEY` es muy sensible. **Nunca** lo compartas o expongas en GitHub.

### Paso 5: Desplegar Schema en Supabase

1. En Supabase Console, ir a **SQL Editor**
2. Crear nueva query
3. Copiar y pegar contenido de `schema.sql`
4. Ejecutar

Esto crea todas las tablas, indices, y RLS policies.

### Paso 6: Ejecutar en Desarrollo

```bash
npm run dev

# Output esperado:
# ▲ Next.js 16.2.1
# - Local: http://localhost:3000
# - Environments: .env.local
```

Abre tu navegador en [http://localhost:3000](http://localhost:3000).

### Paso 7: Verfcar que Funciona

- Página Login carga
- Puedes ver inputs de usuario/contraseña
- Conexión a Supabase está activa

---

## 👤 Crear Usuario Admin (Primeros Pasos)

Después del schema, necesitas un usuario admin para acceder al dashboard:

### Via Supabase Auth UI

1. En Supabase Console → **Authentication → Users**
2. Clic en **"Create new user"**
3. Email: `admin@topone.com`
4. Password: Una segura
5. Guardar

### Via SQL (Recomendado)

En SQL Editor de Supabase:

```sql
-- Crear usuario auth
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  gen_random_uuid(),
  'admin@topone.com',
  crypt('tu-password-aqui', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"cod_linea": null}',
  false,
  'authenticated'
);

-- Crear registro en app_users con rol admin
INSERT INTO app_users (
  id,
  email,
  rol,
  created_at
) SELECT id, email, 'admin', now()
FROM auth.users
WHERE email = 'admin@topone.com';
```

### Credenciales de Test

```
Email: admin@topone.com
Password: (la que estableciste)

Kiosk usuario: L15
Password: (la que estableciste para kiosk user)
```

---

## 🗄️ Estructura de BD Verificada

Después de ejecutar `schema.sql`, deberías ver:

```
Tablas:
├── auth.users          ← Usuarios Supabase Auth
├── lineas              ← Catálogo de líneas
├── employees_master    ← Empleados por línea
├── vote_registry       ← QUIÉN votó
├── anonymous_results   ← QUÉ nominó
├── app_users           ← Rol/permisos
└── session_tokens      ← Tokens temporales
```

Verificar en Supabase Console → **Table Editor**.

---

## 📁 Estructura Local del Proyecto

```
topone/
├── .env.local              ← TUS VARIABLES (no compartir)
├── .next/                  ← Build output (ignorado en git)
├── node_modules/           ← Dependencias (ignorado en git)
├── public/                 ← Archivos estáticos
├── src/
│   ├── components/         ← Componentes React
│   ├── context/            ← Estado global
│   ├── pages/              ← Rutas Next.js
│   ├── styles/             ← CSS Modules
│   └── lib/                ← Utilidades
├── docs/                   ← Documentación
├── ARCHITECTURE.md         ← Documentación técnica
├── schema.sql              ← BD schema
├── package.json            ← Dependencias
└── next.config.mjs         ← Config de Next.js
```

---

## 🚀 Comandos Útiles

```bash
# Desarrollo
npm run dev          # Servidor en hot-reload

# Producción
npm run build        # Compilar
npm start            # Iniciar servidor compilado

# Linting / Validation
npm run lint         # Chequear código

# Test (si aplica)
npm test             # Ejecutar tests
```

---

## 🐛 Troubleshooting

### Error: "Cannot find module 'next'"

**Solución:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Error: "supabase is not defined"

**Causa:** Variables de entorno no cargadas.

**Solución:**
1. Verificar `.env.local` existe
2. Verificar valores no están vacíos
3. Reiniciar servidor: `Ctrl+C` y `npm run dev` de nuevo

### Error: "Invalid JWT"

**Causa:** Claves Supabase incorrectas o expiradas.

**Solución:**
1. Re-copiar claves desde Supabase Console
2. Asegurar no hay espacios en blanco
3. Reiniciar servidor

### Página en blanco o 404

**Solución:**
1. Abrir DevTools (F12)
2. Ver **Console** por errores
3. Ve a **Network** y revisa requests a Supabase

### Puerto 3000 ya en uso

**Solución:**
```bash
npm run dev -- -p 3001    # Usar puerto 3001
```

---

## 🌍 Despliegue en Producción

### Opción 1: Vercel (Recomendado)

1. **Crear cuenta** en [vercel.com](https://vercel.com)
2. **Conectar GitHub:**
   - Clic "Import Project"
   - Seleccionar repo
   - Autorizar GitHub
3. **Configurar Variables:**
   - Ir a **Settings → Environment Variables**
   - Agregar trio de variables Supabase
4. **Deploy:** Clic "Deploy"
5. **Resultado:** URL en vivo (ej: topone.vercel.app)

> Cada push a `main` redeploy automáticamente

### Opción 2: Otro Hosting (Heroku, etc.)

```bash
npm build
npm start
```

Asegurate de:
- Variables de entorno configuradas en servicio
- Node.js 18.x disponible
- Puerto 3000 expuesto

### Checklist Pre-Producción

- [ ] `.env.local` NO está en repo (en `.gitignore`)
- [ ] Supabase RLS policies activas para seguridad
- [ ] Usuario admin creado
- [ ] Base de datos seeded con al menos 1 línea
- [ ] Fotos de empleados subidas a Storage (opcional pero recomendado)
- [ ] Backup de BD configurado

---

## 📊 Carga Inicial de Datos

### Empleados desde Excel

1. Preparar Excel con formato correcto (ver ARCHITECTURE.md)
2. Ir a Admin Dashboard → **Importar Empleados**
3. Seleccionar archivo
4. Confirmar

### Fotos de Empleados

1. Supabase Console → **Storage → avatares → santa_ana/**
2. Subir fotos con nombre: `{sapid}.jpeg`
   - Ej: `10189817.jpeg`
3. Automáticamente aparecerán en votación

---

## 🔐 Seguridad de Variables en Producción

### ❌ NUNCA hacer:
```bash
# No committear .env.local
git add .env.local    # ❌ MALO

# No exposar claves en logs
console.log(SUPABASE_SERVICE_KEY)   # ❌ MALO

# No compartir secretos en email/chat
```

### ✅ SIEMPRE:
```bash
# Usar .env.local para desarrollo
# Usar Vercel/hosting panel para producción
# Rotar claves si se exponen accidentalmente
```

---

## 📚 Próximos Pasos

1. **Lee [ARCHITECTURE.md](../ARCHITECTURE.md)** para entender diseño
2. **Lee [CONTRIBUTING.md](./CONTRIBUTING.md)** para aportar código
3. **Prueba votación en desarrollo** para familiarizarte
4. **Revisa componentes en `src/`** para entender estructura
5. **Haz push a producción cuando esté listo**

---

## 🆘 Soporte

Si tienes problemas:

1. **Chequea logs:** `npm run dev` y mira console
2. **Busca en [Issues](https://github.com/khryztiam/topone/issues)**
3. **Abre Nueva Issue** con detalles
4. **Comuníquete con equipo** si tienes acceso

---

## ✅ Checklist de Setup Completado

- [ ] Node.js instalado y verificado
- [ ] Repositorio clonado
- [ ] `npm install` ejecutado
- [ ] `.env.local` creado con variables Supabase
- [ ] `schema.sql` ejecutado en Supabase
- [ ] Usuario admin creado
- [ ] `npm run dev` funciona
- [ ] Login page carga en http://localhost:3000
- [ ] Puedes loguearte

**¡Listo para que comiences a contribuir! 🎉**
