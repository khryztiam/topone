# 🏆 TopOne - Sistema de Votación para Mejor Empleado

## 📋 Descripción General

**TopOne** es una aplicación web de votación empresarial que permite a los empleados de diferentes líneas de producción nominar anónimamente al **Mejor Empleado del Mes** en categorías específicas. El sistema garantiza privacidad estructural separando completamente quién votó de qué nominó.

### Características Principales

- ✅ **Votación Anónima y Segura** — Privacidad estructural: sin relación directa entre votes y nominaciones
- ✅ **Kiosco por Línea** — Un dispositivo dedicado por línea de producción con acceso controlado por usuario
- ✅ **Dashboard Administrativo** — Visualización de resultados, carga de empleados, gestión de usuarios
- ✅ **4 Categorías Fijas** — Encintado, Línea Final, Subensamble, Armado
- ✅ **Authenticación por Rol** — Admin, Kiosk, RRHH, SuperRRHH
- ✅ **Carga Automática de Empleados** — Importación desde Excel mensual
- ✅ **Fotos de Identificación** — Avatar con URL generada automáticamente desde Supabase Storage

---

## 🚀 Quick Start

### Requisitos Previos

- Node.js 18.x o superior
- npm o yarn
- Cuenta en [Supabase](https://supabase.com) (gratuita)
- Cuenta en [Vercel](https://vercel.com) (para despliegue, opcional)

### Instalación Local

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/khryztiam/topone.git
   cd topone
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   
   Crear archivo `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://[proyecto].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[tu-clave-anon]
   SUPABASE_SERVICE_KEY=[tu-clave-service] (solo para backend)
   ```

   Obtener las claves desde Supabase: Settings → API → Project API Keys

4. **Ejecutar en desarrollo**
   ```bash
   npm run dev
   ```

   Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

5. **Compilar para producción**
   ```bash
   npm run build
   npm start
   ```

---

## 📱 Interfaz y Flujos

### 🎯 Flujo de Votación (Kiosk)

```
1. Login (Kiosk)
   → Usuario por línea (ej: "L15", "L20")
   
2. Escanear / Seleccionar Votante
   → QR o búsqueda del SAP ID
   
3. Confirmar Identidad
   → Foto + datos del votante
   
4. Votar (4 categorías)
   → Seleccionar empleado por categoría
   
5. Confirmación
   → Resumen de voto
   → Gracias al empleado
```

### 👨‍💼 Flujo Administrativo (Dashboard)

- **Dashboard** — Métricas de votación, participación por línea
- **Usuarios** — CRUD de usuarios del sistema
- **Resultados** — Leaderboard por línea y categoría
- **Líneas** — Configuración de líneas de producción
- **Importar Empleados** — Carga desde Excel (xlsx)
- **Exportar Resultados** — Descarga de datos de votación

---

## 🏗️ Stack Tecnológico

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| **Frontend** | React 19.2 + Next.js 16.2 | SSR, API Routes, rendering óptimo |
| **Backend** | Next.js API Routes (Serverless) | Node.js sin servidor dedicado |
| **Base de Datos** | PostgreSQL (Supabase) | ACID, constraints atómicos, RLS |
| **Autenticación** | Supabase Auth + JWT | Roles por usuario, seguridad integrada |
| **Storage** | Supabase Storage | Fotos de empleados, bucket `avatares` |
| **Hosting** | Vercel + Supabase Free | 0 costo, escalable, 23 líneas |

---

## 📁 Estructura del Proyecto

```
topone/
├── src/
│   ├── components/              # Componentes React reutilizables
│   │   ├── AdminLayout.jsx     # Layout para admin
│   │   ├── ScanStep.jsx        # Escaneo/selección de votante
│   │   ├── ConfirmEmployeeStep.jsx
│   │   ├── VoteStep.jsx        # Interface de votación
│   │   ├── SuccessStep.jsx
│   │   ├── ErrorStep.jsx
│   │   ├── Sidebar.jsx
│   │   └── admin/              # Componentes del dashboard
│   │       ├── UserTable.jsx
│   │       ├── UserFormModal.jsx
│   │       └── UserStatsCards.jsx
│   │
│   ├── context/                # Context API para estado global
│   │   ├── AuthContext.jsx    # Autenticación y usuario
│   │   └── KioskContext.jsx   # Estado de votación (paso, línea, empleado)
│   │
│   ├── lib/                    # Utilitarios y configuración
│   │   ├── supabaseClient.js  # Cliente Supabase (browser)
│   │   ├── supabaseAdmin.js   # Cliente Supabase (server)
│   │   └── constants.js        # Constantes globales
│   │
│   ├── pages/                  # Rutas de Next.js
│   │   ├── index.js           # Kiosk (votación)
│   │   ├── login.js           # Login
│   │   ├── api/               # Rutas API
│   │   │   ├── vote.js
│   │   │   ├── employee.js
│   │   │   └── admin/         # Endpoints administrativos
│   │   └── admin/             # Rutas admin
│   │       ├── dashboard.js
│   │       ├── users.js
│   │       └── results.js
│   │
│   ├── styles/                # CSS Modules
│   │   ├── globals.css        # Estilos globales
│   │   ├── Kiosk.module.css
│   │   ├── Login.module.css
│   │   └── admin/
│   │
│   ├── db.js                  # Inicialización de BD
│   └── voteService.js         # Lógica de votación
│
├── public/                     # Activos estáticos
│   ├── index.html             # Fallback HTML
│   ├── favicon.svg
│   └── employes_pics/         # Fotos (ignoradas en git)
│
├── ARCHITECTURE.md            # Documentación técnica detallada
├── schema.sql                 # Schema de BD
├── package.json
├── next.config.mjs
├── jsconfig.json
└── README.md                  # Este archivo
```

---

## 🗄️ Esquema de Base de Datos

### Tabla `lineas`
```sql
CREATE TABLE lineas (
  cod_linea  INTEGER PRIMARY KEY,
  nombre     VARCHAR(150) NOT NULL  -- ej: "LINEA 15 D2-2"
);
```

### Tabla `employees_master`
```sql
CREATE TABLE employees_master (
  sapid       VARCHAR(20) PRIMARY KEY,   -- ID SAP
  nombre      VARCHAR(150) NOT NULL,
  linea       VARCHAR(150) NOT NULL,
  cod_linea   INTEGER NOT NULL,  -- FK a lineas
  grupo       VARCHAR(50),
  photo_url   VARCHAR(255),      -- Generado automáticamente
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMP,
  updated_at  TIMESTAMP
);
```

### Tabla `vote_registry` (QUIÉN VOTÓ)
```sql
CREATE TABLE vote_registry (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sapid           VARCHAR(20),         -- Votante anónimo
  voting_period   VARCHAR(20),         -- Período (ej: "2024-01-12")
  voted_at        TIMESTAMP DEFAULT now(),
  kiosk_user_id   UUID                 -- ID del usuario Supabase (sin datos)
);
```

### Tabla `anonymous_results` (QUÉ VOTARON)
```sql
CREATE TABLE anonymous_results (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria         VARCHAR(50),        -- Encintado, Línea Final, etc.
  nominated_sapid   VARCHAR(20),        -- SAP ID del NOMINADO
  voting_period     VARCHAR(20),
  cod_linea         INTEGER,
  linea             VARCHAR(150),
  kiosk_user_id     UUID,
  created_at        TIMESTAMP
);
```

⚠️ **PRIVACIDAD ESTRUCTURAL**: `vote_registry` y `anonymous_results` **NO tienen relación directa (sin FK).** Esto garantiza que nunca se puede saber qué votó una persona específica.

---

## 🔐 Seguridad y Privacidad

### Principios de Diseño

1. **Privacidad por Arquitectura** — vote_registry ≠ anonymous_results
2. **RLS (Row Level Security)** — Supabase auth integrada en BD
3. **JWT por Rol** — Permissions discretas: admin, kiosk, rrhh, suprrhh
4. **Tokens Volátiles** — session_tokens se destruyen tras cada uso
5. **Fotos Automáticas** — URL generada aunque foto no exista (manejo de 404 en frontend)

### Roles y Permisos

| Rol | Voting | View Results | Manage Users | Import Data | Export Data |
|-----|--------|--------------|--------------|-------------|-------------|
| **kiosk** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **rrhh** | ❌ | ✅ | ❌ | ❌ | ❌ |
| **suprrhh** | ❌ | ✅ | ❌ | ✅ | ✅ |
| **admin** | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 📊 Flujo de Datos en Votación

```
┌────────────────────────────────────────────────────────────┐
│  KIOSK VOTACIÓN                                            │
└─────────────────┬────────────────────────────────────────┘
                  │
        1. Empleado confirma identidad (sapid)
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
   vote_registry     anonymous_results
  (QUIÉN votó)      (QUÉ nominó)
  - sapid (anon)    - categoria
  - timestamp       - nominated_sapid
  - kiosk_id        - cod_linea
                    
  ⚠️ CERO conexión entre tablas
```

---

## 🚀 Despliegue en Producción

### En Vercel

1. **Conectar repositorio GitHub**
   ```
   vercel.com → Nuevo proyecto → Conectar repo
   ```

2. **Variables de entorno en Vercel**
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://[proyecto].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = [tu-clave]
   SUPABASE_SERVICE_KEY = [solo-para-nodejs]
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

### En Supabase

1. **Crear proyecto** en supabase.com
2. **Ejecutar migraciones** → SQL Editor:
   ```bash
   cat schema.sql | paste en SQL Editor
   ```
3. **Crear usuario admin** — via SQL o dashboard
4. **Configurar Storage bucket** `avatares` → Carpeta `santa_ana/`
5. **Habilitar RLS policies** en todas las tablas críticas

---

## 📤 Carga de Empleados (Importación)

### Formato Excel Requerido

**Archivo:** `Listado Maestro de personal.xlsx`

**Hoja "Listado Maestro"** (líneas):
```
Col C | Col D
------|-------
cod_linea | nombre
15 | LINEA 15 D2-2
20 | LINEA 20 D2-3
```

**Hojas por Línea** (ej: "L15"):
```
SAPID | Nombre | Linea | CodLinea | Grupo
------|--------|-------|----------|-------
10189817 | JUAN PÉREZ | L15 | 15 | Armado
```

### Sincronización Automática

Vía API `/api/admin/import-employees`:
```bash
POST /api/admin/import-employees
Body: FormData (file: xlsx)

Resultado:
- Nuevos empleados insertados
- Existentes actualizados (foto_url regenerada)
```

---

## 🧪 Testing y Validación

### Casos de Prueba Principales

- ✅ Login kiosk por línea
- ✅ Votación anónima sin leakage de identidad
- ✅ Recuento de votos por línea
- ✅ Importación de empleados desde Excel
- ✅ Visualización de resultados por rol
- ✅ Privacidad: nadie puede ver quién votó qué

### Ejecutar en Desa Desarrollo

```bash
npm run dev
# Abrir http://localhost:3000

# Credenciales de test (generadas durante setup)
Usuario kiosk: L15 / password
Admin: admin@topone.com / password
```

---

## 📖 Documentación Adicional

Toda la documentación está organizada en [`/docs`](./docs/):

- **[docs/INDEX.md](./docs/INDEX.md)** — 📍 Índice central de toda la documentación
- **[docs/SETUP.md](./docs/SETUP.md)** — Instalación paso a paso
- **[docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md)** — Cómo contribuir
- **[docs/SECURITY.md](./docs/SECURITY.md)** — Privacidad y seguridad
- **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)** — Guía de despliegue
- **[docs/CHECKLIST.md](./docs/CHECKLIST.md)** — Validación pre-producción

Documentación técnica:
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — Diseño técnico y decisiones
- **[schema.sql](./schema.sql)** — Schema de base de datos

---

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📝 Licencia

Este proyecto está bajo la licencia ISC. Ver [LICENSE](LICENSE) para más detalles.

---

## 👥 Autor

**TopOne** — Sistema de Votación para Mejor Empleado
Desarrollado como solución para gestión de reconocimiento laboral en plantas de producción.

---

## 🆘 Soporte

Para reportar bugs, solicitudes de features o questions:
- Abre un [Issue en GitHub](https://github.com/khryztiam/topone/issues)
- Contacta al equipo de desarrollo

---

## 📚 Stack de Tecnologías Resumido

```
Frontend:     React 19 + Next.js 16 + CSS Modules
Backend:      Node.js (Next.js API Routes)
Database:     PostgreSQL (Supabase)
Auth:         Supabase Auth (JWT + RLS)
Storage:      Supabase Storage (Avatares)
Hosting:      Vercel + Supabase
Data Import:  Excel (ExcelJS)
```

**Versión:** 1.0.0  
**Estado:** Production Ready  
**Última actualización:** Marzo 2026
