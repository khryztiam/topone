import Image from 'next/image';
import { useKiosk } from '@/context/KioskContext';
import styles from '@/styles/ConfirmEmployeeStep.module.css';

export default function ConfirmEmployeeStep() {
  const { employee, setStep, reset } = useKiosk();

  return (
    <div className={styles.container}>
      <h2>¿Eres tú?</h2>

      <div className={styles.card}>
        <div className={styles.avatarWrapper}>
          <Image
            src={employee.photo_url}
            alt={employee.nombre}
            width={120}
            height={120}
            className={styles.avatar}
            onError={(e) => { e.target.src = '/avatar-placeholder.png'; }}
          />
        </div>
        <p className={styles.nombre}>{employee.nombre}</p>
        <p className={styles.sapid}>SAPID: {employee.sapid}</p>
        <p className={styles.linea}>{employee.linea}</p>
      </div>

      <div className={styles.actions}>
        <button className={styles.btnConfirm} onClick={() => setStep('vote')}>
          Sí, soy yo — Continuar
        </button>
        <button className={styles.btnCancel} onClick={reset}>
          No soy yo — Cancelar
        </button>
      </div>
    </div>
  );
}
