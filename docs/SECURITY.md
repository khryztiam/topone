# 🔐 Seguridad y Privacidad en TopOne

Documentación sobre las prácticas de seguridad y privacidad implementadas en TopOne.

---

## 🎯 Principios Core

TopOne está diseñado con **privacidad estructural**, no solo como medida de seguridad sino como principio arquitectónico fundamental.

### Privacidad por Diseño

**Objetivo:** Garantizar que **NUNCA se pueda saber qué votó una persona específica**, incluso si alguien accede a la base de datos.

---

## 🔒 Modelo de Votación Anónima

### Las Dos Tablas Desconectadas

La privacidad se garantiza mediante **dos tablas completamente desconectadas**:

#### 1️⃣ `vote_registry` — QUIÉN VOTÓ

```sql
CREATE TABLE vote_registry (
  id              UUID PRIMARY KEY,
  sapid           VARCHAR(20),         -- Quién votó (usuario)
  voting_period   VARCHAR(20),         -- Cuándo
  voted_at        TIMESTAMP,           -- Timestamp
  kiosk_user_id   UUID                 -- ID usuario kiosk
);
```

**Qué contiene:**
- ✅ Identidad del votante (para auditoría)
- ❌ NO contiene qué eligió

#### 2️⃣ `anonymous_results` — QUÉ SE NOMINÓ

```sql
CREATE TABLE anonymous_results (
  id              UUID PRIMARY KEY,
  categoria       VARCHAR(50),         -- Categoría (Encintado, etc.)
  nominated_sapid VARCHAR(20),         -- A quién nominaron
  voting_period   VARCHAR(20),
  cod_linea       INTEGER,
  kiosk_user_id   UUID                 -- ID usuario kiosk (contextual)
);
```

**Qué contiene:**
- ✅ Categoría votada
- ✅ Empleado nominado
- ❌ NO contiene quién votó (solo kiosk_user_id para contexto, sin FK a voter)

> **CERO conexión directa entre tablas** — Privacidad estructural garantizada.

---

## 🛡️ Capas de Seguridad

### 1. Row Level Security (RLS) en Supabase

Cada tabla tiene policies RLS activas para control de acceso granular.

### 2. Autenticación JWT por Rol

Cada usuario tiene rol que limita qué puede hacer (kiosk, rrhh, suprrhh, admin).

### 3. Validación en API

Todo endpoint API valida JWT, rol, y permisos para operación.

### 4. Tokens Volátiles (Session Tokens)

Los tokens temporales viven solo 15 minutos y nunca contienen SAP ID del votante.

---

## 🔑 Gestión de Credenciales

### Variables de Entorno

- `NEXT_PUBLIC_SUPABASE_URL` — Pública, OK exponerla
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Restringida por RLS
- `SUPABASE_SERVICE_KEY` — ⚠️ **MÁXIMO SECRETO**

⚠️ **NUNCA expongas `SUPABASE_SERVICE_KEY` en:**
- Cliente/browser
- GitHub Commits
- Emails
- Browser DevTools

---

## 🔐 Datos Sensibles Excluidos

```gitignore
.env                    # Variables de entorno
.env.local              # Variables locales
*.xlsx                  # Datos de empleados
public/employes_pics/   # Fotos de empleados
```

---

## ✅ Cumplimiento Regulatorio

TopOne cumple con:
- ✅ **Privacidad estructural** (votación anónima)
- ✅ **GDPR** (derecho al olvido, portabilidad)
- ✅ **Encriptación en tránsito** (HTTPS)
- ✅ **Auditoría** (vote_registry)

---

**Versión:** 1.0  
**Última actualización:** Marzo 2026  
**Maintainer:** Equipo de Desarrollo TopOne
