# 📦 Guía de Despliegue en Producción

Instrucciones y checklist para desplegar TopOne en producción.

---

## 📋 Checklist Pre-Producción

### Código
- [ ] Código revisado (pull request aprobada)
- [ ] `main` branch está limpio
- [ ] No hay `console.log()` de debug
- [ ] `.env.local` NO está en git
- [ ] No hay secretos hardcodeados
- [ ] Lint pasa sin errores

### Seguridad
- [ ] RLS policies activas en Supabase
- [ ] Service keys NO expuestas en client
- [ ] HTTPS habilitado
- [ ] Rate limiting en API endpoints

### Base de Datos
- [ ] `schema.sql` ejecutado en Supabase producción
- [ ] Usuarios admin creados
- [ ] Backup automático configurado
- [ ] Storage bucket `avatares` creado

### Testing
- [ ] Login funciona (kiosk y admin)
- [ ] Flujo de votación sin errores
- [ ] Results dashboard accesible
- [ ] No hay console errors

---

## 🚀 Deploy en Vercel (Recomendado)

### Pasos

1. **Crear cuenta** en [vercel.com](https://vercel.com)
2. **Conectar GitHub** → Autorizar repositorio
3. **Import Project** → Seleccionar `topone`
4. **Configurar Environment Variables**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_KEY=eyJ...
   ```
5. **Deploy** → URL en vivo

### CI/CD Automático

- Cada `push` a `main` → auto deploy
- Cada `pull request` → preview URL
- Rollback automático si hay errors

---

## 🗄️ Setup de Supabase Producción

1. [supabase.com](https://supabase.com) → **New Project**
2. Ejecutar `schema.sql` en SQL Editor
3. Crear usuario admin vía SQL
4. Crear Storage bucket `avatares` → carpeta `santa_ana`
5. Configurar backup automático

---

## 🔄 Post-Deploy Verification

### Health Checks

```bash
# Verificar que app carga
curl https://topone.vercel.app

# Ir a página login
https://topone.vercel.app/login
```

### Funcionalidad End-to-End

1. **Login Admin** → Dashboard accesible
2. **Importar Empleados** → Verificar en DB
3. **Login Kiosk** → Votación funciona
4. **Ver Resultados** → No hay leakage de privacidad

---

## 📊 Monitoreo Continuo

- **Vercel Logs** — Errores y performance
- **Supabase Console** — Query performance, storage
- **Alertas configuradas** — 5xx errors, database down

---

## 🔐 Security Post-Deploy

- [ ] HTTPS activo
- [ ] Passwords hasheados
- [ ] Access logs monitoreados
- [ ] Secrets rotados cada 6 meses

---

## 🚨 Incident Response

Si hay problema en producción:

1. **Primeras 5 min** — Acuerdo del problema, notificar
2. **30 min** — Root cause analysis, implement fix
3. **Long term** — Post mortem, prevenir futuros

---

## ✅ Checklist Final

- [ ] Deploy exitoso sin errores
- [ ] Todas las features funcionan
- [ ] Seguridad verificada
- [ ] Backup configurado
- [ ] Monitoring activo
- [ ] Status page live
- [ ] Support channel establecido

---

**Versión:** 1.0  
**Última actualización:** Marzo 2026
