// Cale fișier: src/pages/LoginPage.jsx

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Verificăm dacă URL-ul conține ?verified=true
    if (searchParams.get('verified') === 'true') {
      setSuccessMessage('Contul tău a fost activat cu succes! Te poți autentifica.');
    }
  }, [searchParams]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    // --- ADAUGĂ ACEASTĂ LINIE PENTRU DEPANARE ---
    console.log("Se încearcă login cu:", { username, password });
    // --- FINAL LINIE PENTRU DEPANARE ---

    setError('');
    setSuccessMessage('');
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Numele de utilizator sau parola sunt incorecte.';
      setError(errorMessage);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-slate-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-slate-950">
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-slate-200">Autentificare</h1>

        {successMessage && <p className="text-sm text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-md text-center">{successMessage}</p>}

        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="username">Email</Label>
              <Input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className="mt-1" />
            </div>
            <div>
              {/* --- AICI ESTE BLOCUL CORECTAT --- */}
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Parolă</Label>
                <Link to="/forgot-password" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                  Am uitat parola
                </Link>
              </div>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1" />
              {/* --- SFÂRȘIT BLOC CORECTAT --- */}
            </div>
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            <div>
              <Button type="submit" className="w-full">Login</Button>
            </div>
        </form>
        <p className="text-sm text-center text-gray-600 dark:text-slate-400">
          Nu ai cont?{' '}
          <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
            Înregistrează-te
          </Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;