// Cale fișier: src/pages/EditPlaylistPage.jsx

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/axios';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Pagination from '@/components/Pagination';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

const ITEMS_PER_PAGE = 10;

// Componenta pentru un element din lista de media disponibile
const AvailableMediaItem = ({ item, onAdd, isAdded }) => {
  const mediaServeUrl = `${apiClient.defaults.baseURL}/media/serve/${item.id}`;
  const thumbnailBaseUrl = `${apiClient.defaults.baseURL}/media/thumbnails/`;
  const imageUrl = item.type.startsWith('image/') ? mediaServeUrl : `${thumbnailBaseUrl}${item.thumbnail_path}`;

  return (
    <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted">
      <img src={imageUrl} alt={item.filename} className="w-12 h-12 object-cover rounded bg-slate-200 flex-shrink-0" />
      <span className="text-sm truncate flex-1">{item.filename}</span>
      <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => onAdd(item)} disabled={isAdded}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
};

// Componenta pentru un element din playlist-ul curent
const PlaylistItem = ({ item, onRemove, onDurationChange, onMove }) => {
  const mediaServeUrl = `${apiClient.defaults.baseURL}/media/serve/${item.media_file.id}`;
  const thumbnailBaseUrl = `${apiClient.defaults.baseURL}/media/thumbnails/`;
  const imageUrl = item.media_file.type.startsWith('image/') ? mediaServeUrl : `${thumbnailBaseUrl}${item.media_file.thumbnail_path}`;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-2 rounded-md bg-slate-50 dark:bg-slate-800">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <img src={imageUrl} alt={item.media_file.filename} className="w-14 h-14 object-cover rounded bg-slate-200 flex-shrink-0" />
        <span className="text-sm truncate flex-1">{item.media_file.filename}</span>
      </div>
      <div className="flex items-center gap-2 self-end sm:self-center w-full sm:w-auto">
        <Input type="number" value={item.duration} onChange={(e) => onDurationChange(item.id, e.target.value)} className="w-20 h-9" min="1" />
        <span className="text-sm">sec</span>
        <Button variant="ghost" size="icon" onClick={() => onMove(item.id, 'up')} className="h-8 w-8"><ArrowUp className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => onMove(item.id, 'down')} className="h-8 w-8"><ArrowDown className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => onRemove(item.id)} className="text-red-500 h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
      </div>
    </div>
  );
};

