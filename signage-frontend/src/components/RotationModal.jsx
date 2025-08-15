// Cale fișier: src/components/RotationModal.jsx

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Monitor, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import apiClient from '../api/axios';

const RotationOption = ({ icon, label, value, selectedValue, onSelect }) => (
  <div
    onClick={() => onSelect(value)}
    className={cn(
      'border-2 rounded-lg p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors',
      selectedValue === value
        ? 'border-primary bg-primary/10'
        : 'border-transparent bg-muted hover:bg-muted/80',
    )}
  >
    {icon}
    <span className="text-sm font-medium">{label}</span>
  </div>
);

function RotationModal({ screen, isOpen, onClose, onSave }) {
  const { toast } = useToast();
  const [selectedRotation, setSelectedRotation] = useState(0);

  useEffect(() => {
    if (screen) {
      setSelectedRotation(screen.rotation);
    }
  }, [screen]);

  const handleSave = async () => {
    try {
      await apiClient.put(`/screens/${screen.id}/rotation`, {
        rotation: selectedRotation,
      });
      toast({ title: 'Succes!', description: 'Setarea de rotație a fost salvată.' });
      onSave();
      onClose();
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'A apărut o eroare la salvare.';
      toast({ variant: 'destructive', title: 'Eroare', description: errorMessage });
    }
  };

  if (!screen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Setări de Rotație: {screen.name}</DialogTitle>
          <DialogDescription>
            Alegeți orientarea ecranului conform montajului fizic.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <RotationOption
            icon={<Monitor className="h-10 w-10" />}
            label="Standard (0°)"
            value={0}
            selectedValue={selectedRotation}
            onSelect={setSelectedRotation}
          />
          <RotationOption
            icon={<Smartphone className="h-10 w-10 rotate-90" />}
            label="90° (Portret)"
            value={90}
            selectedValue={selectedRotation}
            onSelect={setSelectedRotation}
          />
          <RotationOption
            icon={<Monitor className="h-10 w-10 rotate-180" />}
            label="180° (Întors)"
            value={180}
            selectedValue={selectedRotation}
            onSelect={setSelectedRotation}
          />
          <RotationOption
            icon={<Smartphone className="h-10 w-10 -rotate-90" />}
            label="270° (Portret)"
            value={270}
            selectedValue={selectedRotation}
            onSelect={setSelectedRotation}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Anulează
          </Button>
          <Button onClick={handleSave}>Salvează Modificările</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RotationModal;
