import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import AppLogo from '@/components/AppLogo';
import styles from '@/styles/Sidebar.module.css';

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard',  icon: '⊞',   roles: ['admin', 'rrhh', 'suprrhh'] },
  { href: '/admin/users',     label: 'Usuarios',   icon: '👥',  roles: ['admin'] },
  { href: '/admin/lines',     label: 'Líneas',     icon: '🏭',  roles: ['admin', 'suprrhh'] },
  { href: '/admin/results',   label: 'Resultados', icon: '📊',  roles: ['admin', 'suprrhh'] },
  { href: '/admin/kiosk',     label: 'Votación',   icon: '🗳️', roles: ['admin'] },
];

export default function Sidebar() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(user?.role)
  );

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <AppLogo size={36} showText={true} textDark={false} />
      </div>

      <nav className={styles.nav}>
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${router.pathname === item.href ? styles.active : ''}`}
          >
            <span className={styles.icon}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className={styles.footer}>
        <div className={styles.userInfo}>
          <p className={styles.userName}>{user?.full_name || user?.email}</p>
          <span className={styles.userRole}>{user?.role}</span>
        </div>
        <button className={styles.signOut} onClick={signOut} title="Cerrar sesión">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </aside>
  );
}
