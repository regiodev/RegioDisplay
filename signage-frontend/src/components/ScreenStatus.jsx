// Cale fișier: src/components/ScreenStatus.jsx

import React, { useState, useEffect } from 'react';

function ScreenStatus({ lastSeen, isOnline, connectedSince }) {
  
  // Stare internă pentru a stoca textul dinamic. Inițializăm cu un text generic.
  const [dynamicText, setDynamicText] = useState('');

  useEffect(() => {
    // Dacă statusul este Online, pornim un cronometru care actualizează textul.
    if (isOnline && connectedSince) {
      
      const formatOnlineDuration = () => {
        const startDate = new Date(connectedSince);
        const now = new Date();
        const diffSeconds = Math.floor((now - startDate) / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);

        if (diffMinutes < 1) {
          return "Online de câteva secunde";
        }
        if (diffMinutes === 1) {
          return "Online de un minut";
        }
        // Regulă gramaticală: folosim "de" pentru numerele >= 20 sau 
        // pentru cele care nu se termină în 1 (cu excepția lui 11).
        // Pentru simplitate și consistență, folosim "de" pentru toate numerele > 1.
        return `Online de ${diffMinutes} minute`;
      };

      // Actualizăm textul imediat la afișare
      setDynamicText(formatOnlineDuration());

      // Pornim un timer care va actualiza textul la fiecare 30 de secunde
      const intervalId = setInterval(() => {
        setDynamicText(formatOnlineDuration());
      }, 30000); // 30000 ms = 30 secunde

      // Funcția de curățare: oprim cronometrul când componenta nu mai este afișată
      return () => clearInterval(intervalId);
    }
  }, [isOnline, connectedSince]); // Acest efect se va reporni dacă se schimbă starea sau conexiunea


  if (isOnline) {
    return (
      <div className="flex flex-col">
        <div className="flex items-center">
          <span className="h-3 w-3 rounded-full bg-green-500 mr-2"></span>
          <span className="font-semibold text-green-600">Online</span>
        </div>
        <span className="text-xs text-gray-500 dark:text-slate-400 mt-1">
          {/* Afișăm textul din starea dinamică a componentei */}
          {dynamicText}
        </span>
      </div>
    );
  }

  // Cazul 'Offline' (rămâne neschimbat)
  const formattedLastSeen = lastSeen 
    ? new Date(lastSeen).toLocaleString('ro-RO', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      })
    : 'Niciodată';

  return (
    <div className="flex flex-col">
      <div className="flex items-center">
        <span className="h-3 w-3 rounded-full bg-red-500 mr-2"></span>
        <span className="font-semibold text-red-600">Offline</span>
      </div>
      <span className="text-xs text-gray-500 dark:text-slate-400 mt-1">
        Ultima dată online: {formattedLastSeen}
      </span>
    </div>
  );
}

export default ScreenStatus;