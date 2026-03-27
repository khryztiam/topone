import styles from '@/styles/admin/UserStatsCards.module.css';

const ROLES = ['admin', 'kiosk', 'rrhh', 'suprrhh'];

const ROLE_LABELS = {
  admin: 'Admin',
  kiosk: 'Kiosco',
  rrhh: 'RRHH',
  suprrhh: 'Sup. RRHH',
};

export default function UserStatsCards({ users }) {
  const total = users.length;
  const active = users.filter((u) => u.active).length;

  return (
    <div className={styles.grid}>
      <div className={styles.card}>
        <span className={styles.label}>Total usuarios</span>
        <span className={styles.value}>{total}</span>
      </div>
      <div className={styles.card}>
        <span className={styles.label}>Activos</span>
        <span className={`${styles.value} ${styles.green}`}>{active}</span>
      </div>
      {ROLES.map((role) => (
        <div key={role} className={styles.card}>
          <span className={styles.label}>{ROLE_LABELS[role]}</span>
          <span className={styles.value}>
            {users.filter((u) => u.role === role).length}
          </span>
        </div>
      ))}
    </div>
  );
}
