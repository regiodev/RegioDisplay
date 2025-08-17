import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RotateCw, Tv, KeyRound, ListVideo, Save, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const rotationOptions = [
  { value: 0, label: '0° (Normal)', icon: <RotateCw size={24} /> },
  { value: 90, label: '90° (Dreapta)', icon: <RotateCw size={24} style={{ transform: 'rotate(90deg)' }} /> },
  { value: 180, label: '180° (Inversat)', icon: <RotateCw size={24} style={{ transform: 'rotate(180deg)' }} /> },
  { value: 270, label: '270° (Stânga)', icon: <RotateCw size={24} style={{ transform: 'rotate(270deg)' }} /> },
];

function EditScreenPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [playlists, setPlaylists] = useState([]);

  // Form state
  const [name, setName] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState('null');
  const [rotation, setRotation] = useState(0);
  const [pairingCode, setPairingCode] = useState('');
  const [originalPairingCode, setOriginalPairingCode] = useState('');

  useEffect(() => {
    const fetchScreenDetails = async () => {
      try {
        const screenResponse = await apiClient.get(`/screens/${id}`);
        const screenData = screenResponse.data;
        setName(screenData.name);
        setRotation(screenData.rotation || 0);
        setOriginalPairingCode(screenData.pairing_code || '');
        setPairingCode(screenData.pairing_code || '');
        setSelectedPlaylist(screenData.assigned_playlist_id ? String(screenData.assigned_playlist_id) : 'null');

        const playlistsResponse = await apiClient.get('/playlists/');
        setPlaylists(playlistsResponse.data);

      } catch (error) {
        toast({ variant: 'destructive', title: 'Eroare', description: 'Nu s-au putut încărca detaliile ecranului.' });
      } finally {
        setLoading(false);
      }
    };

    fetchScreenDetails();
  }, [id, toast]);

  const handleSave = async () => {
    setSaving(true);
    const hasPairingCodeChanged = pairingCode && pairingCode !== originalPairingCode;

    try {
      let screenIdToUpdate = id;

      if (hasPairingCodeChanged) {
        try {
          const rePairResponse = await apiClient.put(`/screens/${id}/re-pair`, { new_pairing_code: pairingCode });
          screenIdToUpdate = rePairResponse.data.id; // Use the new screen ID for the final update
          toast({ title: 'Succes', description: 'Ecranul a fost re-împerecheat cu succes.' });
        } catch (rePairError) {
          toast({ variant: 'destructive', title: 'Eroare Re-împerechere', description: rePairError.response?.data?.detail || 'Codul de împerechere este invalid sau deja folosit.' });
          setSaving(false);
          return; // Stop execution if re-pairing fails
        }
      }

      const finalPayload = {
        name,
        rotation,
        assigned_playlist_id: selectedPlaylist === 'null' ? null : parseInt(selectedPlaylist, 10),
      };

      await apiClient.put(`/screens/${screenIdToUpdate}`, finalPayload);
      
      toast({ title: 'Succes!', description: 'Setările ecranului au fost salvate.' });
      navigate('/screens');

    } catch (error) {
      toast({ variant: 'destructive', title: 'Eroare la Salvarea Finală', description: 'Re-împerecherea a avut succes, dar salvarea celorlalte detalii a eșuat.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Se încarcă setările ecranului...</div>;
  }

  return (
    <div className="p-4 md:p-8 mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Setări Ecran</h1>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center"><Tv className="mr-2" /> Nume Ecran</CardTitle></CardHeader>
        <CardContent><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Numele ecranului" /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center"><ListVideo className="mr-2" /> Playlist Asignat</CardTitle></CardHeader>
        <CardContent>
          <Select value={selectedPlaylist} onValueChange={setSelectedPlaylist}>
            <SelectTrigger><SelectValue placeholder="Selectează un playlist" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="null">Niciun playlist</SelectItem>
              {playlists.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center"><RotateCw className="mr-2" /> Rotație Ecran</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {rotationOptions.map(opt => (
            <div key={opt.value} onClick={() => setRotation(opt.value)} className={cn('flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all', rotation === opt.value ? 'border-primary bg-primary/10 text-primary' : 'border-transparent hover:border-slate-300 dark:hover:border-slate-700')}>
              {opt.icon}
              <span className="mt-2 text-sm font-medium">{opt.label}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center"><KeyRound className="mr-2" /> Re-împerechere</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2">Introduceți noul cod de 6 caractere pentru a transfera aceste setări pe un dispozitiv nou.</p>
          <Input value={pairingCode} onChange={(e) => setPairingCode(e.target.value.toUpperCase())} placeholder="COD-NOU" className="uppercase tracking-widest text-center font-mono" maxLength={6} />
        </CardContent>
      </Card>

      <div className="flex justify-end items-center gap-4 pt-4">
        <Button variant="outline" onClick={() => navigate('/screens')} disabled={saving}><X className="mr-2 h-4 w-4"/> Renunță</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4"/>}
          Salvează Modificările
        </Button>
      </div>
    </div>
  );
}

export default EditScreenPage;
