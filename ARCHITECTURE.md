# Sistema de Votación — Mejor Empleado por Línea
## Documentación de Arquitectura v3

---

## Objetivo del Sistema

Permitir a los empleados de cada línea de producción nominar al **Mejor Empleado del Mes** en 4 categorías fijas, de forma anónima, desde un kiosco dedicado por línea.

### Categorías de votación (fijas)

| Categoría | Descripción |
|-----------|-------------|
| **Encintado** | Área de encintado de la línea |
| **Línea Final** | Operadores de cierre de línea |
| **Subensamble** | Personal de pruebas y calidad |
| **Armado** | Área de ensamble/armado |

---

## Stack Tecnológico

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| **Frontend** | HTML5 / Vanilla JS (single-file) | Cero dependencias, desplegable directo en Vercel |
| **Backend** | Vercel API Routes (serverless, Node.js) | Gratis en Vercel hobby plan; sin servidor dedicado |
| **Base de Datos** | PostgreSQL vía Supabase | UNIQUE constraints atómicos, RLS integrado |
| **Auth** | Supabase Auth + JWT por rol | Usuario kiosco por línea con `cod_linea` en `user_metadata` |
| **Storage** | Supabase Storage bucket `avatares` | Carpeta `santa_ana/`, archivos `{sapid}.jpeg`, acceso público |
| **Hosting** | Vercel + Supabase (free tier) | 23 líneas, ~52 empleados por línea (piloto: L15) |

---

## Dominio: Líneas de Producción

- **23 líneas de producción** votables (catálogo en tabla `lineas`, cod_linea + nombre)
- **~52 empleados activos por línea** (actualización mensual desde Excel)
- **1 kiosco por línea** — usuario Supabase Auth con `cod_linea` en su JWT
- **El kiosco filtra empleados por `cod_linea`** — nunca lee la base completa
- **Fuente de datos:** *Listado Maestro de personal.xlsx*
  - Hoja `Listado Maestro` → catálogo de líneas (col C = `cod_linea`, col D = `nombre`, encabezados en fila 5)
  - Hoja `L15` (y equivalentes) → empleados por línea (Sapid, Nombre, Linea, CodLinea, Grupo)

---

## Esquema de Base de Datos

> Tablas desplegadas en Supabase (migraciones 001–003). Schema real en `schema.sql`.

```
lineas                    employees_master              vote_registry         anonymous_results
──────────────────        ──────────────────────────    ──────────────────    ─────────────────────
cod_linea (PK)            sapid (PK)                    id (UUID PK)          id (UUID PK)
nombre                    nombre                        sapid ──FK──┐          categoria
                          linea                         voting_period          nominated_sapid
                          cod_linea ─FK──► lineas        voted_at              voting_period
                          grupo                         kiosk_user_id          cod_linea
                          photo_url  ← URL siempre                             linea
                          active       generado                                kiosk_user_id
                          created_at                                            created_at
                          updated_at

                     ┌──────────────────────────────────────────┐
                     │  ⚠️ CERO FK entre vote_registry          │
                     │     y anonymous_results                   │
                     │  nominated_sapid = SAPID del NOMINADO    │
                     │  La privacidad es ESTRUCTURAL.           │
                     └──────────────────────────────────────────┘

session_tokens
──────────────────────
token (UUID PK)
cod_linea        ← contexto, sin sapid
linea            ← contexto, sin sapid
expires_at       ← TTL 15 min
used             ← bool
```

> **`authorized_stations` eliminada.** El kiosco se identifica únicamente via usuario Supabase
> Auth. La línea del kiosco proviene de `user_metadata.cod_linea` en el JWT.

---

## Storage — Fotos de Empleados

- **Bucket:** `avatares` (público)
- **Carpeta:** `santa_ana/`
- **Archivo:** `{sapid}.jpeg` (nombrado por SAP ID para búsqueda directa)
- **URL patrón:** `https://wjzclsswoshdgzqgcbjv.supabase.co/storage/v1/object/public/avatares/santa_ana/{sapid}.jpeg`
- **`photo_url` siempre generado** aunque la foto no exista aún. El frontend maneja el 404 con avatar placeholder.
- Flujo de carga: al subir nuevas fotos con el nombre correcto, automáticamente aparecen en la UI sin cambios en BD.

---

## Carga Mensual de Empleados

El flujo de carga actualiza `employees_master` desde el Excel:

1. **Por línea:** usar hoja específica (ej: `L15`) → `INSERT ... ON CONFLICT DO UPDATE`
2. **Planta completa:** iterar hoja `Listado Maestro` por `cod_linea` → insertar/actualizar por lote
3. **Fotos:** listar bucket `santa_ana/` recursivamente → comparar con lista de sapids → `photo_url` generado siempre, `active=TRUE` si tiene foto (opcional)
4. **Desactivar bajas:** empleados no presentes en el nuevo listado → `UPDATE active=FALSE`

