# 🤝 Guía de Contribución

¡Gracias por tu interés en contribuir a **TopOne**! Esta guía te ayudará a entender cómo colaborar con el proyecto.

---

## 📋 Código de Conducta

Este proyecto adhiere a un código de conducta de respeto y profesionalismo:
- Sé respetuoso con otros contribuidores
- Proporciona feedback constructivo
- Respeta la privacidad y seguridad del proyecto
- No compartas datos sensibles en issues o PRs

---

## 🐛 Reportar Bugs

Antes de reportar un bug:
1. **Verifica que el bug no esté ya reportado** — Busca en [Issues](https://github.com/khryztiam/topone/issues)
2. **Verifica que es reproducible** — En tu ambiente local
3. **Recopila información** — Stack trace, pasos, ambiente

### Formato de Reporte

```markdown
**Descripción**
Descripción clara y concisa del problema.

**Pasos para Reproducir**
1. Ir a...
2. Hacer clic en...
3. Observar error

**Comportamiento Esperado**
Qué debería suceder.

**Ambiente**
- OS: Windows 11 / macOS 14 / Ubuntu 22.04
- Node.js: 18.x
- Navegador: Chrome 120

**Logs/Stack Trace**
```
Error: Mensaje aquí
  at Function (file.js:10:5)
```
```

---

## ✨ Solicitar Features

¿Tienes una idea para mejorar TopOne?

1. **Verifica que no exista** — Busca en [Issues](https://github.com/khryztiam/topone/issues)
2. **Describe la necesidad** — Por qué es importante
3. **Proporciona ejemplos** — Cómo debería funcionar

### Formato de Feature Request

```markdown
**Descripción**
Qué queremos lograr y por qué.

**Caso de Uso**
Cuándo y cómo se usaría esta feature.

**Solución Propuesta**
Cómo crees que debería implementarse.

**Alternativas Consideradas**
Otras formas de resolver esto.
```

---

## 🔧 Desarrollo Local

### Configurar Ambiente

```bash
# 1. Clonar repo
git clone https://github.com/khryztiam/topone.git
cd topone

# 2. Instalar dependencias
npm install

# 3. Crear .env.local (ver .env.example)
cp .env.example .env.local
# Llenar con tus credenciales Supabase

# 4. Ejecutar en desarrollo
npm run dev

# 5. Abrir en navegador
open http://localhost:3000
```

### Estructura para Desarrollo

```
topone/
├── src/components/    ← Nuevos componentes aquí
├── src/pages/         ← Nuevas rutas/páginas
├── src/styles/        ← CSS Modules por componente
├── src/context/       ← Estado global (si necesitas)
└── src/lib/           ← Utilidades, helpers
```

---

## 💡 Antes de Hacer un PR

### Checklist

- [ ] Mi rama está actualizada con `main`
- [ ] He ejecutado `npm run lint` sin errores
- [ ] Mis cambios siguen la estructura del proyecto
- [ ] He testeado manualmente en desarrollo
- [ ] He documentado cambios en componentes/APIs nuevos
- [ ] He chequeado privacidad/seguridad (esp. en votación)
- [ ] No incluyo datos sensibles (credenciales, fotos reales)

---

## 📤 Crear un Pull Request

### Pasos

1. **Crear una rama descriptiva**
   ```bash
   git checkout -b feature/descripcion-clara
   # o
   git checkout -b fix/descripcion-del-bug
   ```

2. **Hacer tus cambios**
   - Commits pequeños y atómicos
   - Mensajes de commit claros en inglés/español

3. **Push a tu fork**
   ```bash
   git push origin feature/descripcion-clara
   ```

4. **Abrir PR en GitHub**
   - Título descriptivo
   - Descripción detallada (ver template abajo)
   - Linkar issue relacionado (si existe)

### Template de PR

```markdown
## Descripción
Qué cambios introduces y por qué.

## Tipo de Cambio
- [ ] Bug fix
- [ ] Nueva feature
- [ ] Breaking change
- [ ] Mejora de documentación

## Issue Relacionado
Cierra #123 (si aplica)

## Testing
Cómo testeaste estos cambios.

## Screenshots
Si hay cambios visuales.

## Notas Adicionales
Cualquier contexto importante.
```

---

## 🧪 Testing

### Ejecutar Tests (si aplica)
```bash
npm run test
```

### Testing Manual Importante

**Para cambios en votación:**
- [ ] Login kiosk funciona
- [ ] Votación completada sin errores
- [ ] Vote registry registrado correctamente
- [ ] Anonymous results aislados

**Para cambios en admin:**
- [ ] Usuarios CRUD funciona
- [ ] Importación de empleados sin errores
- [ ] Permisos por rol respetados

---

## 📝 Documentación

### Si agregás features nuevas:

1. **Actualizar README.md** si es relevante
2. **Agregar JSDoc a funciones complejas**
3. **Documentar nuevas APIs en `src/pages/api/`**
4. **Actualizar ARCHITECTURE.md si cambia diseño**

Ejemplo de JSDoc:
```javascript
/**
 * Procesa un voto anónimo
 * @param {Object} voteData - Datos del voto
 * @param {string} voteData.categoria - Categoría (Encintado, etc.)
 * @param {string} voteData.nominated_sapid - SAP ID nominado
 * @returns {Promise<{success: boolean, message: string}>}
 * @throws {Error} Si hay validación fallida
 */
export async function submitVote(voteData) {
  // implementación
}
```

---

## 🔒 Consideraciones de Seguridad

TopOne maneja **datos sensibles de votación**. Cuando contribuyas:

### ✅ DO:
- Revisar RLS policies si cambias BD
- Nunca loguear datos sensibles
- Usar variables de entorno para secretos
- Validar/sanitizar inputs en API Routes
- Testar privacidad: verificar que votes no son trackeables

### ❌ DON'T:
- Exponer `SUPABASE_SERVICE_KEY` en client-side
- Crear FKs entre `vote_registry` y `anonymous_results`
- Logguear SAP IDs, emails, o estructura de votos
- Commitar `.env.local` u otros secretos
- Cambiar el modelo de privacidad sin consenso

---

## 🎨 Estándares de Código

### JavaScript/React

```javascript
// ✅ Nombres descriptivos
function calculateVotingPercentage(votesCast, totalEmployees) {
  return (votesCast / totalEmployees) * 100;
}

// ✅ Componentes funcionales con hooks
export default function UserCard({ user, onEdit }) {
  const [isLoading, setIsLoading] = useState(false);
  // ...
}

// ❌ Evitar var, usar const/let
// ❌ Valores magic numbers sin explicación
// ❌ Componentes class innecesarios
```

### CSS

```css
/* ✅ CSS Modules por componente */
/* Dashboard.module.css */
.dashboardContainer { /* ... */ }
.cardTitle { /* ... */ }

/* ✅ BEM cuando sea necesario */
.userTable__header { /* ... */ }
.userTable__row--selected { /* ... */ }

/* ❌ Estilos globales que solapen */
/* ❌ !important sin justificación */
```

---

## 📊 Commit Messages

Usa mensajes claros:

```bash
# ✅ Bueno
git commit -m "feat: agregar drag-n-drop en carga de empleados"
git commit -m "fix: corregir privacidad en vote_registry"
git commit -m "docs: actualizar ARCHITECTURE.md con RLS"

# ❌ Evitar
git commit -m "fix"
git commit -m "cambios varios"
git commit -m "update"
```

**Formato sugerido:**
```
<tipo>(<scope>): <asunto>

<cuerpo adicional si es necesario>
```

Tipos: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

---

## 🚀 Deployment

Una vez que tu PR es aprobado y mergeado a `main`:

1. **GitHub Action** construye y testea automáticamente
2. **Preview deploy** en Vercel
3. **Production deploy** automático si todo pasa

No necesitas hacer nada — es automático.

---

## 🙋 Ayuda y Preguntas

Si tienes dudas:
- 💬 Pregunta en el Pull Request
- 🎫 Abre una Discussion en GitHub
- 📧 Contacta al equipo (si tienes acceso)

---

## 🎓 Aprendiendo el Proyecto

### Archivos Clave para Empezar

1. **[../ARCHITECTURE.md](../ARCHITECTURE.md)** — Stack y decisiones técnicas
2. **[../schema.sql](../schema.sql)** — Modelo de datos con RLS
3. **[../src/context/KioskContext.jsx](../src/context/KioskContext.jsx)** — Flujo de votación
4. **[../src/pages/api/vote.js](../src/pages/api/vote.js)** — Lógica de backend

---

## 🙏 Gracias

Gracias por mejorar TopOne. Tu contribución es valiosa para la comunidad.

**¡Esperamos tu PR! 🚀**
