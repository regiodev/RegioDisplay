// Cale fișier: src/App.jsx

import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Importurile Componentelor
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AdminPage from './pages/AdminPage';
import MainLayout from './components/MainLayout';
import MediaPage from './pages/MediaPage';
import PlaylistsPage from './pages/PlaylistsPage';
import ScreensPage from './pages/ScreensPage';
import EditPlaylistPage from './pages/EditPlaylistPage';

/**
 * Componentă "gardian" pentru rutele care necesită autentificare.
 */
function ProtectedRoute() {
  const { token } = useAuth();
  return token ? <MainLayout /> : <Navigate to="/login" />;
}

/**
 * Componentă "gardian" pentru rutele care necesită drepturi de administrator.
 */
function AdminRoute() {
    const { user } = useAuth();
    // Verificăm dacă utilizatorul este logat ȘI dacă este administrator
    return user && user.is_admin ? <Outlet /> : <Navigate to="/" />;
}

/**
 * Componenta principală a aplicației, care definește toate rutele.
 */
function App() {
  const { token, loading } = useAuth();

  // Afișăm un ecran gol pe durata încărcării inițiale a stării de autentificare
  if (loading) {
      return <div className="h-screen bg-slate-900" />;
  }

  return (
    <Routes>
      {/* Rute Publice (accesibile fără login) */}
      <Route path="/login" element={token ? <Navigate to="/" /> : <LoginPage />} />
      <Route path="/register" element={token ? <Navigate to="/" /> : <RegisterPage />} />
      <Route path="/forgot-password" element={token ? <Navigate to="/" /> : <ForgotPasswordPage />} />
      <Route path="/reset-password" element={token ? <Navigate to="/" /> : <ResetPasswordPage />} />

      {/* Rute Protejate (necesită login) */}
      <Route path="/" element={<ProtectedRoute />}>
        {/* Ruta principală redirecționează către media */}
        <Route index element={<Navigate to="/media" />} />
        
        {/* Rute pentru utilizatori normali */}
        <Route path="media" element={<MediaPage />} />
        <Route path="playlists" element={<PlaylistsPage />} />
        <Route path="playlists/:playlistId" element={<EditPlaylistPage />} />
        <Route path="screens" element={<ScreensPage />} />

        {/* Grup de rute protejate suplimentar pentru Admini */}
        <Route element={<AdminRoute />}>
            <Route path="admin" element={<AdminPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;