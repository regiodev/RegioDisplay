// Cale fișier: src/App.jsx

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const VerificationSuccessPage = lazy(() => import('./pages/VerificationSuccessPage')); // --- IMPORT NOU ---
const AdminPage = lazy(() => import('./pages/AdminPage'));
const MainLayout = lazy(() => import('./components/MainLayout'));
const MediaPage = lazy(() => import('./pages/MediaPage'));
const PlaylistsPage = lazy(() => import('./pages/PlaylistsPage'));
const ScreensPage = lazy(() => import('./pages/ScreensPage'));
const EditPlaylistPage = lazy(() => import('./pages/EditPlaylistPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));

function ProtectedRoute() {
  const { token } = useAuth();
  return token ? <MainLayout /> : <Navigate to="/login" />;
}

function AdminRoute() {
    const { user } = useAuth();
    return user && user.is_admin ? <Outlet /> : <Navigate to="/" />;
}

function App() {
  const { token, loading } = useAuth();

  if (loading) {
      return <div className="h-screen bg-slate-900" />;
  }

  return (
    <Suspense fallback={<div className="h-screen bg-slate-900 flex items-center justify-center text-white">Se încarcă...</div>}>
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/" /> : <LoginPage />} />
        <Route path="/register" element={token ? <Navigate to="/" /> : <RegisterPage />} />
        <Route path="/forgot-password" element={token ? <Navigate to="/" /> : <ForgotPasswordPage />} />
        <Route path="/reset-password" element={token ? <Navigate to="/" /> : <ResetPasswordPage />} />
        {/* --- RUTĂ NOUĂ --- */}
        <Route path="/verification-success" element={<VerificationSuccessPage />} />

        <Route path="/" element={<ProtectedRoute />}>
          <Route index element={<DashboardPage />} />
          <Route path="media" element={<MediaPage />} />
          <Route path="playlists" element={<PlaylistsPage />} />
          <Route path="playlists/:playlistId" element={<EditPlaylistPage />} />
          <Route path="screens" element={<ScreensPage />} />
          <Route path="reports" element={<ReportsPage />} />

          <Route element={<AdminRoute />}>
              <Route path="admin" element={<AdminPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;