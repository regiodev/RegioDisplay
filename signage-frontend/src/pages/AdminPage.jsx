// Cale fișier: src/pages/AdminPage.jsx
import { useState, useEffect } from 'react';
import apiClient from '../api/axios';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import EditUserModal from '../components/EditUserModal';
import { useAuth } from '../contexts/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

function AdminPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/users');
      setUsers(response.data);
    } catch (err) {
      setError('Nu s-au putut încărca utilizatorii.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const confirmDelete = async () => {
    if (!deletingUser) return;
    try {
      await apiClient.delete(`/admin/users/${deletingUser.id}`);
      toast({ title: "Succes!", description: `Utilizatorul ${deletingUser.username} a fost șters.` });
      setDeletingUser(null);
      fetchUsers();
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'A apărut o eroare la ștergere.';
      toast({ variant: "destructive", title: "Eroare", description: errorMessage });
    }
  };

  if (loading) return <p>Se încarcă utilizatorii...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-200">Management Utilizatori</h1>
      
      {/* --- MODIFICARE: Adăugat container pentru overflow pe mobil --- */}
      <div className="mt-6 bg-white dark:bg-slate-900 shadow rounded-lg overflow-x-auto">
        <table className="min-w-full">
          {/* --- MODIFICARE: Ascuns thead pe mobil --- */}
          <thead className="hidden md:table-header-group bg-gray-50 dark:bg-slate-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilizator</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ultima Conectare</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-1/3">Utilizare Spațiu</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acțiuni</th>
            </tr>
          </thead>
          {/* --- MODIFICARE: Adăugat clasa 'responsive-table' și clasele de layout --- */}
          <tbody className="responsive-table block md:table-row-group">
            {users.map((user) => (
              <tr key={user.id} className="block md:table-row mb-4 md:mb-0 border rounded-lg md:border-0 md:border-b dark:border-slate-800 bg-white dark:bg-slate-900">
                <td data-label="Utilizator:" className="p-4 md:px-6 md:py-4 whitespace-nowrap">
                    <button onClick={() => setEditingUser(user)} className="text-sm font-medium text-primary underline hover:text-primary/80">
                        {user.username}
                    </button>
                    <div className="text-sm text-gray-500 dark:text-slate-400">{user.email}</div>
                </td>
                <td data-label="Rol:" className="p-4 md:px-6 md:py-4 whitespace-nowrap text-sm">
                  {user.is_admin 
                    ? <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">Admin</span> 
                    : <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">Utilizator</span>
                  }
                </td>
                <td data-label="Ultima Conectare:" className="p-4 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
                    {user.last_login_at 
                        ? new Date(user.last_login_at).toLocaleString('ro-RO') 
                        : 'Niciodată'
                    }
                </td>
                <td data-label="Spațiu Disc:" className="p-4 md:px-6 md:py-4 whitespace-nowrap text-sm">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center">
                        <Progress value={(user.current_usage_mb / user.disk_quota_mb) * 100} className="w-full sm:w-40 mr-2 mb-2 sm:mb-0" />
                        <span className="text-xs">{`${user.current_usage_mb} / ${user.disk_quota_mb} MB`}</span>
                    </div>
                </td>
                <td data-label="Acțiuni:" className="p-4 md:px-6 md:py-4 whitespace-nowrap text-sm">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditingUser(user)}>Editează</Button>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => setDeletingUser(user)}
                      disabled={currentUser.id === user.id}
                    >
                      Șterge
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <EditUserModal 
        user={editingUser}
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        onSave={() => { setEditingUser(null); fetchUsers(); }}
      />

      <AlertDialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ești absolut sigur?</AlertDialogTitle>
            <AlertDialogDescription>
              Această acțiune nu poate fi anulată. Utilizatorul <strong>{deletingUser?.username}</strong> și toate resursele sale (fișiere media, playlist-uri, ecrane) vor fi șterse permanent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Da, șterge utilizatorul</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

export default AdminPage;