---

## Arquitectura de Anonimato — Flujo de 3 Pasos

```
EMPLEADO → [Kiosco L15 — usuario kiosco Auth con cod_linea=33465]
               │ ingresa Número SAP
               ▼
┌─────────────────────────────────────────┐
│  PASO A: VERIFICACIÓN ATÓMICA           │
│  ─────────────────────────────────────  │
│  1. Recibe sapid                        │
│  2. Valida: empleado activo en línea    │
│  3. UNIQUE(sapid, voting_period)        │ ← barrera de concurrencia
│     • Si ya votó → error / pantalla    │
│     • Si no → INSERT vote_registry     │
└─────────────────────────────────────────┘
               │ OK
               ▼
┌─────────────────────────────────────────┐
│  PASO B: TOKEN VOLÁTIL                  │
│  ─────────────────────────────────────  │
│  • gen_random_uuid() → token            │
│  • INSERT session_tokens                │ ← cod_linea + linea, SIN sapid
│  • TTL: 15 minutos                      │
└─────────────────────────────────────────┘
               │
               ▼ [Empleado selecciona 1 nominado × 4 categorías]
               │
┌─────────────────────────────────────────┐
│  PASO C: SUBMIT & DESTRUCCIÓN           │
│  ─────────────────────────────────────  │
│  1. Valida token (no expirado, no used) │
│  2. token.used = TRUE                   │ ← previene replay
│  3. INSERT anonymous_results × 4        │ ← SIN sapid votante
│  4. DELETE session_tokens               │ ← puente destruido
└─────────────────────────────────────────┘
               │
               ▼
        ✅ 4 nominaciones anónimas registradas
```

---

## Seguridad de Acceso — Capas de Defensa

```
Navegador / Kiosco
   │
   ▼
[Vercel API Route — Validación de JWT]
   │  ← Capa 1: JWT válido emitido por Supabase Auth
   │    Usuario kiosco tiene cod_linea en user_metadata
   │    El backend lee cod_linea del JWT para filtrar empleados
   ▼
[Supabase RLS]
   │  ← Capa 2: políticas por rol (a refinar con JWT claims)
   │    service_role (backend) bypasa RLS automáticamente
   ▼
[PostgreSQL — UNIQUE constraint + triggers]
      ← Capa 3: barrera atómica sobre (sapid, voting_period)
```

### Roles y Permisos

| Rol | Quién | Puede hacer |
|-----|-------|-------------|
| Usuario kiosco | Kiosco por línea (1 por línea) | Leer empleados de su `cod_linea`, gestionar flujo de votación |
| `rrhh_user` | Personal de RRHH | Ver participación, resultados agregados |
| `superrh_user` | RRHH elevado | Todo lo de `rrhh_user` + gestionar períodos |
| `admin_user` | Administrador | Acceso total, carga de empleados, configuración |

---

## Archivos del Proyecto

```
VotingApp/
├── public/
│   └── index.html        ← Mockup completo (kiosco + dashboards, single-file)
├── src/
│   ├── db.js             ← Datos demo local (1:1 con schema Supabase v3)
│   └── voteService.js    ← Lógica de negocio v3 documentada
├── schema.sql            ← DDL PostgreSQL/Supabase production-ready + RLS + seed
├── gen_sql.py            ← Generador de SQL para carga de empleados desde Excel
└── ARCHITECTURE.md       ← Este documento
```

---

## Estado del Piloto

| Tabla | Registros | Fuente |
|-------|-----------|--------|
| `lineas` | 23 líneas de producción | Hoja *Listado Maestro*, col C+D, filtro `startswith('LINEA')` |
| `employees_master` | 52 empleados activos | Hoja *L15* completa |
| `vote_registry` | — | (vacía, lista para producción) |
| `session_tokens` | — | (vacía, TTL efímero) |
| `anonymous_results` | — | (vacía, lista para producción) |

---

## Garantías de Privacidad

1. **Separación estructural**: No existen FK entre `vote_registry` y `anonymous_results`. El `nominated_sapid` en `anonymous_results` es el **nominado**, nunca el votante.

2. **Token sin identidad**: `session_tokens` guarda `cod_linea` y `linea` del kiosco pero **nunca el sapid**. El puente empleado↔voto se destruye al completar el flujo.

3. **Sin correlación temporal**: El servidor no debe loguear `(sapid + hora + nominaciones)` en el mismo registro.

4. **Kiosco por línea**: Cada kiosco solo expone empleados de su `cod_linea`. Un empleado de otra línea recibe error de validación inmediato.
