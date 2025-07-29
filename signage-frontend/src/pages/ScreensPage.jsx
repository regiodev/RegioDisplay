// Cale fișier: src/pages/ScreensPage.jsx

import { useState, useEffect } from 'react';
import apiClient from '../api/axios';
import PairScreenModal from '../components/PairScreenModal';
import AssignPlaylistModal from '../components/AssignPlaylistModal';
import RePairScreenModal from '../components/RePairScreenModal';
import ScreenStatus from '../components/ScreenStatus'; // IMPORT NOU
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

function ScreensPage() {
  const [screens, setScreens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [screenToEdit, setScreenToEdit] = useState(null);
  const [screenToRePair, setScreenToRePair] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);

  const fetchScreens = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/screens');
      setScreens(response.data.sort((a, b) => (b.is_active - a.is_active) || (new Date(b.last_seen) - new Date(a.last_seen))));
      setError(null);
    } catch (err) {
      setError('Nu s-au putut încărca ecranele.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScreens();
  }, []);

  const handleDeleteClick = (screenId, screenName) => {
    setItemToDelete({ id: screenId, name: screenName });
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await apiClient.delete(`/screens/${itemToDelete.id}`);
      await fetchScreens();
    } catch (err) {
      alert('A apărut o eroare la ștergerea ecranului.');
    } finally {
      setItemToDelete(null);
    }
  };

  if (loading) return <p>Se încarcă ecranele...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div>
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-200">Management Ecrane</h1>
        <Button onClick={() => setIsPairModalOpen(true)}>
          Adaugă Ecran Nou
        </Button>
      </div>

      <div className="mt-6 bg-white dark:bg-slate-900 p-4 rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
          <thead className="bg-gray-50 dark:bg-slate-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nume / Locație</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cod Împerechere</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Playlist Asignat</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acțiuni</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
            {screens.map((screen) => (
              <tr key={screen.id} className={!screen.is_active ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium">{screen.name || <span className="text-gray-400 italic">Așteaptă activare...</span>}</div>
                    <div className="text-xs text-gray-500">{screen.location}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <ScreenStatus lastSeen={screen.last_seen} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600 font-bold">
                  {screen.pairing_code}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{screen.assigned_playlist ? screen.assigned_playlist.name : 'Niciunul'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  {screen.is_active && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setScreenToEdit(screen)}>Asignează Playlist</Button>
                      <Button variant="outline" size="sm" onClick={() => setScreenToRePair(screen)}>Re-împerechează</Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(screen.id, screen.name)}>Șterge</Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PairScreenModal isOpen={isPairModalOpen} onClose={() => setIsPairModalOpen(false)} onSave={fetchScreens} />

      {screenToEdit && (
        <AssignPlaylistModal screen={screenToEdit} isOpen={!!screenToEdit} onClose={() => setScreenToEdit(null)} onSave={fetchScreens} />
      )}

      {screenToRePair && (
        <RePairScreenModal screen={screenToRePair} isOpen={!!screenToRePair} onClose={() => setScreenToRePair(null)} onSave={fetchScreens} />
      )}

      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ești absolut sigur?</AlertDialogTitle>
            <AlertDialogDescription>
              Această acțiune nu poate fi anulată. Ecranul
              <strong className="px-1">{itemToDelete?.name}</strong>
              va fi șters permanent din sistem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Anulează</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Da, șterge</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ScreensPage;