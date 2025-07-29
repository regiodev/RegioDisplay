import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Pagination from '@/components/Pagination';

const ITEMS_PER_PAGE = 15;

function EditPlaylistPage() {
  const { playlistId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Stări pentru playlist și elementele sale
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  
  // Stări pentru media disponibilă și paginarea sa
  const [availableMedia, setAvailableMedia] = useState([]);
  const [mediaCurrentPage, setMediaCurrentPage] = useState(1);
  const [mediaTotalItems, setMediaTotalItems] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (page) => {
    try {
      setLoading(true);
      const [playlistResponse, mediaResponse] = await Promise.all([
        apiClient.get(`/playlists/${playlistId}`),
        apiClient.get('/media/', { params: { skip: (page - 1) * ITEMS_PER_PAGE, limit: ITEMS_PER_PAGE } })
      ]);
      
      setName(playlistResponse.data.name);
      setItems(playlistResponse.data.items.sort((a, b) => a.order - b.order));
      
      setAvailableMedia(mediaResponse.data.items);
      setMediaTotalItems(mediaResponse.data.total);
      
      setError(null);
    } catch (err) {
      console.error("Failed to fetch data", err);
      setError("Datele nu au putut fi încărcate.");
    } finally {
      setLoading(false);
    }
  }, [playlistId]);
  
  useEffect(() => {
    fetchData(mediaCurrentPage);
  }, [mediaCurrentPage, fetchData]);

  const handlePageChange = (newPage) => {
    setMediaCurrentPage(newPage);
  };

  const handleAddItem = (mediaFile) => {
    if (items.find(item => item.media_file.id === mediaFile.id)) return;
    const newItem = {
      id: `new-${mediaFile.id}`,
      media_file: mediaFile,
      duration: mediaFile.duration ? Math.round(mediaFile.duration) : 10,
    };
    setItems(prevItems => [...prevItems, newItem]);
  };
  
  const handleRemoveItem = (itemId) => { setItems(items.filter(item => item.id !== itemId)); };
  const handleMove = (index, direction) => {
    const newItems = [...items];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newItems.length) return;
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    setItems(newItems);
  };
  const handleDurationChange = (itemId, newDuration) => { setItems(items.map(item => item.id === itemId ? { ...item, duration: parseInt(newDuration, 10) || 0 } : item)); };

  const handleSave = async () => {
    if (!name) { toast({ variant: "destructive", title: "Eroare", description: "Numele playlist-ului este obligatoriu." }); return; }
    const payload = {
      name: name,
      items: items.map((item, index) => ({
        mediafile_id: item.media_file.id,
        order: index + 1,
        duration: item.duration,
      })),
    };
    try {
      await apiClient.put(`/playlists/${playlistId}`, payload);
      toast({ title: "Succes!", description: "Playlist-ul a fost salvat." });
      navigate('/playlists');
    } catch (error) {
      toast({ variant: "destructive", title: "Eroare", description: "Salvarea a eșuat." });
      console.error("Failed to save playlist", error);
    }
  };

  if (loading) return <p>Se încarcă playlist-ul...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div>
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-200">Editare Playlist</h1>
        <Button onClick={handleSave}>Salvează Modificările</Button>
      </div>
      <div className="mt-4">
        <Label htmlFor="playlistName">Nume Playlist</Label>
        <Input type="text" id="playlistName" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow flex flex-col">
          <h3 className="text-lg font-semibold">Fișiere Media Disponibile</h3>
          <div className="mt-2 grid grid-cols-3 gap-2 overflow-y-auto border p-2 rounded-md flex-grow">
            {availableMedia.map(file => {
              const imageUrl = file.thumbnail_path ? `https://display.regio-cloud.ro${file.thumbnail_path}` : `https://display.regio-cloud.ro/media/serve/${file.id}`;
              return (
                <div key={file.id} onClick={() => handleAddItem(file)} className="border rounded-lg p-1 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                  <img src={imageUrl} alt={file.filename} className="w-full h-16 object-cover bg-gray-200" />
                  <p className="text-xs truncate mt-1">{file.filename}</p>
                </div>
              );
            })}
          </div>
          <Pagination currentPage={mediaCurrentPage} totalItems={mediaTotalItems} itemsPerPage={ITEMS_PER_PAGE} onPageChange={handlePageChange} />
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow flex flex-col">
          <h2 className="text-lg font-semibold">Elemente în Playlist</h2>
          <div className="mt-2 space-y-2 overflow-y-auto border p-2 rounded-md flex-grow">
            {items.map((item, index) => (
              <div key={item.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-2 rounded">
                <div className="flex flex-col mr-4"><button onClick={() => handleMove(index, -1)} disabled={index === 0} className="px-2 disabled:opacity-50">▲</button><button onClick={() => handleMove(index, 1)} disabled={index === items.length - 1} className="px-2 disabled:opacity-50">▼</button></div>
                <img src={item.media_file.thumbnail_path ? `https://display.regio-cloud.ro${item.media_file.thumbnail_path}` : `https://display.regio-cloud.ro/media/serve/${item.media_file.id}`} className="w-16 h-16 object-cover rounded" />
                <span className="text-sm truncate mx-2 flex-1">{item.media_file.filename}</span>
                <div className="flex items-center">
                  <Input type="number" value={item.duration} onChange={(e) => handleDurationChange(item.id, e.target.value)} className="w-20 h-8" />
                  <span className="text-sm ml-1 mr-2">sec</span>
                  {item.media_file.duration && (<Button onClick={() => handleDurationChange(item.id, Math.round(item.media_file.duration))} className="h-8 text-xs" variant="outline" title={`Setează la durata completă (${Math.round(item.media_file.duration)}s)`}>Auto</Button>)}
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)} className="ml-2 text-red-500 hover:text-red-700 w-6 h-6"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditPlaylistPage;