import { KioskProvider } from '@/context/KioskContext';
import { AuthProvider } from '@/context/AuthContext';
import AuthGate from '@/components/AuthGate';
import '@/styles/globals.css';

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <AuthGate>
        <KioskProvider>
          <Component {...pageProps} />
        </KioskProvider>
      </AuthGate>
    </AuthProvider>
  );
}
