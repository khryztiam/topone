import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/AdminLayout';
import styles from '@/styles/admin/LinesPage.module.css';

function LineModal({ line, onClose, onSaved }) {
  const isEdit = !!line;
  const [nombre, setNombre] = useState(line?.nombre || '');
  const [codLinea, setCodLinea] = useState(line?.cod_linea || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await fetch(
        isEdit
          ? `/api/admin/lines/${line.cod_linea}`
          : '/api/admin/lines',
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cod_linea: codLinea, nombre }),
        }
      );
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al guardar'); return; }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>{isEdit ? 'Editar Línea' : 'Nueva Línea'}</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <p className={styles.error}>{error}</p>}
          {!isEdit && (
            <div className={styles.field}>
              <label className={styles.label}>Código de Línea</label>
              <input
                className={styles.input}
                type="number"
                min="1"
                value={codLinea}
                onChange={(e) => setCodLinea(e.target.value)}
                required
                placeholder="Ej: 24"
              />
            </div>
          )}
          {isEdit && (
            <div className={styles.field}>
              <label className={styles.label}>Código de Línea</label>
              <input className={styles.input} value={codLinea} disabled />
            </div>
          )}
          <div className={styles.field}>
            <label className={styles.label}>Nombre</label>
            <input
              className={styles.input}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              placeholder="Ej: LINEA 24 D2-4"
            />
          </div>
          <div className={styles.formActions}>
            <button type="button" className={styles.btnCancel} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className={styles.btnSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LinesPage() {
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLine, setEditingLine] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const fetchLines = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/lines');
      const data = await res.json();
      setLines(data.lines || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLines(); }, [fetchLines]);

  function openCreate() { setEditingLine(null); setModalOpen(true); }
  function openEdit(line) { setEditingLine(line); setModalOpen(true); }
  function closeModal() { setModalOpen(false); setEditingLine(null); }

  function handleSaved() {
    closeModal();
    fetchLines();
  }

  async function handleDelete(line) {
    setDeleteError('');
    if (!confirm(`¿Eliminar "${line.nombre}"? Esta acción no se puede deshacer.`)) return;
    const res = await fetch(`/api/admin/lines/${line.cod_linea}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { setDeleteError(data.error || 'Error al eliminar'); return; }
    fetchLines();
  }

  const totalEmployees = lines.reduce((s, l) => s + l.employee_count, 0);

  return (
    <AdminLayout title="Líneas de Producción" requiredRoles={['admin', 'suprrhh']}>
      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Líneas</span>
          <span className={styles.statValue}>{lines.length}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Empleados</span>
          <span className={styles.statValue}>{totalEmployees}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Con Empleados</span>
          <span className={styles.statValue}>{lines.filter((l) => l.employee_count > 0).length}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Sin Empleados</span>
          <span className={styles.statValue}>{lines.filter((l) => l.employee_count === 0).length}</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <span className={styles.count}>{lines.length} líneas registradas</span>
        <button className={styles.btnNew} onClick={openCreate}>
          + Nueva Línea
        </button>
      </div>

      {deleteError && <p className={styles.error} style={{ marginBottom: '1rem' }}>{deleteError}</p>}

      {loading ? (
        <p className={styles.loading}>Cargando...</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Empleados activos</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.cod_linea}>
                  <td><span className={styles.codBadge}>{line.cod_linea}</span></td>
                  <td>{line.nombre}</td>
                  <td>
                    <span className={line.employee_count > 0 ? styles.empCount : styles.empZero}>
                      {line.employee_count}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button className={styles.btnEdit} onClick={() => openEdit(line)}>
                        Editar
                      </button>
                      <button className={styles.btnDel} onClick={() => handleDelete(line)}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <LineModal line={editingLine} onClose={closeModal} onSaved={handleSaved} />
      )}
    </AdminLayout>
  );
}
