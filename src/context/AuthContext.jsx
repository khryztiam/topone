import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';

const AuthContext = createContext(null);

// Rutas que no requieren autenticación
const PUBLIC_ROUTES = ['/login'];
// Rutas exclusivas del kiosco (sin sidebar, sin rol admin requerido)
const KIOSK_ROUTES = ['/'];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);     // datos de app_users
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Cargar sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchAppUser(session.access_token);
      else setLoading(false);
    });

    // Escuchar cambios de sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        if (session) {
          await fetchAppUser(session.access_token);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function fetchAppUser(accessToken) {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        setUser(null);
        return;
      }
      const data = await res.json();
      if (data.user) setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  // Protección de rutas
  useEffect(() => {
    if (loading) return;

    const path = router.pathname;
    const isPublic = PUBLIC_ROUTES.includes(path);
    const isKiosk = KIOSK_ROUTES.includes(path);

    if (!session && !isPublic) {
      router.push('/login');
      return;
    }

    if (session && user && isPublic) {
      // Redirigir según rol después del login
      if (user.role === 'kiosk') router.push('/');
      else router.push('/admin/dashboard');
    }
  }, [session, user, loading, router.pathname]);

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
