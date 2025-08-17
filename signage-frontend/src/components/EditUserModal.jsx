// Cale fișier: src/components/EditUserModal.jsx

import { useState, useEffect } from 'react';
import apiClient from '../api/axios';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

function EditUserModal({ user, isOpen, onClose, onSave }) {
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [quota, setQuota] = useState(0);

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setIsAdmin(user.is_admin);
      setQuota(user.disk_quota_mb);
      setPassword(''); // Resetăm câmpul parolei de fiecare dată
    }
  }, [user]);

  const handleSave = async () => {
    try {
      // Construim payload-ul doar cu datele pe care le trimitem
      const payload = {
        username: username,
        is_admin: isAdmin,
        disk_quota_mb: parseInt(quota, 10),
      };

      // Adăugăm parola doar dacă a fost introdusă una nouă
      if (password) {
        payload.password = password;
      }

      await apiClient.put(`/admin/users/${user.id}`, payload);
      toast({ title: "Succes!", description: "Utilizatorul a fost actualizat." });
      onSave();
      onClose();
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'A apărut o eroare.';
      toast({ variant: "destructive", title: "Eroare", description: errorMessage });
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editează Utilizator: {user.username}</DialogTitle>
          <DialogDescription>Modifică detaliile contului.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
              <Label htmlFor="username">Nume Utilizator (afișat)</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1" />
          </div>
          <div>
              <Label htmlFor="password">Parolă Nouă (opțional)</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Lasă gol pentru a nu schimba" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="quota">Cotă Spațiu Disc (MB)</Label>
            <Input
              id="quota"
              type="number"
              value={quota}
              onChange={(e) => setQuota(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="flex items-center space-x-2 pt-2">
            <Switch id="isAdmin" checked={isAdmin} onCheckedChange={setIsAdmin} />
            <Label htmlFor="isAdmin">Este Administrator?</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Anulează</Button>
          <Button onClick={handleSave}>Salvează Modificările</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EditUserModal;