function EditPlaylistPage() {
  const { playlistId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isNew = playlistId === 'new';

  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const [availableMedia, setAvailableMedia] = useState([]);
  const [mediaCurrentPage, setMediaCurrentPage] = useState(1);
  const [mediaTotalItems, setMediaTotalItems] = useState(0);
  const [loading, setLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);

  const fetchPlaylistDetails = useCallback(async () => {
    if (isNew) return;
    try {
      const response = await apiClient.get(`/playlists/${playlistId}`);
      setName(response.data.name);
      // Asigurăm un ID unic pentru fiecare element pentru cheile React
      const playlistItemsWithUniqueIds = response.data.items.map(item => ({ ...item, id: Math.random() }));
      setItems(playlistItemsWithUniqueIds);
    } catch (error) {
      toast({ variant: "destructive", title: "Eroare", description: "Playlist-ul nu a putut fi încărcat." });
      navigate('/playlists');
    } finally {
      setLoading(false);
    }
  }, [playlistId, isNew, navigate, toast]);

  const fetchMedia = useCallback(async () => {
    try {
      const response = await apiClient.get('/media/', {
        params: { skip: (mediaCurrentPage - 1) * ITEMS_PER_PAGE, limit: ITEMS_PER_PAGE }
      });
      setAvailableMedia(response.data.items);
      setMediaTotalItems(response.data.total);
    } catch (err) {
      toast({ variant: "destructive", title: "Eroare", description: "Nu s-au putut încărca fișierele media." });
    }
  }, [mediaCurrentPage, toast]);

  useEffect(() => {
    fetchPlaylistDetails();
  }, [fetchPlaylistDetails]);
  
  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const handleAddItem = (mediaItem) => {
    const newItem = {
      id: Math.random(), // ID unic temporar pentru randare
      mediafile_id: mediaItem.id,
      duration: Math.round(mediaItem.duration) || 10,
      media_file: mediaItem,
    };
    setItems(currentItems => [...currentItems, newItem]);
  };

  const handleRemoveItem = (itemId) => {
    setItems(currentItems => currentItems.filter(item => item.id !== itemId));
  };

  const handleDurationChange = (itemId, newDuration) => {
    const durationValue = parseInt(newDuration, 10);
    if (isNaN(durationValue) || durationValue < 1) return;
    setItems(currentItems => currentItems.map(item => item.id === itemId ? { ...item, duration: durationValue } : item));
  };
  
  const handleMoveItem = (itemId, direction) => {
    const index = items.findIndex(item => item.id === itemId);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === items.length - 1) return;

    const newItems = [...items];
    const itemToMove = newItems.splice(index, 1)[0];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    newItems.splice(newIndex, 0, itemToMove);
    setItems(newItems);
  };

  const handleSave = async () => {
    if (!name) {
      toast({ variant: "destructive", title: "Nume obligatoriu", description: "Te rugăm să introduci un nume pentru playlist." });
      return;
    }
    setIsSaving(true);
    const playlistData = {
      name,
      items: items.map((item, index) => ({
        mediafile_id: item.mediafile_id,
        order: index,
        duration: item.duration,
      })),
    };

    try {
      if (isNew) {
        await apiClient.post('/playlists/', playlistData);
      } else {
        await apiClient.put(`/playlists/${playlistId}`, playlistData);
      }
      toast({ title: "Succes!", description: "Playlist-ul a fost salvat." });
      navigate('/playlists');
    } catch (error) {
      toast({ variant: "destructive", title: "Eroare", description: error.response?.data?.detail || "Salvarea a eșuat." });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Se încarcă playlist-ul...</div>;

  const currentItemIds = new Set(items.map(i => i.mediafile_id));

  return (
    <div className="p-4 md:p-8 space-y-4">
        <div className="flex items-center justify-between">
            <Button variant="outline" asChild>
                <Link to="/playlists"><ArrowLeft className="mr-2 h-4 w-4"/> Înapoi la listă</Link>
            </Button>
            <div className="flex items-center gap-2">
                 <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Se salvează...' : 'Salvează Playlist'}
                 </Button>
            </div>
        </div>

        {/* --- CONTAINER PRINCIPAL RESPONSIV --- */}
        <div className="flex flex-col lg:flex-row gap-8">
            {/* --- COLOANA 1: PIESE ÎN PLAYLIST & NUME (pe mobil e prima) --- */}
            <div className="flex-1 lg:w-2/3 space-y-4">
                <Card>
                    <CardHeader><CardTitle>Detalii Playlist</CardTitle></CardHeader>
                    <CardContent>
                        <Label htmlFor="playlist-name">Nume Playlist</Label>
                        <Input id="playlist-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Numele playlist-ului" />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Piese în Playlist ({items.length})</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        {items.length > 0 ? (
                           items.map(item => <PlaylistItem key={item.id} item={item} onRemove={handleRemoveItem} onDurationChange={handleDurationChange} onMove={handleMoveItem} />)
                        ) : (
                           <p className="text-center text-muted-foreground py-4">Adaugă fișiere din librăria media.</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* --- COLOANA 2: FIȘIERE MEDIA DISPONIBILE (pe mobil e a doua) --- */}
            <div className="flex-1 lg:w-1/3">
                <Card>
                    <CardHeader><CardTitle>Librărie Media</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        {availableMedia.map(item => <AvailableMediaItem key={item.id} item={item} onAdd={handleAddItem} isAdded={currentItemIds.has(item.id)} />)}
                    </CardContent>
                    <Pagination
                        currentPage={mediaCurrentPage} totalItems={mediaTotalItems} itemsPerPage={ITEMS_PER_PAGE}
                        onPageChange={(page) => setMediaCurrentPage(page)}
                    />
                </Card>
            </div>
        </div>
    </div>
  );
}

export default EditPlaylistPage;