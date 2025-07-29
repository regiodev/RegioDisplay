// Cale fișier: src/pages/RegisterPage.jsx

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function RegisterPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await apiClient.post('/users', {
        email,
        username,
        password,
      });

      toast({
        title: "Înregistrare reușită!",
        description: "Ți-am trimis un email de verificare. Te rugăm să-ți activezi contul.",
      });

      // Redirecționăm utilizatorul la pagina de login după succes
      navigate('/login');

    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'A apărut o eroare la înregistrare.';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-slate-950">
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-slate-200">Creează Cont Nou</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="email">Email (va fi și username-ul de login)</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="username">Nume Utilizator (afișat)</Label>
            <Input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="password">Parolă</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          <div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Se înregistrează...' : 'Înregistrează-te'}
            </Button>
          </div>
        </form>
        <p className="text-sm text-center text-gray-600 dark:text-slate-400">
          Ai deja cont?{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Autentifică-te
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;