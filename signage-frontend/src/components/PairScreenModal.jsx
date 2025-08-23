// Cale fișier: src/components/PairScreenModal.jsx

import { useState } from 'react';
import apiClient from '../api/axios';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Monitor, MapPin, Hash, Loader2 } from 'lucide-react';

function PairScreenModal({ isOpen, onClose, onSave }) {
  const { toast } = useToast();
  const [pairingCode, setPairingCode] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!name || !pairingCode) {
      setError('Numele și codul de împerechere sunt obligatorii.');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      await apiClient.post('/screens/pair', {
        pairing_code: pairingCode.toUpperCase(),
        name,
        location
      });
      toast({ title: "Succes!", description: "Ecranul a fost împerecheat și activat." });
      onSave();
      handleClose();
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'A apărut o eroare la salvarea ecranului.';
      setError(errorMessage);
      toast({ variant: "destructive", title: "Eroare", description: errorMessage });
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return; // Prevent closing while loading
    setPairingCode('');
    setName('');
    setLocation('');
    setError('');
    setIsLoading(false);
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <Monitor className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Împerechează Ecran Nou</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                Introduceți codul afișat pe ecran și configurați detaliile pentru a activa dispozitivul.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Cod de împerechere */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="p-1 bg-orange-100 dark:bg-orange-900/30 rounded">
                <Hash className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <Label htmlFor="pairing-code" className="text-sm font-medium">
                Cod de Împerechere
              </Label>
            </div>
            <Input
              id="pairing-code"
              value={pairingCode}
              onChange={(e) => setPairingCode(e.target.value.toUpperCase())}
              placeholder="Ex: A4B1"
              className="h-12 text-center font-mono text-lg uppercase"
              maxLength={4}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Codul afișat pe ecranul TV (4 caractere)
            </p>
          </div>

          {/* Nume ecran */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded">
                <Monitor className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <Label htmlFor="name" className="text-sm font-medium">
                Nume Ecran *
              </Label>
            </div>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: TV Recepție"
              className="h-12"
              disabled={isLoading}
            />
          </div>

          {/* Locație */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded">
                <MapPin className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <Label htmlFor="location" className="text-sm font-medium">
                Locație (Opțional)
              </Label>
            </div>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex: Hol principal, Etajul 2"
              className="h-12"
              disabled={isLoading}
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-200 text-center">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter className="space-x-2">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Anulează
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !name || !pairingCode}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Se împerechează...
              </>
            ) : (
              <>
                <Monitor className="mr-2 h-4 w-4" />
                Activează Ecran
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PairScreenModal;