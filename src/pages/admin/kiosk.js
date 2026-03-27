import AdminLayout from '@/components/AdminLayout';
import styles from '@/styles/admin/KioskPreview.module.css';

/**
 * /admin/kiosk — Vista previa del kiosco de votación embebida dentro del panel admin.
 * Solo visible para rol: admin
 *
 * El kiosco corre en un <iframe> apuntando a la ruta raíz (/). La sesión del iframe
 * es independiente del panel — el admin puede observar el flujo sin interrumpir
 * su sesión de administración.
 */
export default function KioskPreviewPage() {
  return (
    <AdminLayout title="Vista de Votación" requiredRoles={['admin']}>
      <div className={styles.container}>
        <div className={styles.notice}>
          <span className={styles.noticeIcon}>ℹ️</span>
          <span>
            Esta es una vista de solo lectura del kiosco de votación. Para probar el flujo
            completo inicia sesión dentro del iframe con una cuenta de tipo <strong>kiosk</strong>.
          </span>
        </div>

        <div className={styles.deviceFrame}>
          <div className={styles.deviceBar}>
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.deviceUrl}>topone.local / votación</span>
          </div>
          <iframe
            src="/"
            className={styles.iframe}
            title="Kiosco de Votación"
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </div>
      </div>
    </AdminLayout>
  );
}
