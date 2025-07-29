// Cale fișier: src/pages/ResetPasswordPage.jsx

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../api/axios';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError("Token-ul de resetare lipsește sau este invalid. Te rugăm să reîncerci solicitarea.");
    }
  }, [token]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError("Parolele nu se potrivesc.");
      return;
    }
    if (!token) return;

    setError('');
    setIsSubmitting(true);

    try {
      await apiClient.post('/auth/reset-password', {
        token,
        new_password: password,
      });
      toast({
        title: "Succes!",
        description: "Parola ta a fost resetată. Te poți autentifica acum.",
      });
      navigate('/login');
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'A apărut o eroare la resetarea parolei.';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-slate-950">
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-slate-200">Setează o Parolă Nouă</h1>

        {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-md text-center">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="password">Parolă Nouă</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="confirm-password">Confirmă Parola Nouă</Label>
            <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>
          <div>
            <Button type="submit" className="w-full" disabled={isSubmitting || !token}>
              {isSubmitting ? 'Se salvează...' : 'Salvează Parola Nouă'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ResetPasswordPage;