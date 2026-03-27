import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';

const AuthContext = createContext(null);

// Rutas que no requieren autenticación
const PUBLIC_ROUTES = ['/'];
// Rutas exclusivas del kiosco (sin sidebar, sin rol admin requerido)
const KIOSK_ROUTES = ['/votacion'];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // datos de Supabase Auth
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);       // 'admin' o 'kiosk'
  const [status, setStatus] = useState(null);   // 'active' o 'inactive'
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Cargar sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchAppUser(session);
      else setLoading(false);
    });

    // Escuchar cambios de sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        if (session) {
          await fetchAppUser(session);
        } else {
          setUser(null);
          setRole(null);
          setStatus(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function fetchAppUser(session) {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        throw new Error('Failed to fetch user data');
      }
      const data = await res.json();
      
      if (data.user) {
        setUser(data.user);
        setRole(data.user.role || 'kiosk');
        setStatus(data.user.status || 'active');
        
        // ⚠️ CRÍTICO: Si usuario no está activo, hacer logout
        if (data.user.status === 'inactive') {
          console.warn('[Auth] Usuario inactivo detectado, haciendo logout');
          await supabase.auth.signOut();
          setUser(null);
          setRole(null);
          setStatus(null);
        }
      } else {
        setUser(null);
        setRole(null);
        setStatus(null);
      }
    } catch (err) {
      console.error('[Auth] Error fetching user:', err);
      setUser(null);
      setRole(null);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    setStatus(null);
    router.push('/');
  }

  // Protección de rutas
  useEffect(() => {
    if (loading) return;

    const path = router.pathname;
    const isPublic = PUBLIC_ROUTES.includes(path);

    if (!session && !isPublic) {
      router.push('/');
      return;
    }

    if (session && user && isPublic) {
      // Redirigir según rol después del login
      if (role === 'admin') router.push('/admin/dashboard');
      else router.push('/votacion');
    }
  }, [session, user, role, loading, router.pathname]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      role,
      status,
      loading, 
      signIn, 
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
