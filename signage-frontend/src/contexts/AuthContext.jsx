// Cale fișier: src/contexts/AuthContext.jsx

import { createContext, useCallback, useContext, useEffect, useState } from 'react'; // Adăugăm useCallback
import apiClient from '../api/axios';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // --- NOU: Funcție pentru a reîncărca datele utilizatorului ---
  const fetchUser = useCallback(async () => {
    if (localStorage.getItem('token')) {
      try {
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${localStorage.getItem(
          'token',
        )}`;
        const response = await apiClient.get('/users/me');
        setUser(response.data);
        return response.data;
      } catch (error) {
        // Token invalid, facem logout
        logout();
      }
    }
    return null;
  }, []);
  // --- FINAL FUNCȚIE NOUĂ ---

  useEffect(() => {
    const initializeAuth = async () => {
      await fetchUser();
      setLoading(false);
    };
    initializeAuth();
  }, [fetchUser]);

  const login = async (username, password) => {
    const response = await apiClient.post(
      '/auth/login',
      new URLSearchParams({ username, password }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
    const newToken = response.data.access_token;

    localStorage.setItem('token', newToken);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

    const userResponse = await apiClient.get('/users/me');
    setUser(userResponse.data);

    setToken(newToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    delete apiClient.defaults.headers.common['Authorization'];
  };

  // --- MODIFICAT: Adăugăm funcția 'fetchUser' la valoarea contextului ---
  const value = { token, user, loading, login, logout, refreshUser: fetchUser };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}
