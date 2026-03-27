import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/AdminLayout';
import UserStatsCards from '@/components/admin/UserStatsCards';
import UserTable from '@/components/admin/UserTable';
import UserFormModal from '@/components/admin/UserFormModal';
import styles from '@/styles/admin/UsersPage.module.css';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null = crear, objeto = editar

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setUsers(data.users || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  function openCreate() {
    setEditingUser(null);
    setModalOpen(true);
  }

  function openEdit(user) {
    setEditingUser(user);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingUser(null);
  }

  async function handleDelete(user) {
    if (!confirm(`¿Eliminar al usuario ${user.full_name || user.email}? Esta acción no se puede deshacer.`)) return;

    await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
    fetchUsers();
  }

  async function handleSaved() {
    closeModal();
    fetchUsers();
  }

  return (
    <AdminLayout title="Usuarios" requiredRoles={['admin']}>
      <div className={styles.toolbar}>
        <p className={styles.count}>{users.length} usuarios registrados</p>
        <button className={styles.btnNew} onClick={openCreate}>
          + Nuevo usuario
        </button>
      </div>

      <UserStatsCards users={users} />

      <div className={styles.tableWrapper}>
        {loading ? (
          <p className={styles.loading}>Cargando usuarios...</p>
        ) : (
          <UserTable users={users} onEdit={openEdit} onDelete={handleDelete} />
        )}
      </div>

      {modalOpen && (
        <UserFormModal
          user={editingUser}
          onSaved={handleSaved}
          onClose={closeModal}
        />
      )}
    </AdminLayout>
  );
}
