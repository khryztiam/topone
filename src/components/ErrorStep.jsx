import { useKiosk } from '@/context/KioskContext';
import styles from '@/styles/ErrorStep.module.css';

export default function ErrorStep() {
  const { error, reset } = useKiosk();

  return (
    <div className={styles.container}>
      <div className={styles.icon}>✕</div>
      <h2>Ocurrió un error</h2>
      <p className={styles.message}>{error}</p>
      <button className={styles.btn} onClick={reset}>
        Volver al inicio
      </button>
    </div>
  );
}
