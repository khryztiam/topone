import { useState, useEffect } from 'react';
import { USER_DOMAIN } from '@/lib/constants';
import styles from '@/styles/admin/UserFormModal.module.css';

const ROLES = [
  { value: 'admin',   label: 'Administrador' },
  { value: 'kiosk',   label: 'Kiosco' },
  { value: 'rrhh',    label: 'RRHH' },
  { value: 'suprrhh', label: 'Supervisor RRHH' },
];

// Roles que requieren línea asignada
const REQUIRES_LINE = ['kiosk'];

export default function UserFormModal({ user, onSaved, onClose }) {
  const isEditing = !!user;

  // Al editar, extraer usuario sin dominio para mostrarlo en el campo
  const usernameFromEmail = user?.email?.replace(USER_DOMAIN, '') || '';

  const [username, setUsername] = useState(usernameFromEmail);
  const [form, setForm] = useState({
    email: user?.email || '',
    password: '',
    full_name: user?.full_name || '',
    role: user?.role || 'kiosk',
    cod_linea: user?.cod_linea || '',
    linea: user?.linea || '',
    active: user?.active ?? true,
  });

  const [lineas, setLineas] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/lineas')
      .then((r) => r.json())
      .then((d) => setLineas(d.lineas || []));
  }, []);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  function handleLineaChange(e) {
    const selected = lineas.find((l) => String(l.cod_linea) === e.target.value);
    setForm((prev) => ({
      ...prev,
      cod_linea: selected?.cod_linea || '',
      linea: selected?.nombre || '',
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const fullEmail = `${username.trim()}${USER_DOMAIN}`;
      const payload = { ...form, email: fullEmail };
      if (!payload.password && !isEditing) {
        setError('La contraseña es requerida para nuevos usuarios');
        return;
      }
      if (!payload.password) delete payload.password;

      const url = isEditing ? `/api/admin/users/${user.id}` : '/api/admin/users';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al guardar');
        return;
      }

      onSaved();
    } catch {
      setError('Error de conexión');
    } finally {
      setSaving(false);
    }
  }

  const needsLine = REQUIRES_LINE.includes(form.role);

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>{isEditing ? 'Editar usuario' : 'Nuevo usuario'}</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.row}>
            <div className={styles.field}>
              <label>Nombre completo</label>
              <input name="full_name" value={form.full_name} onChange={handleChange} placeholder="Nombre Apellido" />
            </div>
            <div className={styles.field}>
              <label>Rol *</label>
              <select name="role" value={form.role} onChange={handleChange} required>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Usuario *</label>
              <div className={styles.inputDomain}>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={isEditing}
                  placeholder="nombre.apellido"
                />
                <span className={styles.domain}>{USER_DOMAIN}</span>
              </div>
            </div>
            {!isEditing && (
              <div className={styles.field}>
                <label>Contraseña *</label>
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Mínimo 8 caracteres"
                  minLength={8}
                />
              </div>
            )}
          </div>

          {needsLine && (
            <div className={styles.field}>
              <label>Línea asignada *</label>
              <select
                value={String(form.cod_linea)}
                onChange={handleLineaChange}
                required={needsLine}
              >
                <option value="">Seleccionar línea...</option>
                {lineas.map((l) => (
                  <option key={l.cod_linea} value={String(l.cod_linea)}>
                    {l.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isEditing && (
            <div className={styles.checkRow}>
              <input
                id="active"
                name="active"
                type="checkbox"
                checked={form.active}
                onChange={handleChange}
              />
              <label htmlFor="active">Usuario activo</label>
            </div>
          )}

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnCancel} onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className={styles.btnSave} disabled={saving}>
              {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
