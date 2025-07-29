import { useState, useEffect } from 'react';
import apiClient from '../api/axios';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function AssignPlaylistModal({ screen, isOpen, onClose, onSave }) {
  const [playlists, setPlaylists] = useState([]);
  
  // MODIFICARE 1: Folosim 'none' ca valoare implicită pentru "Niciunul"
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(
    screen.assigned_playlist?.id?.toString() || 'none'
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const response = await apiClient.get('/playlists/');
        setPlaylists(response.data);
      } catch (error) {
        console.error("Failed to fetch playlists", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlaylists();
  }, []);

  const handleSave = async () => {
    // MODIFICARE 2: La salvare, transformăm 'none' în null pentru API
    const payload = {
      playlist_id: selectedPlaylistId === 'none' ? null : parseInt(selectedPlaylistId, 10),
    };
    
    try {
      await apiClient.post(`/screens/${screen.id}/assign_playlist`, payload);
      onSave();
      onClose();
    } catch (error) {
      alert('A apărut o eroare la salvare.');
      console.error(error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editează Playlist pentru: {screen.name}</DialogTitle>
          <DialogDescription>
            Selectează un playlist nou pentru acest ecran sau alege "Niciunul" pentru a-l dezasigna.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {loading ? <p>Se încarcă playlist-urile...</p> : (
            <Select 
              value={selectedPlaylistId} 
              onValueChange={setSelectedPlaylistId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selectează un playlist" />
              </SelectTrigger>
              <SelectContent>
                {/* MODIFICARE 3: Folosim value="none" */}
                <SelectItem value="none">-- Niciunul --</SelectItem>
                {playlists.map(p => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Anulează</Button>
          <Button onClick={handleSave} disabled={loading}>Salvează</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AssignPlaylistModal;