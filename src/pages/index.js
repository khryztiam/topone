import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { USER_DOMAIN } from '@/lib/constants';
import AppLogo from '@/components/AppLogo';
import styles from '@/styles/Login.module.css';

const TABS = [
  { key: 'user',  label: 'Kiosko / RRHH' },
  { key: 'admin', label: 'Administrador' },
];

export default function LoginPage() {
  const { signIn } = useAuth();
  const [tab, setTab] = useState('user');
  const [username, setUsername] = useState(''); // solo para tab 'user'
  const [adminEmail, setAdminEmail] = useState(''); // solo para tab 'admin'
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function switchTab(key) {
    setTab(key);
    setError('');
    setUsername('');
    setAdminEmail('');
    setPassword('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const email = tab === 'admin' ? adminEmail : `${username.trim()}${USER_DOMAIN}`;
      await signIn(email, password);
    } catch {
      setError('Credenciales incorrectas. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoWrapper}>
          <AppLogo size={56} />
        </div>
        <h1>Top<span className={styles.titleOne}>One</span></h1>
        <p className={styles.subtitle}>Sistema de Votación al Mejor Empleado</p>

        {/* Tabs */}
        <div className={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
              onClick={() => switchTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {tab === 'user' ? (
            <div className={styles.field}>
              <label htmlFor="username">Usuario</label>
              <div className={styles.inputDomain}>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Usuario"
                  required
                  autoFocus
                  disabled={loading}
                  autoComplete="username"
                />
                <span className={styles.domain}>{USER_DOMAIN}</span>
              </div>
            </div>
          ) : (
            <div className={styles.field}>
              <label htmlFor="adminEmail">Correo electrónico</label>
              <input
                id="adminEmail"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="Email"
                required
                autoFocus
                disabled={loading}
                autoComplete="email"
              />
            </div>
          )}

          <div className={styles.field}>
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
