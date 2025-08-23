// Cale fișier: src/components/RePairScreenModal.jsx

import { useState } from 'react';
import apiClient from '../api/axios';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

function RePairScreenModal({ screen, isOpen, onClose, onSave }) {
  const { toast } = useToast();
  const [pairingCode, setPairingCode] = useState('');
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!pairingCode) {
      setError('Codul de împerechere este obligatoriu.');
      return;
    }
    setError('');

    try {
      await apiClient.put(`/screens/${screen.id}/re-pair`, {
        new_pairing_code: pairingCode.toUpperCase(),
      });
      toast({ title: "Succes!", description: "Ecranul a fost re-împerecheat." });
      onSave();
      onClose();
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'A apărut o eroare.';
      setError(errorMessage);
      toast({ variant: "destructive", title: "Eroare", description: errorMessage });
    }
  };

  const handleClose = () => {
    setPairingCode('');
    setError('');
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Re-împerechează: {screen?.name}</DialogTitle>
          <DialogDescription>
            Porniți noul player TV și introduceți codul de 4 caractere afișat pe ecran. Setările curente vor fi transferate noului dispozitiv.
          </DialogDescription>
        </DialogHeader>
        {/* --- MODIFICARE: Grid-ul este acum responsiv --- */}
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
            <Label htmlFor="pairing-code" className="sm:text-right">
              Cod TV Nou
            </Label>
            <Input
              id="pairing-code"
              value={pairingCode}
              onChange={(e) => setPairingCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              className="sm:col-span-3"
              placeholder="Ex: B7X2"
            />
          </div>
          {error && <p className="col-span-4 text-sm text-red-600 text-center">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Anulează</Button>
          <Button onClick={handleSave}>Salvează și Re-împerechează</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RePairScreenModal;