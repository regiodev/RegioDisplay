// Cale fișier: src/components/MainLayout.jsx

import { useState } from 'react';
import { Link, Outlet, useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { Menu, X } from 'lucide-react'; // Importăm iconițele necesare

function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // --- NOU: Stare pentru meniul mobil ---
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return null; 
  }

  // --- NOU: Structură de date pentru link-urile de navigație pentru a evita repetiția ---
  const navLinks = [
    { to: "/", text: "Panou de control" },
    { to: "/media", text: "Management media" },
    { to: "/playlists", text: "Playlists" },
    { to: "/screens", text: "Ecrane" },
    { to: "/reports", text: "Rapoarte" },
  ];

  const adminLink = { to: "/admin", text: "Administrare Utilizatori", isAdmin: true };

  // --- NOU: Componenta internă pentru a randa link-urile și a închide meniul mobil la click ---
  const NavLinksComponent = ({ isMobile = false }) => (
    <>
      {navLinks.map(link => (
        <NavLink 
          key={link.to} 
          to={link.to} 
          end // 'end' prop asigură potrivirea exactă pentru link-ul rădăcină "/"
          onClick={() => isMobile && setIsMobileMenuOpen(false)}
          className={({ isActive }) => 
            `block px-4 py-2 mt-2 text-sm rounded transition-colors ${
              isActive 
                ? 'font-semibold bg-primary/10 text-primary dark:text-primary-foreground' 
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`
          }
        >
          {link.text}
        </NavLink>
      ))}
      {user && user.is_admin && (
        <NavLink 
          to={adminLink.to} 
          onClick={() => isMobile && setIsMobileMenuOpen(false)}
          className={({ isActive }) => 
            `block px-4 py-2 mt-2 text-sm rounded transition-colors ${
              isActive
                ? 'font-bold bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300'
                : 'font-bold text-indigo-500 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`
          }
        >
          {adminLink.text}
        </NavLink>
      )}
    </>
  );

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-900">
      {/* --- MODIFICARE: Sidebar pentru Desktop, ascuns pe mobil --- */}
      <div className="hidden md:flex md:w-64 bg-white dark:bg-slate-950 text-slate-900 dark:text-white flex-col flex-shrink-0 border-r border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-center px-4 py-3 border-b border-slate-200 dark:border-slate-800" style={{ height: '65px' }}>
          <Link to="/">
            <img 
              src="https://display.regio-cloud.ro/static/logo.png" 
              alt="RegioDisplay Logo" 
              className="h-10"
            />
          </Link>
        </div>
        
        <nav className="flex-grow px-4 py-4">
          <NavLinksComponent />
        </nav>

        <div className="px-8 py-4 border-t border-slate-200 dark:border-slate-800">
          <Button onClick={handleLogout} variant="destructive" className="w-full">
            Logout
          </Button>
        </div>
      </div>

      {/* --- NOU: Meniu lateral pentru Mobil (Drawer) --- */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Overlay */}
          <div className="fixed inset-0 bg-black/60" onClick={() => setIsMobileMenuOpen(false)}></div>
          
          {/* Meniul propriu-zis */}
          <div className="fixed top-0 left-0 bottom-0 w-64 bg-white dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col border-r border-slate-200 dark:border-slate-800 transform transition-transform ease-in-out"
               style={{ transform: isMobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)' }}>
            
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800" style={{ height: '65px' }}>
              <Link to="/" onClick={() => setIsMobileMenuOpen(false)}>
                <img src="https://display.regio-cloud.ro/static/logo.png" alt="RegioDisplay Logo" className="h-10"/>
              </Link>
              <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                <X className="h-6 w-6" />
              </Button>
            </div>
            
            <nav className="flex-grow px-4 py-4">
              <NavLinksComponent isMobile={true} />
            </nav>

            <div className="px-8 py-4 border-t border-slate-200 dark:border-slate-800">
              <Button onClick={handleLogout} variant="destructive" className="w-full">
                Logout
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex justify-between items-center bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 p-4 shrink-0" style={{ height: '65px' }}>
          {/* --- NOU: Butonul Hamburger, vizibil doar pe mobil --- */}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="h-6 w-6" />
            <span className="sr-only">Deschide meniul</span>
          </Button>

          <div className="hidden md:block">
            <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Bun venit, {user.username}!</h1>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-600 dark:text-slate-400 hidden sm:inline">Tema:</span>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      
      <Toaster />
    </div>
  );
}

export default MainLayout;