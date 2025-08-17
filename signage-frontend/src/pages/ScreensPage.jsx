import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import apiClient from '../api/axios';
import PairScreenModal from '../components/PairScreenModal';
import ScreenStatus from '../components/ScreenStatus';
import { MoreVertical, PlusCircle, RotateCw, Settings, Trash2, Monitor, Search, Filter } from 'lucide-react';
import ScreenIcon from '@/components/ui/screen-icon';

function ScreensPage() {
  const { toast } = useToast();
  const [screens, setScreens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const fetchScreens = useCallback(async (showToast = false) => {
    setLoading(true);
    try {
      const response = await apiClient.get('/screens/');
      const sortedScreens = response.data.sort((a, b) => a.name.localeCompare(b.name));
      setScreens(sortedScreens);
      if (showToast) {
        toast({ title: 'Succes', description: 'Lista de ecrane a fost actualizată.' });
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Eroare',
        description: 'Nu s-au putut încărca ecranele.',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchScreens();
    const interval = setInterval(() => fetchScreens(), 30000);
    return () => clearInterval(interval);
  }, [fetchScreens]);

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await apiClient.delete(`/screens/${itemToDelete.id}`);
      toast({ title: 'Succes', description: `Ecranul "${itemToDelete.name}" a fost șters.` });
      setItemToDelete(null);
      fetchScreens(true);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Eroare', description: 'Ștergerea a eșuat.' });
    }
  };

  const processedScreens = useMemo(() => {
    return screens.filter((screen) => {
      const matchesSearch = screen.name.toLowerCase().includes(searchTerm.toLowerCase());
      if (statusFilter === 'all') return matchesSearch;
      const isOnline = statusFilter === 'online';
      return matchesSearch && screen.is_online === isOnline;
    });
  }, [screens, searchTerm, statusFilter]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="p-4 md:p-8 mx-auto max-w-7xl space-y-8">
        {/* Header îmbunătățit */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <Monitor className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Management Ecrane</h1>
              <p className="text-muted-foreground">
                Gestionați și monitorizați toate ecranele digital signage
              </p>
            </div>
          </div>
          
          {/* Status indicator și butoane */}
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2 px-3 py-2 bg-muted/50 rounded-lg">
              <Monitor className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">
                {screens.filter(s => s.is_online).length} / {screens.length} online
              </span>
            </div>
            <Button onClick={() => setIsPairModalOpen(true)} size="lg">
              <PlusCircle className="mr-2 h-4 w-4" /> 
              Adaugă Ecran Nou
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
                  placeholder="Caută după nume ecran..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
              
              {/* Filtere status */}
              <div className="flex gap-2">
                <Button 
                  variant={statusFilter === 'all' ? 'default' : 'outline'} 
                  onClick={() => setStatusFilter('all')} 
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Toate ({screens.length})
                </Button>
                <Button 
                  variant={statusFilter === 'online' ? 'default' : 'outline'} 
                  onClick={() => setStatusFilter('online')} 
                  className="flex items-center gap-2"
                >
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Online ({screens.filter(s => s.is_online).length})
                </Button>
                <Button 
                  variant={statusFilter === 'offline' ? 'default' : 'outline'} 
                  onClick={() => setStatusFilter('offline')} 
                  className="flex items-center gap-2"
                >
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  Offline ({screens.filter(s => !s.is_online).length})
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
                <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full"></div>
                <span>Se încarcă ecranele...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mobile View */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:hidden">
          {processedScreens.map((screen) => (
            <Card key={screen.id} className="shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-4">
                <CardTitle className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Monitor className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <Link to={`/screens/${screen.id}`} className="truncate hover:underline font-semibold">
                      {screen.name}
                    </Link>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/screens/${screen.id}`}>
                          <Settings className="mr-2 h-4 w-4" />
                          Setări
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setItemToDelete(screen)} className="text-red-500">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Șterge
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="font-medium text-muted-foreground">Playlist</p>
                    <p className="truncate">{screen.assigned_playlist?.name || 'Niciunul'}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Locație</p>
                    <p className="truncate">{screen.location || 'Nespecificată'}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-muted-foreground">Rotație:</span>
                    <ScreenIcon rotation={screen.rotation} size={20} />
                    <span className="text-sm">{screen.rotation}°</span>
                  </div>
                  <ScreenStatus isOnline={screen.is_online} connectedSince={screen.connected_since} lastSeen={screen.last_seen} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Desktop View */}
        <Card className="shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-8 py-4 text-left font-semibold">Nume Ecran</th>
                  <th className="px-8 py-4 text-left font-semibold">Status</th>
                  <th className="px-8 py-4 text-left font-semibold">Rotație</th>
                  <th className="px-8 py-4 text-left font-semibold">Playlist Asignat</th>
                  <th className="px-8 py-4 text-right font-semibold">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {processedScreens.map((screen) => (
                  <tr key={screen.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <Monitor className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <Link to={`/screens/${screen.id}`} className="font-medium hover:underline">
                          {screen.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <ScreenStatus isOnline={screen.is_online} connectedSince={screen.connected_since} lastSeen={screen.last_seen} />
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center space-x-2">
                        <ScreenIcon rotation={screen.rotation} size={24} />
                        <span className="text-sm font-medium">{screen.rotation}°</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      {screen.assigned_playlist?.name ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>{screen.assigned_playlist.name}</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          <span className="text-muted-foreground italic">Niciunul</span>
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/screens/${screen.id}`}>
                            <Settings className="mr-2 h-4 w-4" />
                            Setări
                          </Link>
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => setItemToDelete(screen)}>
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
        {processedScreens.length === 0 && !loading && (
          <Card className="shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="p-4 bg-muted/50 rounded-full mb-4">
                <Monitor className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Niciun ecran găsit</h3>
              <p className="text-muted-foreground text-center max-w-sm">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Niciun ecran nu corespunde criteriilor de căutare.' 
                  : 'Nu aveți încă ecrane configurate. Adăugați primul ecran pentru a începe.'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <Button onClick={() => setIsPairModalOpen(true)} className="mt-4">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Adaugă primul ecran
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <PairScreenModal isOpen={isPairModalOpen} onClose={() => setIsPairModalOpen(false)} onSave={() => fetchScreens(true)} />
        
        <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Ești absolut sigur?</AlertDialogTitle>
              <AlertDialogDescription>
                Ecranul <strong className="px-1">{itemToDelete?.name}</strong> va fi șters permanent.
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

export default ScreensPage;