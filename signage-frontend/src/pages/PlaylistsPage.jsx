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
import { PlusCircle, MoreVertical, Trash2, Edit, Eye, ListMusic, Clock, Search, Filter, Loader2 } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="p-4 md:p-8 mx-auto max-w-7xl space-y-8">
        {/* Header îmbunătățit */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <ListMusic className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Management Playlist-uri</h1>
              <p className="text-muted-foreground">
                Creați și gestionați playlist-urile pentru ecranele dumneavoastră
              </p>
            </div>
          </div>
          
          {/* Status indicator și butoane */}
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2 px-3 py-2 bg-muted/50 rounded-lg">
              <ListMusic className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">
                {playlists.length} playlist{playlists.length !== 1 ? '-uri' : ''}
              </span>
            </div>
            <Button asChild size="lg">
              <Link to="/playlists/new">
                <PlusCircle className="mr-2 h-4 w-4" /> 
                Creează Playlist
              </Link>
            </Button>
          </div>
        </div>

        {/* Filtere și căutare în card */}
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Caută după nume playlist..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
              
              {/* Filter info */}
              <div className="flex items-center gap-2">
                <Button variant="outline" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Toate ({playlists.length})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      
        {/* Loading State */}
        {loading && (
          <Card className="shadow-sm">
            <CardContent className="flex items-center justify-center p-12">
              <div className="flex items-center space-x-3 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Se încarcă playlist-urile...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mobile View */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:hidden">
          {filteredPlaylists.map(playlist => (
            <Card key={playlist.id} className="shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-4">
                <CardTitle className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <ListMusic className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="truncate font-semibold">{playlist.name}</span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setPlaylistToPreview(playlist)}>
                        <Eye className="mr-2 h-4 w-4"/>
                        Previzualizează
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/playlists/${playlist.id}`)}>
                        <Edit className="mr-2 h-4 w-4"/>
                        Editează
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setItemToDelete(playlist)} className="text-red-500">
                        <Trash2 className="mr-2 h-4 w-4"/>
                        Șterge
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="font-medium text-muted-foreground">Piese</p>
                    <div className="flex items-center space-x-1">
                      <ListMusic className="h-3 w-3" />
                      <span>{playlist.items.length}</span>
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Durată</p>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatDuration(playlist.items)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="pt-2 border-t">
                  <p className="font-medium text-muted-foreground text-xs">Creat la</p>
                  <p className="text-xs">{new Date(playlist.created_at).toLocaleDateString('ro-RO')}</p>
                </div>
              </CardContent>
              
              <CardFooter>
                <Button className="w-full" onClick={() => navigate(`/playlists/${playlist.id}`)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Vezi detalii & Editează
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Desktop View */}
        <Card className="shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-8 py-4 text-left font-semibold">Nume Playlist</th>
                  <th className="px-8 py-4 text-left font-semibold">Număr Piese</th>
                  <th className="px-8 py-4 text-left font-semibold">Durată Totală</th>
                  <th className="px-8 py-4 text-left font-semibold">Creat La</th>
                  <th className="px-8 py-4 text-right font-semibold">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPlaylists.map(playlist => (
                  <tr key={playlist.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                          <ListMusic className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <span className="font-medium">{playlist.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center space-x-2">
                        <ListMusic className="h-4 w-4 text-muted-foreground" />
                        <span>{playlist.items.length} piese</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDuration(playlist.items)}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm text-muted-foreground">
                      {new Date(playlist.created_at).toLocaleDateString('ro-RO')}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button variant="outline" size="sm" onClick={() => setPlaylistToPreview(playlist)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Previzualizează
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => navigate(`/playlists/${playlist.id}`)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editează
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => setItemToDelete(playlist)}>
                          <Trash2 className="mr-2 h-4 w-4" />
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
        {filteredPlaylists.length === 0 && !loading && (
          <Card className="shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="p-4 bg-muted/50 rounded-full mb-4">
                <ListMusic className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Niciun playlist găsit</h3>
              <p className="text-muted-foreground text-center max-w-sm">
                {searchTerm 
                  ? 'Niciun playlist nu corespunde criteriilor de căutare.' 
                  : 'Nu aveți încă playlist-uri create. Creați primul playlist pentru a începe.'
                }
              </p>
              {!searchTerm && (
                <Button asChild className="mt-4">
                  <Link to="/playlists/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Creează primul playlist
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {playlistToPreview && (
          <PlaylistPreviewModal 
            playlist={playlistToPreview} 
            isOpen={!!playlistToPreview} 
            onClose={() => setPlaylistToPreview(null)} 
          />
        )}
        
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
    </div>
  );
}

export default PlaylistsPage;