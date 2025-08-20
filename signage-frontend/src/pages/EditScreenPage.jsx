import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';
import useUnsavedChanges from '../hooks/useUnsavedChanges';
import UnsavedChangesDialog from '../components/UnsavedChangesDialog';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RotateCw, Tv, KeyRound, ListVideo, Save, X, Loader2, MapPin, Monitor, Smartphone, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import ScreenIcon from '@/components/ui/screen-icon';

const rotationOptions = [
  { 
    value: 0, 
    label: '0° (Normal)', 
    description: 'Landscape - jos normal',
    icon: <ScreenIcon rotation={0} size={48} />
  },
  { 
    value: 90, 
    label: '90° (Dreapta)', 
    description: 'Portrait - jos la dreapta',
    icon: <ScreenIcon rotation={90} size={48} />
  },
  { 
    value: 180, 
    label: '180° (Inversat)', 
    description: 'Landscape - jos inversat',
    icon: <ScreenIcon rotation={180} size={48} />
  },
  { 
    value: 270, 
    label: '270° (Stânga)', 
    description: 'Portrait - jos la stânga',
    icon: <ScreenIcon rotation={270} size={48} />
  },
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
  const [location, setLocation] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState(null); // Inițializăm cu null pentru a detecta loading
  const [rotation, setRotation] = useState(0);
  const [pairingCode, setPairingCode] = useState('');
  const [originalPairingCode, setOriginalPairingCode] = useState('');

  // Initial data for unsaved changes detection
  const [initialData, setInitialData] = useState({});

  // Current form data for comparison
  const currentData = useMemo(() => ({
    name,
    location,
    selectedPlaylist,
    rotation,
    pairingCode
  }), [name, location, selectedPlaylist, rotation, pairingCode]);

  // Unsaved changes protection
  const unsavedChanges = useUnsavedChanges(
    initialData,
    currentData,
    async () => {
      await handleSave();
    },
    {
      ignoreFields: ['originalPairingCode'], // Ignoră câmpurile care nu afectează salvarea
      enableBeforeUnload: true,
      enableRouterProtection: true
    }
  );

  useEffect(() => {
    const fetchScreenDetails = async () => {
      try {
        // Încărcăm playlist-urile mai întâi
        const playlistsResponse = await apiClient.get('/playlists/');
        setPlaylists(playlistsResponse.data);

        // Apoi încărcăm datele ecranului și setăm valorile
        const screenResponse = await apiClient.get(`/screens/${id}`);
        const screenData = screenResponse.data;
        
        const nameValue = screenData.name || '';
        const locationValue = screenData.location || '';
        const rotationValue = screenData.rotation || 0;
        const pairingCodeValue = screenData.pairing_code || '';
        const playlistValue = screenData.assigned_playlist?.id ? String(screenData.assigned_playlist.id) : 'null';

        setName(nameValue);
        setLocation(locationValue);
        setRotation(rotationValue);
        setOriginalPairingCode(pairingCodeValue);
        setPairingCode(pairingCodeValue);
        setSelectedPlaylist(playlistValue);

        // Setează datele inițiale pentru detectarea modificărilor
        const initialFormData = {
          name: nameValue,
          location: locationValue,
          selectedPlaylist: playlistValue,
          rotation: rotationValue,
          pairingCode: pairingCodeValue
        };
        setInitialData(initialFormData);

      } catch {
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
        location,
        rotation,
        assigned_playlist_id: selectedPlaylist === 'null' ? null : parseInt(selectedPlaylist, 10),
      };

      await apiClient.put(`/screens/${screenIdToUpdate}`, finalPayload);
      
      // Actualizează datele inițiale după salvare cu succes
      unsavedChanges.updateInitialData(currentData);
      
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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="p-4 md:p-8 mx-auto max-w-4xl space-y-8">
        {/* Header îmbunătățit */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => unsavedChanges.attemptAction(() => navigate('/screens'), 'navigate')}
              className="hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Setări Ecran</h1>
              <p className="text-muted-foreground">
                Configurați setările pentru ecranul selectat
              </p>
            </div>
          </div>
          
          {/* Status indicator */}
          <div className="flex items-center space-x-2 px-3 py-2 bg-muted/50 rounded-lg">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">Ecran activ</span>
          </div>
        </div>

        {/* Informații de bază - grup */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-3">
                  <Tv className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                Nume Ecran
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Numele ecranului" 
                className="text-lg"
              />
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg mr-3">
                  <MapPin className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                Locație
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input 
                value={location} 
                onChange={(e) => setLocation(e.target.value)} 
                placeholder="Locația ecranului (opțional)" 
                className="text-lg"
              />
            </CardContent>
          </Card>
        </div>

        {/* Playlist Assignment */}
        <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg mr-3">
                <ListVideo className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              Playlist Asignat
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Selectați playlist-ul care va fi afișat pe acest ecran
            </p>
          </CardHeader>
          <CardContent>
            {!loading && selectedPlaylist !== null ? (
              <Select value={selectedPlaylist} onValueChange={setSelectedPlaylist}>
                <SelectTrigger className="text-lg h-12">
                  <SelectValue placeholder="Selectează un playlist" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">
                    <div className="flex items-center">
                      <X className="h-4 w-4 mr-2 text-muted-foreground" />
                      Niciun playlist
                    </div>
                  </SelectItem>
                  {playlists.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      <div className="flex items-center">
                        <ListVideo className="h-4 w-4 mr-2 text-purple-500" />
                        {p.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center justify-center p-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Se încarcă datele...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Screen Rotation */}
        <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg mr-3">
                <Monitor className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              Rotație Ecran
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Selectați orientarea ecranului. Punctul indică partea de jos a ecranului.
            </p>
          </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {rotationOptions.map(opt => (
              <div 
                key={opt.value} 
                onClick={() => setRotation(opt.value)} 
                className={cn(
                  'flex flex-col items-center justify-center p-6 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md',
                  rotation === opt.value 
                    ? 'border-primary bg-primary/10 text-primary shadow-lg ring-2 ring-primary/20' 
                    : 'border-muted hover:border-primary/50 hover:bg-muted/50'
                )}
              >
                <div className="mb-3">
                  {opt.icon}
                </div>
                <span className="text-sm font-medium text-center leading-tight">{opt.label}</span>
                <span className="text-xs text-muted-foreground text-center mt-1">{opt.description}</span>
              </div>
            ))}
          </div>
          
          {/* Preview actual selection */}
          <div className="mt-6 p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="scale-75">
                  <ScreenIcon rotation={rotation} size={32} />
                </div>
                <div>
                  <p className="font-medium">Rotația selectată: {rotation}°</p>
                  <p className="text-sm text-muted-foreground">
                    {rotationOptions.find(opt => opt.value === rotation)?.description}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  {rotation === 0 || rotation === 180 ? 'Mod Landscape' : 'Mod Portrait'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

        {/* Re-pairing Section */}
        <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg mr-3">
                <KeyRound className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              Re-împerechere Dispozitiv
            </CardTitle>
            <div className="flex items-start space-x-2 mt-2 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Introduceți noul cod de 6 caractere pentru a transfera aceste setări pe un dispozitiv nou.
                Această operație va dezactiva dispozitivul curent.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <Input 
              value={pairingCode} 
              onChange={(e) => setPairingCode(e.target.value.toUpperCase())} 
              placeholder="COD-NOU" 
              className="uppercase tracking-widest text-center font-mono text-lg h-12" 
              maxLength={6} 
            />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end items-center gap-4 pt-8 border-t bg-background/80 backdrop-blur-sm sticky bottom-0 py-4 -mx-4 px-4 md:-mx-8 md:px-8">
          <Button 
            variant="outline" 
            onClick={() => unsavedChanges.attemptAction(() => navigate('/screens'), 'navigate')} 
            disabled={saving}
            className="w-full sm:w-auto"
          >
            <X className="mr-2 h-4 w-4" />
            Renunță
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            size="lg"
            className="w-full sm:w-auto bg-primary hover:bg-primary/90"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Se salvează...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvează Modificările
              </>
            )}
          </Button>
        </div>

        {/* Unsaved Changes Dialog */}
        <UnsavedChangesDialog
          {...unsavedChanges.confirmDialogProps}
          isSaving={saving}
        />
      </div>
    </div>
  );
}

export default EditScreenPage;
