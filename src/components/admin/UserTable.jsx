import styles from '@/styles/admin/UserTable.module.css';

const ROLE_BADGE = {
  admin:    { label: 'Admin',      color: 'purple' },
  kiosk:    { label: 'Kiosco',     color: 'blue'   },
  rrhh:     { label: 'RRHH',       color: 'orange' },
  suprrhh:  { label: 'Sup. RRHH',  color: 'teal'   },
};

export default function UserTable({ users, onEdit, onDelete }) {
  if (!users.length) {
    return <p className={styles.empty}>No hay usuarios registrados.</p>;
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Correo</th>
          <th>Rol</th>
          <th>Línea</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => {
          const badge = ROLE_BADGE[user.role] || { label: user.role, color: 'gray' };
          return (
            <tr key={user.id}>
              <td className={styles.name}>{user.full_name || '—'}</td>
              <td className={styles.email}>{user.email}</td>
              <td>
                <span className={`${styles.badge} ${styles[badge.color]}`}>
                  {badge.label}
                </span>
              </td>
              <td className={styles.linea}>{user.linea || '—'}</td>
              <td>
                <span className={`${styles.status} ${user.active ? styles.active : styles.inactive}`}>
                  {user.active ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td className={styles.actions}>
                <button className={styles.btnEdit} onClick={() => onEdit(user)}>
                  Editar
                </button>
                <button className={styles.btnDelete} onClick={() => onDelete(user)}>
                  Eliminar
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
