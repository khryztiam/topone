import { useState, useEffect } from 'react';
import { useKiosk } from '@/context/KioskContext';
import { supabase } from '@/lib/supabaseClient';
import styles from '@/styles/VoteStep.module.css';

function EmployeeCard({ emp, selected, onClick }) {
  const [imgSrc, setImgSrc] = useState(emp.photo_url || null);
  const initials = emp.nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <button
      className={`${styles.card} ${selected ? styles.cardSelected : ''}`}
      onClick={onClick}
      aria-pressed={selected}
    >
      <div className={styles.photoWrap}>
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={emp.nombre}
            className={styles.photo}
            onError={() => setImgSrc(null)}
          />
        ) : (
          <div className={styles.initials}>{initials}</div>
        )}
        {selected && <div className={styles.checkBadge}>✓</div>}
      </div>
      <span className={styles.cardName}>
        {emp.nombre.split(' ').slice(0, 2).join(' ')}
      </span>
    </button>
  );
}

export default function VoteStep() {
  const { token, setStep, setError, reset } = useKiosk();
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected] = useState(null); // sapid del nominado
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadEmployees() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch('/api/employees/line', {
          headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
        });
        const d = await res.json();
        setEmployees(d.employees || []);
      } catch {
        setError('No se pudo cargar la lista de empleados');
      } finally {
        setLoading(false);
      }
    }
    loadEmployees();
  }, [setError]);

  const selectedEmployee = employees.find((e) => e.sapid === selected) || null;

  async function handleSubmit() {
    if (!selected) return;
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ token, nominated_sapid: selected }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al registrar votos');
        return;
      }
      setStep('success');
    } catch {
      setError('Error de conexión al enviar votos');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className={styles.loading}>Cargando empleados...</p>;

  return (
    <div className={styles.container}>
      {/* Banner de selección */}
      <div className={`${styles.selectionBanner} ${selectedEmployee ? styles.bannerActive : ''}`}>
        {selectedEmployee ? (
          <>
            <span className={styles.bannerLabel}>Tu nominado:</span>
            <strong className={styles.bannerName}>
              {selectedEmployee.nombre.split(' ').slice(0, 2).join(' ')}
            </strong>
            <span className={styles.bannerHint}>Confirma abajo o cambia tu selección</span>
          </>
        ) : (
          <span className={styles.bannerPlaceholder}>
            Toca la foto del compañero que quieres nominar
          </span>
        )}
      </div>

      {/* Grilla de empleados */}
      <div className={styles.grid}>
        {employees.map((emp) => (
          <EmployeeCard
            key={emp.sapid}
            emp={emp}
            selected={selected === emp.sapid}
            onClick={() => setSelected(emp.sapid)}
          />
        ))}
      </div>

      {/* Acciones */}
      <div className={styles.actions}>
        <button
          className={styles.btnSubmit}
          onClick={handleSubmit}
          disabled={!selected || submitting}
        >
          {submitting ? 'Enviando...' : 'Confirmar nominación'}
        </button>
        <button className={styles.btnCancel} onClick={reset} disabled={submitting}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
