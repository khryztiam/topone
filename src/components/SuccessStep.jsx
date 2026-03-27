import { useEffect } from 'react';
import { useKiosk } from '@/context/KioskContext';
import styles from '@/styles/SuccessStep.module.css';

const AUTO_RESET_MS = 8000;

export default function SuccessStep() {
  const { reset } = useKiosk();

  // Auto-reset después de 8 segundos para el siguiente votante
  useEffect(() => {
    const timer = setTimeout(reset, AUTO_RESET_MS);
    return () => clearTimeout(timer);
  }, [reset]);

  return (
    <div className={styles.container}>
      <div className={styles.icon}>✓</div>
      <h2>¡Gracias por participar!</h2>
      <p>Tu voto fue registrado de forma anónima.</p>
      <p className={styles.hint}>Esta pantalla se reiniciará automáticamente...</p>
      <button className={styles.btn} onClick={reset}>
        Volver al inicio
      </button>
    </div>
  );
}
