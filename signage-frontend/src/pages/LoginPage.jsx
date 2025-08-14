// Cale fișier: src/pages/LoginPage.jsx

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Adresa de email sau parola sunt incorecte.';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
            <img src="/logo.png" alt="RegioDisplay Logo" className="mx-auto h-12 w-auto" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">Autentificare</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="username">Email</Label>
                  <Input 
                    id="username" 
                    type="text" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)} 
                    required 
                    className="mt-1" 
                    autoComplete="username"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password">Parolă</Label>
                    <Link to="/forgot-password" className="text-sm font-medium text-primary hover:text-primary/80 underline">
                      Am uitat parola
                    </Link>
                  </div>
                  <Input 
                    id="password" 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    className="mt-1" 
                    autoComplete="current-password"
                  />
                </div>
                {error && <p className="text-sm text-red-600 text-center bg-red-50 dark:bg-red-900/20 p-3 rounded-md">{error}</p>}
                <div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Se autentifică...' : 'Login'}
                  </Button>
                </div>
            </form>
            <p className="mt-6 text-sm text-center text-gray-600 dark:text-slate-400">
              Nu ai cont?{' '}
              <Link to="/register" className="font-medium text-primary hover:text-primary/80 underline">
                Înregistrează-te
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default LoginPage;