// Cale fișier: src/pages/PlaylistsPage.jsx

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/axios';
import PlaylistPreviewModal from '../components/PlaylistPreviewModal';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlusCircle, MoreVertical, Trash2, Edit, Eye, ListMusic, Clock } from 'lucide-react';

function formatDuration(items) {
  const totalSeconds = items.reduce((acc, item) => acc + item.duration, 0);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

function PlaylistsPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [playlistToPreview, setPlaylistToPreview] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);

  const fetchPlaylists = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/playlists/');
      setPlaylists(response.data);
    } catch (err) {
      toast({ variant: "destructive", title: "Eroare", description: "Nu s-au putut încărca playlist-urile." });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await apiClient.delete(`/playlists/${itemToDelete.id}`);
      toast({ title: "Succes", description: `Playlist-ul "${itemToDelete.name}" a fost șters.` });
      setItemToDelete(null);
      fetchPlaylists();
    } catch (error) {
      const errorMessage = error.response?.data?.detail || "Ștergerea a eșuat.";
      toast({ variant: "destructive", title: "Eroare la ștergere", description: errorMessage });
      setItemToDelete(null);
    }
  };

  const filteredPlaylists = useMemo(() => {
    return playlists.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [playlists, searchTerm]);
  
  return (
    <div className="p-4 md:p-8 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Management Playlist-uri</h1>
        <div className="flex items-center gap-2">
           <Input
              type="search"
              placeholder="Caută după nume..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-64"
            />
          <Button asChild>
            {/* Navigarea aici este corecta, catre /playlists/new */}
            <Link to="/playlists/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Creează Playlist
            </Link>
          </Button>
        </div>
      </div>
      
      {loading && <div className="text-center p-8">Se încarcă playlist-urile...</div>}

       {/* VIZUALIZARE CARDURI PENTRU MOBIL */}
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
         {filteredPlaylists.map(playlist => (
          <Card key={playlist.id} className="flex flex-col justify-between">
            <CardHeader>
               <CardTitle className="flex justify-between items-start">
                <span className="truncate pr-2">{playlist.name}</span>
                 <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0"><MoreVertical className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setPlaylistToPreview(playlist)}><Eye className="mr-2 h-4 w-4"/>Previzualizează</DropdownMenuItem>
                    {/* --- MODIFICAREA 1 --- */}
                    <DropdownMenuItem onClick={() => navigate(`/playlists/${playlist.id}`)}><Edit className="mr-2 h-4 w-4"/>Editează</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setItemToDelete(playlist)} className="text-red-500"><Trash2 className="mr-2 h-4 w-4"/>Șterge</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center">
                    <ListMusic className="h-4 w-4 mr-2" />
                    <span>{playlist.items.length} piese</span>
                </div>
                <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>Durată: {formatDuration(playlist.items)}</span>
                </div>
            </CardContent>
             <CardFooter>
                 {/* --- MODIFICAREA 2 --- */}
                 <Button className="w-full" onClick={() => navigate(`/playlists/${playlist.id}`)}>Vezi detalii & Editează</Button>
            </CardFooter>
          </Card>
         ))}
       </div>

      {/* VIZUALIZARE TABEL PENTRU DESKTOP */}
      <div className="hidden md:block overflow-x-auto rounded-lg border">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
          <thead className="bg-gray-50 dark:bg-slate-900">
            <tr>
              <th className="px-4 py-3 text-left">Nume Playlist</th>
              <th className="px-4 py-3 text-left">Număr Piese</th>
              <th className="px-4 py-3 text-left">Durată Totală</th>
              <th className="px-4 py-3 text-left">Creat La</th>
              <th className="px-4 py-3 text-right">Acțiuni</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-950 divide-y divide-gray-200 dark:divide-slate-800">
            {filteredPlaylists.map(playlist => (
              <tr key={playlist.id}>
                <td className="px-4 py-3 font-medium">{playlist.name}</td>
                <td className="px-4 py-3">{playlist.items.length}</td>
                <td className="px-4 py-3">{formatDuration(playlist.items)}</td>
                <td className="px-4 py-3">{new Date(playlist.created_at).toLocaleDateString('ro-RO')}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setPlaylistToPreview(playlist)}>Previzualizează</Button>
                  {/* --- MODIFICAREA 3 --- */}
                  <Button variant="outline" size="sm" onClick={() => navigate(`/playlists/${playlist.id}`)}>Editează</Button>
                  <Button variant="destructive" size="sm" onClick={() => setItemToDelete(playlist)}>Șterge</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(filteredPlaylists.length === 0 && !loading) && (<div className="text-center py-8 text-gray-500">Niciun playlist nu corespunde criteriilor.</div>)}
      
      {playlistToPreview && <PlaylistPreviewModal playlist={playlistToPreview} isOpen={!!playlistToPreview} onClose={() => setPlaylistToPreview(null)} />}
      
      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ești absolut sigur?</AlertDialogTitle>
            <AlertDialogDescription>
              Playlist-ul <strong className="px-1">{itemToDelete?.name}</strong> va fi șters permanent. Această acțiune nu poate fi anulată.
            </AlertDialogDescription>
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

export default PlaylistsPage;