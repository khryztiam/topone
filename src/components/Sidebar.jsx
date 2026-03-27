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
          ⏻
        </button>
      </div>
    </aside>
  );
}
