// Cale fișier: src/contexts/AuthContext.jsx

import { createContext, useState, useContext, useEffect } from 'react';
import apiClient from '../api/axios';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Această funcție rulează o singură dată la încărcarea aplicației
    const initializeAuth = async () => {
      if (token) {
        try {
          // Setăm header-ul pentru toate cererile viitoare
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const response = await apiClient.get('/users/me');
          setUser(response.data);
        } catch (error) {
          // Token-ul este vechi sau invalid, îl curățăm
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []); // [] înseamnă că rulează doar la montarea componentei

  const login = async (username, password) => {
    const response = await apiClient.post(
      '/auth/login',
      new URLSearchParams({ username, password }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const newToken = response.data.access_token;
    
    // Salvăm token-ul în localStorage
    localStorage.setItem('token', newToken);
    // Setăm header-ul pentru cererile viitoare
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    
    // După ce am setat token-ul, încărcăm imediat datele utilizatorului
    const userResponse = await apiClient.get('/users/me');
    setUser(userResponse.data);
    
    // Abia acum actualizăm starea token-ului pentru a declanșa navigarea
    setToken(newToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    delete apiClient.defaults.headers.common['Authorization'];
  };

  const value = { token, user, loading, login, logout };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}