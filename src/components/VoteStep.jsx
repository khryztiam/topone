import { useState, useEffect, useRef, useCallback } from 'react';
import { useKiosk } from '@/context/KioskContext';
import { supabase } from '@/lib/supabaseClient';
import styles from '@/styles/VoteStep.module.css';

function EmployeeCard({ emp, selected, onClick, onVote, submitting, cardRef }) {
  const [imgSrc, setImgSrc] = useState(emp.photo_url || null);
  const initials = emp.nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div ref={cardRef} className={`${styles.card} ${selected ? styles.cardSelected : ''}`}>
      <button
        className={styles.cardButton}
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
      {selected && (
        <button
          className={styles.btnVoteInline}
          onClick={onVote}
          disabled={submitting}
        >
          {submitting ? 'Enviando...' : '✓ Votar'}
        </button>
      )}
    </div>
  );
}

export default function VoteStep() {
  const { employee: voter, token, setStep, setError, reset } = useKiosk();
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected] = useState(null); // sapid del nominado
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const cardRefs = useRef({});

  const handleSelect = useCallback((sapid) => {
    const next = selected === sapid ? null : sapid;
    setSelected(next);
    // Scroll para que el botón "Votar" quede visible
    if (next && cardRefs.current[next]) {
      setTimeout(() => {
        cardRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
  }, [selected]);

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

  async function handleCancel() {
    setCancelling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch('/api/cancel-vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ token, sapid: voter?.sapid }),
      });
    } catch {
      // Silenciar — el reset limpia todo de todas formas
    } finally {
      setCancelling(false);
      reset();
    }
  }

  if (loading) return <p className={styles.loading}>Cargando empleados...</p>;

  return (
    <div className={styles.container}>
      {/* Saludo con nombre completo */}
      <div className={styles.greeting}>
        <span className={styles.greetingWave}>👋</span>
        <span>¡Hola, <strong>{voter?.nombre}</strong>! Selecciona a tu compañero destacado</span>
      </div>

      {/* Grilla de empleados */}
      <div className={styles.grid}>
        {employees.map((emp) => (
          <EmployeeCard
            key={emp.sapid}
            emp={emp}
            selected={selected === emp.sapid}
            onClick={() => handleSelect(emp.sapid)}
            onVote={handleSubmit}
            submitting={submitting}
            cardRef={(el) => { cardRefs.current[emp.sapid] = el; }}
          />
        ))}
      </div>

      {/* Solo botón cancelar */}
      <div className={styles.actions}>
        <button className={styles.btnCancel} onClick={handleCancel} disabled={submitting || cancelling}>
          {cancelling ? 'Cancelando...' : 'Cancelar votación'}
        </button>
      </div>
    </div>
  );
}
