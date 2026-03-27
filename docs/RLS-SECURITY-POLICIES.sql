-- ============================================================================
-- RLS (ROW LEVEL SECURITY) POLICIES - VotingApp
-- ============================================================================
-- 
-- ANTES DE APLICAR:
-- 1. Asegurar que table 'app_users' existe con columnas: id, role, status
-- 2. Ejecutar este SQL en Supabase: SQL Editor → Crear nueva query
-- 3. Verificar que RLS está habilitado en cada tabla (Settings → Security)

-- ============================================================================
-- 1. RLS EN TABLE: app_users
-- ============================================================================
-- Los usuarios pueden ver solo su propio perfil

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas antiguas si existen
DROP POLICY IF EXISTS "Users can view own profile" ON app_users;
DROP POLICY IF EXISTS "Only admin can update users" ON app_users;
DROP POLICY IF EXISTS "Only admin can delete users" ON app_users;

-- Política: Cada usuario ve solo su perfil
CREATE POLICY "Users can view own profile"
  ON app_users FOR SELECT
  USING (auth.uid() = id);

-- Política: Solo admin puede actualizar usuarios
CREATE POLICY "Only admin can update users"
  ON app_users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Política: Solo admin puede eliminar usuarios
CREATE POLICY "Only admin can delete users"
  ON app_users FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- 2. RLS EN TABLE: vote_registry (CRÍTICO)
-- ============================================================================
-- Este tabla NO debe ser visible para nadie excepto el servidor (service role)
-- Los votos son registros de auditoría, no deben ser accesibles desde cliente

ALTER TABLE vote_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No access vote registry" ON vote_registry;

-- Política: Rechaza accessacceso de clientes
CREATE POLICY "No access vote registry"
  ON vote_registry FOR ALL
  USING (false);

-- Nota: El servidor (service role) siempre puede acceder ignorando RLS

-- ============================================================================
-- 3. RLS EN TABLE: anonymous_results (CRÍTICO)
-- ============================================================================
-- Los votos son anónimos, ningún cliente debe ver registros individuales
-- Solo el servidor puede inserta y admin puede ver agregados

ALTER TABLE anonymous_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No direct access anonymous results" ON anonymous_results;

-- Política: Rechaza acceso directo
CREATE POLICY "No direct access anonymous results"
  ON anonymous_results FOR ALL
  USING (false);

-- Nota: El servidor (service role) inserta votos con el token válido
-- Admin ver resultados a través de endpoint API protegido (no SQL directo)

-- ============================================================================
-- 4. RLS EN TABLE: session_tokens
-- ============================================================================
-- Los tokens de sesión son temporales, solo kiosk puede ver/usar sus propios

ALTER TABLE session_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tokens" ON session_tokens;
DROP POLICY IF EXISTS "Users can update own tokens" ON session_tokens;

-- Política: Ver solo tokens propios
CREATE POLICY "Users can view own tokens"
  ON session_tokens FOR SELECT
  USING (auth.uid() = kiosk_user_id);

-- Política: Actualizar solo tokens propios
CREATE POLICY "Users can update own tokens"
  ON session_tokens FOR UPDATE
  USING (auth.uid() = kiosk_user_id);

-- ============================================================================
-- VERIFICACIÓN POST-IMPLEMENTACIÓN
-- ============================================================================
-- 
-- Ejecutar como test para confirmar RLS funcionando:
-- 
-- 1. Su SELECT desde cliente debe fallar:
--    SELECT * FROM vote_registry;
--    SELECT * FROM anonymous_results;
--
-- 2. Service role en backend debe funcionar:
--    (Lo maneja supabaseAdmin, no el cliente)
--
-- 3. Users pueden ver su propio perfil:
--    SELECT * FROM app_users WHERE id = auth.uid();

-- ============================================================================
-- ESQUEMA DE TABLAS REQUERIDAS
-- ============================================================================
-- 
-- CREATE TABLE app_users (
--   id UUID PRIMARY KEY REFERENCES auth.users(id),
--   role TEXT CHECK (role IN ('admin', 'kiosk')) DEFAULT 'kiosk',
--   status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
--   created_at TIMESTAMP DEFAULT NOW()
-- );
--
-- CREATE TABLE vote_registry (
--   id BIGSERIAL PRIMARY KEY,
--   employee_id VARCHAR(50) NOT NULL,
--   kiosk_user_id UUID NOT NULL REFERENCES app_users(id),
--   voting_period VARCHAR(7),
--   created_at TIMESTAMP DEFAULT NOW()
-- );
--
-- CREATE TABLE anonymous_results (
--   id BIGSERIAL PRIMARY KEY,
--   categoria VARCHAR(100),
--   nominated_sapid VARCHAR(50),
--   voting_period VARCHAR(7),
--   cod_linea INT,
--   linea VARCHAR(100),
--   kiosk_user_id UUID REFERENCES app_users(id),
--   created_at TIMESTAMP DEFAULT NOW()
-- );
--
-- CREATE TABLE session_tokens (
--   token UUID PRIMARY KEY,
--   kiosk_user_id UUID NOT NULL REFERENCES app_users(id),
--   cod_linea INT,
--   linea VARCHAR(100),
--   expires_at TIMESTAMP NOT NULL,
--   used BOOLEAN DEFAULT false,
--   created_at TIMESTAMP DEFAULT NOW()
-- );
