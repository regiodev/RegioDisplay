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

function PairScreenModal({ isOpen, onClose, onSave }) {
  const { toast } = useToast();
  const [pairingCode, setPairingCode] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name || !pairingCode) {
      setError('Numele și codul de împerechere sunt obligatorii.');
      return;
    }
    setError('');

    try {
      await apiClient.post('/screens/pair', {
        pairing_code: pairingCode.toUpperCase(),
        name,
        location
      });
      toast({ title: "Succes!", description: "Ecranul a fost împerecheat și activat." });
      onSave();
      onClose();
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'A apărut o eroare la salvarea ecranului.';
      setError(errorMessage);
      toast({ variant: "destructive", title: "Eroare", description: errorMessage });
      console.error(err);
    }
  };

  const handleClose = () => {
    setPairingCode('');
    setName('');
    setLocation('');
    setError('');
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Împerechează un Ecran Nou</DialogTitle>
          <DialogDescription>
            Introduceți codul afișat pe TV și dați un nume ecranului pentru a-l activa.
          </DialogDescription>
        </DialogHeader>
        {/* --- MODIFICARE: Grid-ul este acum responsiv --- */}
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
            <Label htmlFor="pairing-code" className="sm:text-right">
              Cod TV
            </Label>
            <Input
              id="pairing-code"
              value={pairingCode}
              onChange={(e) => setPairingCode(e.target.value)}
              className="sm:col-span-3"
              placeholder="Ex: A4B1"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
            <Label htmlFor="name" className="sm:text-right">
              Nume Ecran
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="sm:col-span-3"
              placeholder="Ex: TV Recepție"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
            <Label htmlFor="location" className="sm:text-right">
              Locație
            </Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="sm:col-span-3"
              placeholder="Opțional"
            />
          </div>
          {error && <p className="col-span-4 text-sm text-red-600 text-center">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Anulează</Button>
          <Button onClick={handleSave}>Activează Ecran</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PairScreenModal;