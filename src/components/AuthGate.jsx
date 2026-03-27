import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import styles from '@/styles/AuthGate.module.css';

// Rutas públicas (sin autenticación necesaria)
const PUBLIC_ROUTES = ['/'];

// Rutas protegidas por rol
const ROLE_ROUTES = {
  admin: ['/votacion', '/admin/dashboard', '/admin/users', '/admin/results', '/admin/lines', '/admin/kiosk'],
  kiosk: ['/votacion'],
};

export default function AuthGate({ children }) {
  const router = useRouter();
  const { user, role, loading, session } = useAuth();
  const [accessDenied, setAccessDenied] = useState(false);
  const [showLoadingSpinner, setShowLoadingSpinner] = useState(true);

  useEffect(() => {
    if (loading) {
      setShowLoadingSpinner(true);
      return;
    }

    setShowLoadingSpinner(false);
    const isPublicRoute = PUBLIC_ROUTES.includes(router.pathname);

    // Sin sesión en ruta protegida → login
    if (!user && !isPublicRoute) {
      router.replace('/');
      return;
    }

    // Con sesión en ruta pública (login) → redirigir al home según rol
    if (user && router.pathname === '/') {
      if (role === 'admin') router.replace('/admin/dashboard');
      else router.replace('/votacion');
      return;
    }

    // Verificar acceso por rol si es una ruta protegida
    if (user && !isPublicRoute) {
      const allowedRoutes = ROLE_ROUTES[role] || ['/'];
      const hasAccess = allowedRoutes.some(route => 
        router.pathname === route || router.pathname.startsWith(route + '/')
      );
      setAccessDenied(!hasAccess);
    }
  }, [user, role, loading, router.pathname]);

  // Mostrar spinner mientras carga
  if (loading || showLoadingSpinner) {
    return (
      <div className={styles.spinner}>
        <div className={styles.spinnerContent}>
          <h2>Validando sesión...</h2>
          <div className={styles.spinnerAnimation}></div>
        </div>
      </div>
    );
  }

  // Acceso denegado por rol
  if (accessDenied) {
    return (
      <div className={styles.accessDenied}>
        <div className={styles.alert}>
          <h1>Acceso Denegado</h1>
          <p>Tu rol no tiene permisos para acceder a esta sección.</p>
          <button 
            className={styles.backBtn}
            onClick={() => router.push('/')}
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  return children;
}
