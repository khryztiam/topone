import { KioskProvider } from '@/context/KioskContext';
import { AuthProvider } from '@/context/AuthContext';
import '@/styles/globals.css';

const KIOSK_INFO = {
  kiosk_user_id: process.env.NEXT_PUBLIC_KIOSK_USER_ID || 'demo-kiosk-l15',
  cod_linea: parseInt(process.env.NEXT_PUBLIC_KIOSK_COD_LINEA || '33465'),
  linea: process.env.NEXT_PUBLIC_KIOSK_LINEA || 'LINEA 15 D2-2',
};

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <KioskProvider kioskInfo={KIOSK_INFO}>
        <Component {...pageProps} />
      </KioskProvider>
    </AuthProvider>
  );
}
