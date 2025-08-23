// Cale fișier: src/pages/VerificationSuccessPage.jsx

import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function VerificationSuccessPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-900">
      <Card className="w-full max-w-md text-center p-4">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-green-600">
            Activare finalizată cu succes!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-gray-600 dark:text-slate-300">
            Contul tău a fost validat și este acum activ. Te poți autentifica pentru a accesa panoul de control.
          </p>
          <Button asChild className="w-full">
            <Link to="/login">Mergi la pagina de autentificare</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default VerificationSuccessPage;