import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/axios';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Pagination from '@/components/Pagination';

const ITEMS_PER_PAGE = 15;

function CreatePlaylistModal({ isOpen, onClose, onSave }) {
  const { toast } = useToast();
  const [availableMedia, setAvailableMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playlistName, setPlaylistName] = useState('');
  const [playlistItems, setPlaylistItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchMedia = useCallback(async (page) => {
    try {
      setLoading(true);
      const response = await apiClient.get('/media/', {
        params: { skip: (page - 1) * ITEMS_PER_PAGE, limit: ITEMS_PER_PAGE }
      });
      setAvailableMedia(response.data.items);
      setTotalItems(response.data.total);
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Eroare", description: "Nu s-au putut încărca fișierele media." });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Acest useEffect gestionează atât deschiderea/închiderea, cât și schimbarea paginii
  useEffect(() => {
    if (isOpen) {
      fetchMedia(currentPage);
    } else {
      // Resetează starea când modalul este închis
      setPlaylistName('');
      setPlaylistItems([]);
      setCurrentPage(1);
      setTotalItems(0);
    }
  }, [isOpen, currentPage, fetchMedia]);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleAddItem = (mediaFile) => {
    if (playlistItems.find(item => item.id === mediaFile.id)) return;
    const newItem = { ...mediaFile, duration: mediaFile.duration ? Math.round(mediaFile.duration) : 10 };
    setPlaylistItems(prevItems => [...prevItems, newItem]);
  };

  const handleRemoveItem = (mediaId) => {
    setPlaylistItems(playlistItems.filter(item => item.id !== mediaId));
  };
    
  const handleDurationChange = (mediaId, newDuration) => {
    setPlaylistItems(playlistItems.map(item => item.id === mediaId ? { ...item, duration: parseInt(newDuration, 10) || 0 } : item));
  };

  const handleSave = async () => {
    if (!playlistName) {
      toast({ variant: "destructive", title: "Eroare de validare", description: "Te rog, introdu un nume pentru playlist." });
      return;
    }
    if (playlistItems.length === 0) {
      toast({ variant: "destructive", title: "Eroare de validare", description: "Te rog, adaugă cel puțin un element în playlist." });
      return;
    }
    const payload = {
      name: playlistName,
      items: playlistItems.map((item, index) => ({
        mediafile_id: item.id,
        order: index + 1,
        duration: item.duration,
      })),
    };
    try {
      await apiClient.post('/playlists/', payload);
      toast({ title: "Succes!", description: "Playlist-ul a fost creat." });
      onSave();
      onClose();
    } catch (err) {
      toast({ variant: "destructive", title: "Eroare de la server", description: "Playlist-ul nu a putut fi salvat." });
      console.error(err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Creează Playlist Nou</DialogTitle>
          <DialogDescription>Adaugă un nume și selectează fișierele media din galeria de mai jos.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4 flex-grow min-h-0">
          <div>
            <Label htmlFor="playlistName" className="mb-2">Nume Playlist</Label>
            <Input id="playlistName" value={playlistName} onChange={(e) => setPlaylistName(e.target.value)} placeholder="Ex: Reclame Iulie" />
          </div>
          <div className="grid grid-cols-2 gap-6 flex-grow min-h-0">
            <div className="flex flex-col">
              <h3 className="text-sm font-medium mb-2">Fișiere Media Disponibile</h3>
              <div className="border p-2 rounded-md flex-grow flex flex-col justify-between">
                <div className="grid grid-cols-3 gap-2 overflow-y-auto">
                  {loading ? <p className="col-span-3 text-center">Se încarcă...</p> : availableMedia.map(file => {
                    const imageUrl = file.thumbnail_path ? `https://display.regio-cloud.ro${file.thumbnail_path}` : `https://display.regio-cloud.ro/media/serve/${file.id}`;
                    return (
                      <div key={file.id} onClick={() => handleAddItem(file)} className="border rounded-lg p-1 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                        <img src={imageUrl} alt={file.filename} className="w-full h-16 object-cover bg-gray-200" />
                        <p className="text-xs truncate mt-1">{file.filename}</p>
                      </div>
                    );
                  })}
                </div>
                <Pagination currentPage={currentPage} totalItems={totalItems} itemsPerPage={ITEMS_PER_PAGE} onPageChange={handlePageChange} />
              </div>
            </div>
            <div className="flex flex-col">
              <h3 className="text-sm font-medium mb-2">Elemente în Playlist</h3>
              <div className="mt-2 space-y-2 overflow-y-auto border p-2 rounded-md flex-grow">
                {playlistItems.length === 0 ? <p className="text-slate-500 text-sm p-4 text-center">Niciun element adăugat.</p> :
                  playlistItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-2 rounded">
                      <img src={item.thumbnail_path ? `https://display.regio-cloud.ro${item.thumbnail_path}` : `https://display.regio-cloud.ro/media/serve/${item.id}`} className="w-12 h-12 object-cover rounded bg-gray-200" />
                      <span className="text-sm truncate mx-2 flex-1">{item.filename}</span>
                      <Input type="number" value={item.duration} onChange={(e) => handleDurationChange(item.id, e.target.value)} className="w-20 h-8" />
                      <span className="text-sm ml-1">sec</span>
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)} className="ml-2 text-red-500 hover:text-red-700 w-6 h-6"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></Button>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Anulează</Button>
          <Button onClick={handleSave}>Salvează Playlist</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CreatePlaylistModal;