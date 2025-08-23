// Cale fișier: src/pages/AdminPage.jsx
import { useState, useEffect } from 'react';
import apiClient from '../api/axios';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Users, Shield, UserX, Settings, Clock, Loader2 } from 'lucide-react';

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
    } catch {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="p-4 md:p-8 mx-auto max-w-7xl space-y-8">
          <Card className="shadow-sm">
            <CardContent className="flex items-center justify-center p-12">
              <div className="flex items-center space-x-3 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Se încarcă utilizatorii...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="p-4 md:p-8 mx-auto max-w-7xl space-y-8">
          <Card className="shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                <UserX className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Eroare de încărcare</h3>
              <p className="text-muted-foreground text-center">{error}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="p-4 md:p-8 mx-auto max-w-7xl space-y-8">
        {/* Header îmbunătățit */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
              <Users className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Management Utilizatori</h1>
              <p className="text-muted-foreground">
                Gestionați conturile și permisiunile utilizatorilor
              </p>
            </div>
          </div>
          
          {/* Status indicator */}
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2 px-3 py-2 bg-muted/50 rounded-lg">
              <Users className="h-4 w-4 text-indigo-500" />
              <span className="text-sm font-medium">
                {users.length} utilizator{users.length !== 1 ? 'i' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile View */}
        <div className="grid grid-cols-1 gap-6 md:hidden">
          {users.map((user) => (
            <Card key={user.id} className="shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-4">
                <CardTitle className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                      <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <button 
                        onClick={() => setEditingUser(user)} 
                        className="font-semibold hover:underline text-left"
                      >
                        {user.username}
                      </button>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  {user.is_admin ? (
                    <div className="flex items-center space-x-1 px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 rounded-full">
                      <Shield className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-xs font-medium text-indigo-800 dark:text-indigo-200">Admin</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                      <Users className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                      <span className="text-xs font-medium text-gray-800 dark:text-gray-200">User</span>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground mb-2">Ultima conectare</p>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {user.last_login_at 
                        ? new Date(user.last_login_at).toLocaleString('ro-RO') 
                        : 'Niciodată'
                      }
                    </span>
                  </div>
                </div>
                
                <div>
                  <p className="font-medium text-muted-foreground mb-2">Utilizare spațiu</p>
                  <div className="space-y-2">
                    <Progress value={(user.current_usage_mb / user.disk_quota_mb) * 100} className="h-2" />
                    <span className="text-xs text-muted-foreground">
                      {user.current_usage_mb} / {user.disk_quota_mb} MB
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingUser(user)} className="flex-1">
                    <Settings className="mr-2 h-4 w-4" />
                    Editează
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => setDeletingUser(user)}
                    disabled={currentUser.id === user.id}
                    className="flex-1"
                  >
                    <UserX className="mr-2 h-4 w-4" />
                    Șterge
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Desktop View */}
        <Card className="shadow-sm overflow-hidden hidden md:block">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-8 py-4 text-left font-semibold">Utilizator</th>
                  <th className="px-8 py-4 text-left font-semibold">Rol</th>
                  <th className="px-8 py-4 text-left font-semibold">Ultima Conectare</th>
                  <th className="px-8 py-4 text-left font-semibold">Utilizare Spațiu</th>
                  <th className="px-8 py-4 text-right font-semibold">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                          <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <button 
                            onClick={() => setEditingUser(user)} 
                            className="font-medium hover:underline"
                          >
                            {user.username}
                          </button>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      {user.is_admin ? (
                        <div className="flex items-center space-x-2 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 rounded-full w-fit">
                          <Shield className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                          <span className="text-xs font-medium text-indigo-800 dark:text-indigo-200">Admin</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full w-fit">
                          <Users className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                          <span className="text-xs font-medium text-gray-800 dark:text-gray-200">Utilizator</span>
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>
                          {user.last_login_at 
                            ? new Date(user.last_login_at).toLocaleString('ro-RO') 
                            : 'Niciodată'
                          }
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="space-y-2 max-w-xs">
                        <Progress value={(user.current_usage_mb / user.disk_quota_mb) * 100} className="h-2" />
                        <span className="text-xs text-muted-foreground">
                          {user.current_usage_mb} / {user.disk_quota_mb} MB
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingUser(user)}>
                          <Settings className="mr-2 h-4 w-4" />
                          Editează
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => setDeletingUser(user)}
                          disabled={currentUser.id === user.id}
                        >
                          <UserX className="mr-2 h-4 w-4" />
                          Șterge
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Empty State */}
        {users.length === 0 && !loading && (
          <Card className="shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="p-4 bg-muted/50 rounded-full mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Niciun utilizator găsit</h3>
              <p className="text-muted-foreground text-center">
                Nu există utilizatori în sistem în acest moment.
              </p>
            </CardContent>
          </Card>
        )}

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
    </div>
  );
}

export default AdminPage;