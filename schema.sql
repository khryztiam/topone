-- ══════════════════════════════════════════════════════════════════════
-- SCHEMA DE BASE DE DATOS — Sistema de Votación al Mejor Empleado
-- Compatible con: PostgreSQL / Supabase
-- Versión: 4.0 — Schema real desplegado en producción
-- Migraciones aplicadas: 001_create_tables · 002_seed_lineas · 003_seed_employees_l15
--                        004_create_app_users · 005_seed_admin_user
-- ══════════════════════════════════════════════════════════════════════
--
-- MODELO DE DATOS:
--   app_users         → Usuarios de la app (vinculados a auth.users). Roles: admin, kiosk, rrhh, suprrhh
--   lineas            → Catálogo de líneas de producción (nombre empieza con LINEA)
--   employees_master  → Tabla maestra mensual: sapid, nombre, linea, cod_linea, grupo
--   vote_registry     → QUIÉN votó (nunca QUÉ eligió). kiosk_user_id = auth.uid()
--   session_tokens    → Puente volátil destruido tras cada uso (sin sapid)
--   anonymous_results → QUÉ nombraron (nunca QUIÉN). Sin FK a vote_registry
--
-- ROLES:
--   admin    → CRUD completo de usuarios, datos y resultados
--   kiosk    → Solo acceso al flujo de votación (una línea)
--   rrhh     → Visualiza resultados de votaciones
--   suprrhh  → Como rrhh + carga/descarga/modificación de datos
--
-- PRIVACIDAD ESTRUCTURAL:
--   vote_registry ←→ anonymous_results : CERO relación directa
-- ══════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ══════════════════════════════════════════════════════════════════════
-- 1. CATÁLOGO DE LÍNEAS DE PRODUCCIÓN
--    Fuente: hoja "Listado Maestro" del Listado Maestro de personal.xlsx
--    Filtro: solo nombres que comienzan con 'LINEA' (líneas votables)
--    Columnas fuente: C=cod_linea (numérico), D=nombre (texto)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE lineas (
  cod_linea  INTEGER       PRIMARY KEY,
  nombre     VARCHAR(150)  NOT NULL
);

