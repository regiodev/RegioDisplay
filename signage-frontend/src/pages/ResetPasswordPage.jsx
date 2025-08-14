// Cale fișier: src/pages/ResetPasswordPage.jsx

import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    } else {
      setError("Token invalid sau lipsă. Vă rugăm solicitați un nou link de resetare.");
    }
  }, [searchParams]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Parolele nu se potrivesc.');
      return;
    }
    setError('');
    setMessage('');
    setIsSubmitting(true);

    try {
      await apiClient.post('/auth/reset-password', { token, new_password: newPassword });
      setMessage('Parola a fost resetată cu succes! Acum te poți autentifica.');
      setTimeout(() => navigate('/login'), 3000); // Redirect to login after 3 seconds
    } catch (err) {
      setError(err.response?.data?.detail || 'Link-ul de resetare este invalid sau a expirat.');
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
            <CardTitle className="text-2xl text-center">Setează o parolă nouă</CardTitle>
          </CardHeader>
          <CardContent>
            {message ? (
               <div className="text-center text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-md">{message}</div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="new-password">Parola Nouă</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="mt-1"
                    autoComplete="new-password"
                  />
                   <p className="text-xs text-gray-500 mt-2">
                    Minim 8 caractere, o majusculă și o cifră.
                  </p>
                </div>
                <div>
                  <Label htmlFor="confirm-password">Confirmă Parola Nouă</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="mt-1"
                    autoComplete="new-password"
                  />
                </div>
                {error && <p className="text-sm text-red-600 text-center bg-red-50 dark:bg-red-900/20 p-3 rounded-md">{error}</p>}
                <Button type="submit" className="w-full" disabled={isSubmitting || !token}>
                  {isSubmitting ? 'Se salvează...' : 'Resetează Parola'}
                </Button>
              </form>
            )}
             <div className="mt-4 text-center">
                <Button variant="link" asChild>
                    <Link to="/login">Înapoi la Autentificare</Link>
                </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ResetPasswordPage;