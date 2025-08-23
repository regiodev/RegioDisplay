// Cale fișier: src/pages/RegisterPage.jsx

import { useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function RegisterPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError("Parolele introduse nu se potrivesc.");
      return;
    }
    
    setIsSubmitting(true);

    try {
      await apiClient.post('/users/', {
        email,
        username,
        password
      });
      setRegistrationSuccess(true);
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'A apărut o eroare la înregistrare.';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (registrationSuccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900 px-4">
        <Card className="w-full max-w-md text-center">
            <CardHeader>
                <CardTitle className="text-2xl text-green-600">Înregistrare reușită!</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-slate-600 dark:text-slate-300">
                    Un email de verificare a fost trimis la adresa <strong>{email}</strong>. Te rugăm să accesezi link-ul din email pentru a-ți activa contul.
                </p>
                <Button asChild className="mt-6 w-full">
                    <Link to="/login">Mergi la Autentificare</Link>
                </Button>
            </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
            <img src="/logo.png" alt="RegioDisplay Logo" className="mx-auto h-12 w-auto" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">Creează un cont nou</CardTitle>
            <CardDescription className="text-center pt-2">Completează formularul pentru a începe</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1" autoComplete="email" />
              </div>
              <div>
                <Label htmlFor="username">Nume utilizator (afișat)</Label>
                <Input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className="mt-1" autoComplete="username" />
              </div>
              <div>
                <Label htmlFor="password">Parolă</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1" autoComplete="new-password" />
                <p className="text-xs text-gray-500 mt-2">
                    Minim 8 caractere, o majusculă și o cifră.
                </p>
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirmă Parola</Label>
                <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="mt-1" autoComplete="new-password" />
              </div>

              {error && <p className="text-sm text-red-600 text-center bg-red-50 dark:bg-red-900/20 p-3 rounded-md">{error}</p>}
              
              <div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Se înregistrează...' : 'Înregistrează-te'}
                </Button>
              </div>
            </form>
            <p className="mt-6 text-sm text-center text-gray-600 dark:text-slate-400">
              Ai deja cont?{' '}
              <Link to="/login" className="font-medium text-primary hover:text-primary/80 underline">
                Autentifică-te
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default RegisterPage;