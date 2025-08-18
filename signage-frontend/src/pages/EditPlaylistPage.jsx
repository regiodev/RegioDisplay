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
import { ArrowLeft, Plus, Trash2, ArrowUp, ArrowDown, ListMusic, Image, Save, Loader2 } from 'lucide-react';

const ITEMS_PER_PAGE = 10;

// Componenta pentru un element din lista de media disponibile
const AvailableMediaItem = ({ item, onAdd, isAdded }) => {
  const mediaServeUrl = `${apiClient.defaults.baseURL}/media/serve/${item.id}`;
  const thumbnailBaseUrl = `${apiClient.defaults.baseURL}/media/thumbnails/`;
  const imageUrl = item.type.startsWith('image/') ? mediaServeUrl : `${thumbnailBaseUrl}${item.thumbnail_path}`;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors border border-border/50">
      <div className="relative">
        <img src={imageUrl} alt={item.filename} className="w-12 h-12 object-cover rounded-lg bg-muted flex-shrink-0" />
        <div className="absolute -top-1 -right-1 p-1 bg-purple-100 dark:bg-purple-900/30 rounded-full">
          <Image className="h-3 w-3 text-purple-600 dark:text-purple-400" />
        </div>
      </div>
      <span className="text-sm truncate flex-1 font-medium">{item.filename}</span>
      <Button 
        size="sm" 
        variant={isAdded ? "secondary" : "outline"} 
        onClick={() => onAdd(item)} 
        disabled={isAdded}
        className="flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        {isAdded ? 'Adăugat' : 'Adaugă'}
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
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors border border-border/50">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="relative">
          <img src={imageUrl} alt={item.media_file.filename} className="w-14 h-14 object-cover rounded-lg bg-muted flex-shrink-0" />
          <div className="absolute -bottom-1 -right-1 p-1 bg-green-100 dark:bg-green-900/30 rounded-full">
            <ListMusic className="h-3 w-3 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <span className="text-sm truncate flex-1 font-medium">{item.media_file.filename}</span>
      </div>
      <div className="flex items-center gap-2 self-end sm:self-center w-full sm:w-auto">
        <div className="flex items-center gap-2">
          <Input 
            type="number" 
            value={item.duration} 
            onChange={(e) => onDurationChange(item.id, e.target.value)} 
            className="w-20 h-9" 
            min="1" 
          />
          <span className="text-sm text-muted-foreground">sec</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => onMove(item.id, 'up')} className="h-8 w-8 hover:bg-blue-100 dark:hover:bg-blue-900/30">
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onMove(item.id, 'down')} className="h-8 w-8 hover:bg-blue-100 dark:hover:bg-blue-900/30">
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onRemove(item.id)} className="h-8 w-8 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
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
    } catch {
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
    } catch {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="p-4 md:p-8 mx-auto max-w-7xl space-y-8">
          <Card className="shadow-sm">
            <CardContent className="flex items-center justify-center p-12">
              <div className="flex items-center space-x-3 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Se încarcă playlist-ul...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const currentItemIds = new Set(items.map(i => i.mediafile_id));

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
              <h1 className="text-3xl font-bold tracking-tight">
                {isNew ? 'Creează Playlist Nou' : `Editează Playlist: ${name}`}
              </h1>
              <p className="text-muted-foreground">
                {isNew ? 'Configurați un playlist nou pentru ecranele dumneavoastră' : 'Modificați conținutul și setările playlist-ului'}
              </p>
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-4">
            <Button variant="outline" asChild>
              <Link to="/playlists">
                <ArrowLeft className="mr-2 h-4 w-4"/> 
                Înapoi la listă
              </Link>
            </Button>
            <Button onClick={handleSave} disabled={isSaving} size="lg">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Se salvează...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvează Playlist
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Container principal responsiv */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Coloana 1: Piese în playlist & nume */}
          <div className="flex-1 lg:w-2/3 space-y-6">
            <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-3">
                    <ListMusic className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  Detalii Playlist
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="playlist-name" className="text-sm font-medium">Nume Playlist</Label>
                  <Input 
                    id="playlist-name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="Introduceți numele playlist-ului" 
                    className="h-12"
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg mr-3">
                      <ListMusic className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    Piese în Playlist
                  </div>
                  <div className="flex items-center space-x-2 px-3 py-1 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">{items.length} piese</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.length > 0 ? (
                  items.map(item => 
                    <PlaylistItem 
                      key={item.id} 
                      item={item} 
                      onRemove={handleRemoveItem} 
                      onDurationChange={handleDurationChange} 
                      onMove={handleMoveItem} 
                    />
                  )
                ) : (
                  <div className="text-center py-12">
                    <div className="p-4 bg-muted/50 rounded-full mx-auto mb-4 w-fit">
                      <ListMusic className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Playlist gol</h3>
                    <p className="text-muted-foreground">
                      Adăugați fișiere media din biblioteca de pe dreapta pentru a crea playlist-ul.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Coloana 2: Fișiere media disponibile */}
          <div className="flex-1 lg:w-1/3">
            <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg mr-3">
                    <Image className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  Librărie Media
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {availableMedia.length > 0 ? (
                  availableMedia.map(item => 
                    <AvailableMediaItem 
                      key={item.id} 
                      item={item} 
                      onAdd={handleAddItem} 
                      isAdded={currentItemIds.has(item.id)} 
                    />
                  )
                ) : (
                  <div className="text-center py-8">
                    <div className="p-4 bg-muted/50 rounded-full mx-auto mb-4 w-fit">
                      <Image className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Nu există fișiere media disponibile.
                    </p>
                  </div>
                )}
              </CardContent>
              {mediaTotalItems > ITEMS_PER_PAGE && (
                <div className="px-6 pb-6">
                  <Pagination
                    currentPage={mediaCurrentPage} 
                    totalItems={mediaTotalItems} 
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={(page) => setMediaCurrentPage(page)}
                  />
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditPlaylistPage;