import { useState, useEffect } from 'react';
import apiClient from '../api/axios';
import CreatePlaylistModal from '../components/CreatePlaylistModal';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
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

function PlaylistsPage() {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // Default este acum 'list'

  const fetchPlaylists = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/playlists/');
      setPlaylists(response.data);
      setError(null);
    } catch (err) {
      setError('Nu s-au putut încărca playlist-urile.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const handleDeleteClick = (e, playlistId, playlistName) => {
    e.preventDefault(); 
    e.stopPropagation();
    setItemToDelete({ id: playlistId, name: playlistName });
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await apiClient.delete(`/playlists/${itemToDelete.id}`);
      await fetchPlaylists();
    } catch (err) {
      alert('A apărut o eroare la ștergerea playlist-ului.');
      console.error(err);
    } finally {
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  if (loading) return <p>Se încarcă playlist-urile...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div>
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-200">Management Playlist-uri</h1>
        <div className="flex items-center space-x-4">
          <Button onClick={() => setIsModalOpen(true)}>
            Creează Playlist Nou
          </Button>
          <div className="flex items-center space-x-2 p-1 bg-gray-200 dark:bg-slate-800 rounded-lg">
            <button onClick={() => setViewMode('grid')} className={`px-3 py-1 text-sm rounded-md ${viewMode === 'grid' ? 'bg-white dark:bg-slate-950 shadow' : 'hover:bg-gray-300 dark:hover:bg-slate-700'}`}>Grilă</button>
            <button onClick={() => setViewMode('list')} className={`px-3 py-1 text-sm rounded-md ${viewMode === 'list' ? 'bg-white dark:bg-slate-950 shadow' : 'hover:bg-gray-300 dark:hover:bg-slate-700'}`}>Listă</button>
          </div>
        </div>
      </div>

      <div className="mt-6">
        {playlists.length === 0 && !loading ? (
          <p className="col-span-full text-center text-gray-500">Nu există playlist-uri create.</p>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {playlists.map((playlist) => (
              <Link to={`/playlists/${playlist.id}`} key={playlist.id} className="relative block bg-white dark:bg-slate-900 p-4 rounded-lg shadow hover:shadow-lg transition-shadow group">
                <h2 className="text-xl font-bold truncate text-slate-800 dark:text-slate-200">{playlist.name}</h2>
                <p className="text-gray-600 dark:text-slate-400 mt-2">{playlist.items.length} elemente</p>
                <Button variant="destructive" size="icon" onClick={(e) => handleDeleteClick(e, playlist.id, playlist.name)} className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" title="Șterge playlist">X</Button>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Nume Playlist</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Număr Elemente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
                {playlists.map((playlist) => (
                  <tr key={playlist.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-slate-200">{playlist.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">{playlist.items.length}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                      <Button asChild variant="outline" size="sm"><Link to={`/playlists/${playlist.id}`}>Editează</Link></Button>
                      <Button variant="destructive" size="sm" onClick={(e) => handleDeleteClick(e, playlist.id, playlist.name)}>Șterge</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* AICI ESTE CORECȚIA PRINCIPALĂ */}
      <CreatePlaylistModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={fetchPlaylists} 
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ești absolut sigur?</AlertDialogTitle>
            <AlertDialogDescription>
              Această acțiune nu poate fi anulată. Playlist-ul "{itemToDelete?.name}" va fi șters permanent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Anulează</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Da, șterge playlist-ul</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default PlaylistsPage;