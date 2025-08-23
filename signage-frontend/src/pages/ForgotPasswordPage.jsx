// Cale fișier: src/pages/ForgotPasswordPage.jsx

import { useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);

    try {
      await apiClient.post('/auth/forgot-password', { email });
      setMessage('Dacă un cont cu acest email există, un link de resetare a parolei a fost trimis.');
    } catch (err) {
      setError('A apărut o eroare. Vă rugăm să încercați din nou.');
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
            <CardTitle className="text-2xl text-center">Resetează parola</CardTitle>
            <CardDescription className="text-center pt-2">
              Introdu adresa de email și îți vom trimite un link pentru a-ți reseta parola.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {message ? (
              <div className="text-center space-y-4">
                <p className="text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-md">{message}</p>
                <Button asChild className="w-full">
                  <Link to="/login">Înapoi la Autentificare</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="email">Adresa de Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                    className="mt-1"
                    autoComplete="email"
                  />
                </div>
                {error && <p className="text-sm text-red-600 text-center">{error}</p>}
                <div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Se trimite...' : 'Trimite link de resetare'}
                  </Button>
                </div>
                <div className="text-center">
                    <Button variant="link" asChild>
                        <Link to="/login">Înapoi la Autentificare</Link>
                    </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;