-- ══════════════════════════════════════════════════════════════════════
-- 2. TABLA MAESTRA DE EMPLEADOS
--    Fuente: hoja "L15" (y equivalentes por línea) del mismo xlsx.
--    Se actualiza mensualmente. photo_url siempre generado aunque la foto
--    aún no exista → permite subir fotos después y que aparezcan solas.
--    Bucket: avatares · Carpeta: santa_ana · Archivo: {sapid}.jpeg
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE employees_master (
  sapid       VARCHAR(20)   PRIMARY KEY,                          -- ID SAP (ej: '10189817')
  nombre      VARCHAR(150)  NOT NULL,                             -- Nombre completo en mayúsculas
  linea       VARCHAR(150)  NOT NULL,                             -- Nombre de línea: 'LINEA 15 D2-2'
  cod_linea   INTEGER       NOT NULL REFERENCES lineas(cod_linea), -- FK → lineas
  grupo       SMALLINT      NOT NULL,                             -- Grupo dentro de la línea
  photo_url   TEXT          NOT NULL,                             -- URL storage (siempre generado)
  active      BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
-- photo_url patrón: {project_url}/storage/v1/object/public/avatares/santa_ana/{sapid}.jpeg

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_employees_updated_at
  BEFORE UPDATE ON employees_master
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_emp_cod_linea ON employees_master (cod_linea);
CREATE INDEX idx_emp_active    ON employees_master (active);

-- ══════════════════════════════════════════════════════════════════════
-- 3. REGISTRO DE VOTOS (QUIÉN votó — SIN contenido de voto)
--    FK a employees_master valida que sapid existe y está activo.
--    UNIQUE (sapid, voting_period) es la barrera atómica contra doble voto.
--    kiosk_user_id = auth.uid() del usuario kiosco en Supabase Auth.
--    NUNCA tiene FK a anonymous_results.
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE vote_registry (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sapid          VARCHAR(20) NOT NULL REFERENCES employees_master(sapid),
  voting_period  CHAR(7)     NOT NULL,               -- 'YYYY-MM'
  voted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  kiosk_user_id  UUID,                               -- auth.uid() del kiosco (soft ref)
  CONSTRAINT uq_vote_per_period UNIQUE (sapid, voting_period)
);

CREATE INDEX idx_vote_period ON vote_registry (voting_period);
CREATE INDEX idx_vote_kiosk  ON vote_registry (kiosk_user_id);

-- ══════════════════════════════════════════════════════════════════════
-- 4. TOKENS DE SESIÓN (Puente volátil — SIN sapid del votante)
--    TTL: 15 minutos. Se destruye tras uso.
--    cod_linea + linea: contexto del kiosco (nunca identifica al votante)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE session_tokens (
  token       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  cod_linea   INTEGER      NOT NULL,
  linea       VARCHAR(150) NOT NULL,
  expires_at  TIMESTAMPTZ  NOT NULL,
  used        BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════════════
-- 5. RESULTADOS ANÓNIMOS (A QUIÉN nombraron — SIN referencia al votante)
--    nominated_sapid es el NOMINADO, nunca el votante.
--    CERO FK a vote_registry → privacidad estructural.
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE anonymous_results (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria       VARCHAR(50)  NOT NULL,
  nominated_sapid VARCHAR(20)  NOT NULL,             -- SAPID del nominado (no del votante)
  voting_period   CHAR(7)      NOT NULL,
  cod_linea       INTEGER      NOT NULL,
  linea           VARCHAR(150) NOT NULL,
  kiosk_user_id   UUID,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_results_period    ON anonymous_results (voting_period);
CREATE INDEX idx_results_cod_linea ON anonymous_results (cod_linea);
CREATE INDEX idx_results_categoria ON anonymous_results (categoria);

-- ══════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- El backend usa service_role (bypasa RLS automáticamente).
-- Las políticas aplican al cliente autenticado (kiosco / RRHH / admin).
-- TODO: refinar con JWT claims (user_metadata.cod_linea, app_metadata.role)
--       una vez que los usuarios kiosco estén configurados en Supabase Auth.
-- ══════════════════════════════════════════════════════════════════════
ALTER TABLE lineas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees_master  ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote_registry     ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_tokens    ENABLE ROW LEVEL SECURITY;
ALTER TABLE anonymous_results ENABLE ROW LEVEL SECURITY;

-- lineas: lectura para cualquier usuario autenticado
CREATE POLICY "lineas_select_authenticated"
  ON lineas FOR SELECT TO authenticated USING (true);

-- employees_master: lectura para autenticados
-- (filtro por cod_linea del kiosco se aplica en la query: WHERE cod_linea = $kiosk_cod_linea)
CREATE POLICY "emp_select_authenticated"
  ON employees_master FOR SELECT TO authenticated USING (true);

-- vote_registry: solo inserción para autenticados
CREATE POLICY "vote_insert_authenticated"
  ON vote_registry FOR INSERT TO authenticated WITH CHECK (true);

-- session_tokens: CRUD para autenticados (control por lógica de servicio)
CREATE POLICY "token_all_authenticated"
  ON session_tokens FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- anonymous_results: inserción para autenticados
CREATE POLICY "results_insert_authenticated"
  ON anonymous_results FOR INSERT TO authenticated WITH CHECK (true);

-- ══════════════════════════════════════════════════════════════════════
-- 6. USUARIOS DE LA APLICACIÓN
--    Vinculada a auth.users (Supabase Auth). Un registro por usuario.
-- ══════════════════════════════════════════════════════════════════════
CREATE TYPE user_role AS ENUM ('admin', 'kiosk', 'rrhh', 'suprrhh');

CREATE TABLE app_users (
  id          UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       VARCHAR(255) NOT NULL,
  full_name   VARCHAR(150),
  role        user_role    NOT NULL DEFAULT 'kiosk',
  cod_linea   INTEGER      REFERENCES lineas(cod_linea) ON DELETE SET NULL,
  linea       VARCHAR(150),
  active      BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_app_users_role      ON app_users(role);
CREATE INDEX idx_app_users_cod_linea ON app_users(cod_linea);

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users: read own row"
  ON app_users FOR SELECT TO authenticated USING (auth.uid() = id);

-- Función SECURITY DEFINER para evitar recursión en RLS
-- (consulta app_users como dueño de la función, sin activar las mismas policies)
CREATE OR REPLACE FUNCTION get_my_app_role()
RETURNS user_role LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT role FROM app_users WHERE id = auth.uid()
$$;

CREATE POLICY "admin: read all users"
  ON app_users FOR SELECT TO authenticated
  USING (get_my_app_role() = 'admin');
CREATE POLICY "admin: insert users"
  ON app_users FOR INSERT TO authenticated
  WITH CHECK (get_my_app_role() = 'admin');
CREATE POLICY "admin: update users"
  ON app_users FOR UPDATE TO authenticated
  USING (get_my_app_role() = 'admin');
CREATE POLICY "admin: delete users"
  ON app_users FOR DELETE TO authenticated
  USING (get_my_app_role() = 'admin');

-- ══════════════════════════════════════════════════════════════════════
INSERT INTO lineas (cod_linea, nombre) VALUES
  (10703, 'LINEA 35 C1YX'),
  (10705, 'LINEA 36 C1YX'),
  (10706, 'LINEA 37 C1YX'),
  (10733, 'LINEA 34 C1YX'),
  (10743, 'LINEA 10 C1UX'),
  (10756, 'LINEA 14 D2UX'),
  (31366, 'LINEA 26 JL'),
  (31367, 'LINEA 27 JL'),
  (31368, 'LINEA 28 JL'),
  (31369, 'LINEA 29 JL'),
  (31766, 'LINEA 30 JT'),
  (33464, 'LINEA 14 D2-2'),
  (33465, 'LINEA 15 D2-2'),
  (33466, 'LINEA 16 D2-2'),
  (33467, 'LINEA 17 D2-2'),
  (33468, 'LINEA 18 D2-2'),
  (33469, 'LINEA 19 D2-2'),
  (33470, 'LINEA 20 D2-2'),
  (33471, 'LINEA 21 D2UX- 2'),
  (33472, 'LINEA 22 D2-2'),
  (33473, 'LINEA 23 D2-2'),
  (33474, 'LINEA 24 D2-2'),
  (33679, 'LINEA MUESTRAS ATO')
ON CONFLICT (cod_linea) DO NOTHING;
