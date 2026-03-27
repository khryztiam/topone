import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/context/AuthContext';
import styles from '@/styles/AdminLayout.module.css';

export default function AdminLayout({ children, title, requiredRoles }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    // Kiosk never accesses admin pages
    if (user?.role === 'kiosk') { router.push('/'); return; }
    // Page-level role guard
    if (requiredRoles && user && !requiredRoles.includes(user.role)) {
      router.push('/admin/dashboard');
    }
  }, [loading, user, router, requiredRoles]);

  if (loading) {
    return (
      <div className={styles.loadingPage}>
        <span>Cargando...</span>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <Sidebar />
      <div className={styles.main}>
        {title && (
          <header className={styles.header}>
            <h1>{title}</h1>
          </header>
        )}
        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
}
