// Cale fișier: src/pages/ScreensPage.jsx

import { useState, useEffect, useMemo, useCallback } from 'react';
import apiClient from '../api/axios';
import PairScreenModal from '../components/PairScreenModal';
import AssignPlaylistModal from '../components/AssignPlaylistModal';
import RePairScreenModal from '../components/RePairScreenModal';
import ScreenStatus from '../components/ScreenStatus';
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlusCircle, MoreVertical, Trash2, Link, Edit, Repeat } from 'lucide-react';

function ScreensPage() {
  const { toast } = useToast();
  const [screens, setScreens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [screenToEdit, setScreenToEdit] = useState(null);
  const [screenToRePair, setScreenToRePair] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);

  const fetchScreens = useCallback(async (showToast = false) => {
    setLoading(true);
    try {
      const response = await apiClient.get('/screens/');
      setScreens(response.data);
      if (showToast) {
        toast({ title: "Succes", description: "Lista de ecrane a fost actualizată." });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Eroare", description: "Nu s-au putut încărca ecranele." });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchScreens();
    const interval = setInterval(() => fetchScreens(), 30000); // Reîmprospătare la 30 de secunde
    return () => clearInterval(interval);
  }, [fetchScreens]);

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await apiClient.delete(`/screens/${itemToDelete.id}`);
      toast({ title: "Succes", description: `Ecranul "${itemToDelete.name}" a fost șters.` });
      setItemToDelete(null);
      fetchScreens(true);
    } catch (error) {
      toast({ variant: "destructive", title: "Eroare", description: "Ștergerea a eșuat." });
    }
  };

  const processedScreens = useMemo(() => {
    return screens
      .filter(screen => {
        const matchesSearch = screen.name.toLowerCase().includes(searchTerm.toLowerCase());
        if (statusFilter === 'all') return matchesSearch;
        const isOnline = statusFilter === 'online';
        return matchesSearch && screen.is_online === isOnline;
      });
  }, [screens, searchTerm, statusFilter]);

  return (
    <div className="p-4 md:p-8 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Management Ecrane</h1>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsPairModalOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Adaugă Ecran Nou
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-2">
        <Input
          type="search"
          placeholder="Caută după nume..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-auto md:flex-1"
        />
        <div className="flex gap-2">
          <Button variant={statusFilter === 'all' ? 'secondary' : 'outline'} onClick={() => setStatusFilter('all')} className="flex-1">Toate</Button>
          <Button variant={statusFilter === 'online' ? 'secondary' : 'outline'} onClick={() => setStatusFilter('online')} className="flex-1">Online</Button>
          <Button variant={statusFilter === 'offline' ? 'secondary' : 'outline'} onClick={() => setStatusFilter('offline')} className="flex-1">Offline</Button>
        </div>
      </div>
      
      {loading && <div className="text-center p-8">Se încarcă ecranele...</div>}

      {/* VIZUALIZARE CARDURI PENTRU MOBIL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
        {processedScreens.map(screen => (
          <Card key={screen.id} className="flex flex-col justify-between">
            <CardHeader>
              <CardTitle className="flex justify-between items-start">
                <span className="truncate pr-2">{screen.name}</span>
                 <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setScreenToEdit(screen)}><Edit className="mr-2 h-4 w-4"/>Asignează Playlist</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setScreenToRePair(screen)}><Repeat className="mr-2 h-4 w-4"/>Re-împerechează</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setItemToDelete(screen)} className="text-red-500"><Trash2 className="mr-2 h-4 w-4"/>Șterge</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
                <p><strong className="font-medium">Playlist:</strong> {screen.assigned_playlist?.name || 'Niciunul'}</p>
                <p><strong className="font-medium">Locație:</strong> {screen.location || 'Nespecificată'}</p>
            </CardContent>
            <CardFooter>
                <ScreenStatus isOnline={screen.is_online} connectedSince={screen.connected_since} lastSeen={screen.last_seen} />
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* VIZUALIZARE TABEL PENTRU DESKTOP */}
      <div className="hidden md:block overflow-x-auto rounded-lg border">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
          <thead className="bg-gray-50 dark:bg-slate-900">
            <tr>
              <th className="px-4 py-3 text-left">Nume Ecran</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Playlist Asignat</th>
              <th className="px-4 py-3 text-left">Ultima Conectare</th>
              <th className="px-4 py-3 text-right">Acțiuni</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-950 divide-y divide-gray-200 dark:divide-slate-800">
            {processedScreens.map(screen => (
              <tr key={screen.id}>
                <td className="px-4 py-3 font-medium">{screen.name}</td>
                <td className="px-4 py-3"><ScreenStatus isOnline={screen.is_online} connectedSince={screen.connected_since} lastSeen={screen.last_seen} /></td>
                <td className="px-4 py-3">{screen.assigned_playlist?.name || <span className="text-muted-foreground italic">Niciunul</span>}</td>
                <td className="px-4 py-3">{new Date(screen.last_seen || screen.created_at).toLocaleString('ro-RO')}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setScreenToEdit(screen)}>Asignează</Button>
                  <Button variant="outline" size="sm" onClick={() => setScreenToRePair(screen)}>Re-împerechează</Button>
                  <Button variant="destructive" size="sm" onClick={() => setItemToDelete(screen)}>Șterge</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {(processedScreens.length === 0 && !loading) && (<div className="text-center py-8 text-gray-500">Niciun ecran nu corespunde criteriilor.</div>)}

      <PairScreenModal isOpen={isPairModalOpen} onClose={() => setIsPairModalOpen(false)} onSave={() => fetchScreens(true)} />
      {screenToEdit && <AssignPlaylistModal screen={screenToEdit} isOpen={!!screenToEdit} onClose={() => setScreenToEdit(null)} onSave={() => fetchScreens(true)} />}
      {screenToRePair && <RePairScreenModal screen={screenToRePair} isOpen={!!screenToRePair} onClose={() => setScreenToRePair(null)} onSave={() => fetchScreens(true)} />}
      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ești absolut sigur?</AlertDialogTitle>
            <AlertDialogDescription>Ecranul <strong className="px-1">{itemToDelete?.name}</strong> va fi șters permanent.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Da, șterge</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ScreensPage;