// Cale fișier: src/components/MainLayout.jsx

import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";

function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // --- CORECȚIE DE SIGURANȚĂ ADĂUGATĂ AICI ---
  // Dacă, din orice motiv, layout-ul este randat fără un utilizator valid,
  // nu afișăm nimic pentru a preveni o eroare.
  if (!user) {
    return null; 
  }

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-900">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col flex-shrink-0 border-r border-slate-200 dark:border-slate-800">
        <div className="px-8 py-4 text-2xl font-bold border-b border-slate-200 dark:border-slate-800">
          Panou Admin
        </div>
        <nav className="flex-grow px-4 py-4">
          <Link to="/media" className="block px-4 py-2 mt-2 text-sm text-slate-600 dark:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
            Management Media
          </Link>
          <Link to="/playlists" className="block px-4 py-2 mt-2 text-sm text-slate-600 dark:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
            Playlists
          </Link>
          <Link to="/screens" className="block px-4 py-2 mt-2 text-sm text-slate-600 dark:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
            Ecrane
          </Link>
          
          {/* Link-ul de admin este deja protejat cu o verificare 'user && ...' */}
          {user && user.is_admin && (
            <Link to="/admin" className="block px-4 py-2 mt-2 text-sm font-bold text-indigo-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
              Administrare Utilizatori
            </Link>
          )}
        </nav>
        <div className="px-8 py-4 border-t border-slate-200 dark:border-slate-800">
          <Button onClick={handleLogout} variant="destructive" className="w-full">
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <header className="flex justify-between items-center bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 p-4">
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Bun venit, {user.username}!</h1>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">Selectează Tema:</span>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      
      <Toaster />
    </div>
  );
}

export default MainLayout;