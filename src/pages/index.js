import { useKiosk } from '@/context/KioskContext';
import { useAuth } from '@/context/AuthContext';
import ScanStep from '@/components/ScanStep';
import ConfirmEmployeeStep from '@/components/ConfirmEmployeeStep';
import VoteStep from '@/components/VoteStep';
import SuccessStep from '@/components/SuccessStep';
import ErrorStep from '@/components/ErrorStep';
import styles from '@/styles/Kiosk.module.css';

export default function Home() {
  const { step, kioskInfo } = useKiosk();
  const { signOut } = useAuth();
  const isVoteStep = step === 'vote';

  return (
    <main className={styles.kiosk}>
      <header className={styles.header}>
        <h1>Top<span style={{ color: 'var(--color-gold)' }}>One</span></h1>
        <div className={styles.headerRight}>
          <span className={styles.linea}>{kioskInfo.linea}</span>
          <button className={styles.logoutBtn} onClick={signOut} title="Cerrar sesión">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Salir
          </button>
        </div>
      </header>

      <section className={isVoteStep ? styles.contentFull : styles.content}>
        {step === 'scan' && <ScanStep />}
        {step === 'confirm_employee' && <ConfirmEmployeeStep />}
        {step === 'vote' && <VoteStep />}
        {step === 'success' && <SuccessStep />}
        {step === 'error' && <ErrorStep />}
      </section>
    </main>
  );
}
