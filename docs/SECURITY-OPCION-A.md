# 🔐 GUÍA DE SEGURIDAD - CHANGES IMPLEMENTADOS

Fecha: Marzo 27, 2026
Versión: v2.0 (Opción A - Seguridad Completa)

---

## 📋 RESUMEN DE CAMBIOS

Se implementaron **4 capas de seguridad** en VotingApp:

1. **AuthGate** - Protección de rutas centralizada
2. **Rate Limiting** - Máximo 1 voto por usuario por día
3. **AuthContext mejorado** - Validación de status (activo/inactivo)
4. **RLS Policies** - Row Level Security en Supabase

---

## 1️⃣ AuthGate (Nuevo componente)

**Archivo:** `src/components/AuthGate.jsx`

### ¿Qué hace?
Protege las rutas de la aplicación. Centraliza toda la lógica de control de acceso.

### Rutas protegidas:
- `/` (Voting page) - Solo usuarios autenticados
- `/admin/*` - Solo admin
- `/login` - Ruta pública (todos)

### Características:
```javascript
// Muestra spinner mientras valida sesión
if (loading) return <LoadingSpinner />

// Redirige a login si no hay sesión
if (!user && !isPublicRoute) router.push('/login')

// Bloquea acceso por rol inapropiado
if (accessDenied) return <AccessDeniedAlert />
```

### Uso en `_app.js`:
```javascript
<AuthProvider>
  <AuthGate>  {/* ← NUEVO: Centralizado */}
    <KioskProvider>
      <Component />
    </KioskProvider>
  </AuthGate>
</AuthProvider>
```

---

## 2️⃣ Rate Limiting

**Archivo:** `src/lib/rateLimit.js`

### ¿Qué hace?
Limita cuántas veces un usuario puede hacer clic en "Votar":
- **Máximo:** 1 voto
- **Ventana:** 24 horas
- **Identificador:** User ID (desde JWT)

### Implementación en `/api/vote`:
```javascript
// Antes: export default handler (VULNERABLE)
// Ahora:
export default rateLimit(handler, {
  max: 1,               // 1 voto
  window: 86400000,     // 24 horas (ms)
  key: 'user'           // Por usuario autenticado
});
```

### Response cuando se excede:
```json
HTTP 429 Too Many Requests
{
  "error": "Demasiadas solicitudes. Intenta más tarde.",
  "retryAfter": 86400
}
```

### Headers informativos:
```
X-RateLimit-Limit: 1
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2026-03-28T12:00:00Z
```

---

## 3️⃣ Validación de Status (Activo/Inactivo)

**Archivo:** `src/context/AuthContext.jsx`

### ¿Qué hace?
Los usuarios inactivos no pueden usar la app, incluso si tienen sesión.

### Cambios:
```javascript
// ANTES: Solo 'user' y 'session'
// AHORA: Agregado 'role' y 'status'
const [role, setRole] = useState(null);    // 'admin' or 'kiosk'
const [status, setStatus] = useState(null); // 'active' or 'inactive'
```

### Lógica de logout automático:
```javascript
if (data.user.status === 'inactive') {
  console.warn('[Auth] Usuario inactivo, haciendo logout');
  await supabase.auth.signOut();  // ← Logout automático
  setUser(null);
}
```

### Caso de uso:
- Admin desactiva usuario
- Usuario intenta usar app
- AuthContext detecta `status: 'inactive'`
- Hace logout automático
- User redirigido a login

---

## 4️⃣ RLS Policies en Supabase

**Archivo:** `docs/RLS-SECURITY-POLICIES.sql`

### ¿Qué son?
Row Level Security = Control de acceso a nivel de fila. Protege la BD.

### ANTES de RLS:
```javascript
// ❌ Vulnerable
const { data } = await supabase
  .from('vote_registry')
  .select('*');  // Cliente ve TODO
```

### DESPUÉS de RLS:
```javascript
// ✓ Protegido
const { data } = await supabase
  .from('vote_registry')
  .select('*');  // Rechazado por RLS policy
```

### Políticas implementadas:

#### **app_users**
- ✓ Usuarios ven su propio perfil
- ✓ Solo admin puede editar/borrar usuarios

#### **vote_registry** (CRÍTICO)
- ✗ Rechaza TODOS los accesos desde cliente
- ✓ Solo service role (backend) puede acceder
- 🔒 Los votos son auditoría interna

#### **anonymous_results** (CRÍTICO)
- ✗ Rechaza TODOS los accesos desde cliente
- ✓ Solo service role (backend) puede inserta
- 🔒 Los resultados son anónimos

