// Cale fișier: src/pages/AdminPage.jsx

import { useState, useEffect } from 'react';
import apiClient from '../api/axios';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import EditUserModal from '../components/EditUserModal';
import { useAuth } from '../contexts/AuthContext'; // IMPORT NOU
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"; // IMPORT NOU
import { useToast } from "@/hooks/use-toast"; // IMPORT NOU

function AdminPage() {
  const { user: currentUser } = useAuth(); // Obținem utilizatorul curent logat
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null); // Stare nouă pentru confirmare ștergere

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/users');

      // --- LINIA DE ADĂUGAT PENTRU DEPANARE ---
      console.log("Răspuns primit de la /api/admin/users:", response.data);
      // --- FINAL LINIE DE ADĂUGAT ---

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
      fetchUsers(); // Reîmprospătăm lista
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
      
      <div className="mt-6 bg-white dark:bg-slate-900 shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
          {/* ... thead rămâne la fel ... */}
          <thead className="bg-gray-50 dark:bg-slate-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilizator</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-1/3">Utilizare Spațiu</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acțiuni</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-slate-200">{user.username}</div>
                    <div className="text-sm text-gray-500 dark:text-slate-400">{user.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {user.is_admin 
                    ? <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">Admin</span> 
                    : <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">Utilizator</span>
                  }
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center">
                        <Progress value={(user.current_usage_mb / user.disk_quota_mb) * 100} className="w-full mr-2" />
                        <span>{`${user.current_usage_mb} / ${user.disk_quota_mb} MB`}</span>
                    </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingUser(user)}>Editează</Button>
                  {/* Butonul de ștergere, dezactivat pentru utilizatorul curent */}
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => setDeletingUser(user)}
                    disabled={currentUser.id === user.id}
                  >
                    Șterge
                  </Button>
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

      {/* --- DIALOGUL NOU DE CONFIRMARE ȘTERGERE --- */}
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