// Cale fișier: src/pages/ForgotPasswordPage.jsx

import { useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      const response = await apiClient.post('/auth/forgot-password', { email });
      setSuccessMessage(response.data.detail);
    } catch (err) {
      setError('A apărut o eroare. Te rugăm să încerci mai târziu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-slate-950">
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-slate-200">Resetează Parola</h1>

        {successMessage ? (
          <p className="text-sm text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-md text-center">{successMessage}</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <p className="text-sm text-center text-gray-600 dark:text-slate-400">
              Introdu adresa de email a contului tău și îți vom trimite un link pentru a-ți reseta parola.
            </p>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            <div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Se trimite...' : 'Trimite Link-ul de Resetare'}
              </Button>
            </div>
          </form>
        )}

        <p className="text-sm text-center text-gray-600 dark:text-slate-400">
          Îți amintești parola?{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Mergi la autentificare
          </Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;