#### **session_tokens**
- ✓ Usuarios ven solo sus propios tokens
- ✓ Usuarios actualizan solo sus tokens

### Instalación en Supabase:
1. Dashboard → SQL Editor → New query
2. Copiar contenido de `docs/RLS-SECURITY-POLICIES.sql`
3. Ejecutar (Run)
4. Verificar en cada tabla: Settings → Security → RLS habilitado

---

## 🧪 TESTING

### Tests incluidos:

```bash
# Ejecutar test de seguridad
node src/__tests__/test-security.js
```

Valida:
- ✓ Rate limiting activo
- ✓ AuthGate bloquea rutas
- ✓ JWT requerido en APIs
- ✓ Validación de datos
- ✓ Archivos existentes

### Test manual en navegador:

**Test 1: AuthGate bloquea sin sesión**
```
1. Abrir: http://localhost:3000/admin/dashboard
2. Resultado: Debe redirigir a /login
```

**Test 2: Rate limiting**
```
1. Login exitoso
2. Intentar votar 2 veces rápido
3. 2do intento: Error 429 "Too Many Requests"
```

**Test 3: Usuario inactivo**
```
1. Login como usuario activo (ok)
2. Admin desactiva usuario en BD
3. Usuario intenta votar
4. Resultado: Logout automático, redirigido a login
```

---

## 📊 FLUJO DE SEGURIDAD COMPLETO

```
Usuario accede a /
  ↓
AuthGate verifica: ¿Sesión?
  ├─ NO → Redirige a /login
  └─ SÍ ↓
AuthContext valida:
  ├─ Status = inactive? → Logout automático ✗
  └─ Status = active ↓
Usuario en /admin/dashboard
  ↓
Intenta hacer clic en "Votar"
  ↓
POST /api/vote
  ↓
Rate limiter verifica: ¿Primer voto hoy?
  ├─ NO (ya votó) → Error 429 ✗
  └─ SÍ ↓
Backend inserta voto en anonymous_results
  ↓
RLS protege: ¿Cliente accede directamente?
  ├─ SÍ → Rechazado por RLS ✗
  └─ NO (solo backend) ✓
Voto registrado anónimamente
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [x] AuthGate creado en `src/components/AuthGate.jsx`
- [x] rateLimit.js creado en `src/lib/rateLimit.js`
- [x] AuthGate.module.css creado
- [x] AuthContext actualizado con role y status
- [x] `/api/vote` envuelto con rate limiting
- [x] `_app.js` actualizado para usar AuthGate
- [x] RLS policies SQL documentado
- [x] Tests de seguridad creados
- [ ] RLS policies ejecutadas en Supabase (SIGUIENTE PASO)
- [ ] Git push a GitHub
- [ ] Deploy a Vercel
- [ ] Verificación en producción

---

## 🚀 PRÓXIMOS PASOS

### 1. Aplicar RLS Policies en Supabase
```
→ Abrir: https://app.supabase.com/project/*/sql/new
→ Pegar: docs/RLS-SECURITY-POLICIES.sql
→ Ejecutar (Run)
```

### 2. Pruebas locales
```bash
npm run dev
# En otra terminal:
node src/__tests__/test-security.js
```

### 3. Commit y push
```bash
git add .
git commit -m "security: Opción A - AuthGate, RateLimit, RLS"
git push origin main
```

### 4. Deploy aver el

Vercel detectará los cambios y hará auto-deploy. Verificar en:
https://vercel.com/dashboard

---

## 🔍 TROUBLESHOOTING

### "AuthGate muestra acceso denegado"
→ Verificar: Usuario tiene rol correcto en BD?
```sql
SELECT id, role, status FROM app_users WHERE email = 'user@example.com';
```

### "Rate limit no funciona"
→ Verificar: ¿Está usando Authorization header?
```javascript
fetch('/api/vote', {
  headers: { Authorization: `Bearer ${token}` }
})
```

### "RLS bloquea todo"
→ Normal si no es service role. Las políticas rechazan clientes.
Backend (service role) siempre tiene acceso.

---

## 📚 REFERENCIAS

- **AuthGate:** Similar a `control_medico` AuthGate
- **Rate Limiting:** Basado en `control_medico` rateLimit.js
- **RLS Policies:** Documentado en `control_medico` SECURITY-RLS-SUMMARY.md

---

**¿Preguntas?** Revisar `/docs/RLS-SECURITY-POLICIES.sql` para detalles técnicos.
