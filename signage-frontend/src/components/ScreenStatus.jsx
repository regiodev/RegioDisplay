// Cale fișier: src/components/ScreenStatus.jsx

import React from 'react';
import { useEffect, useState } from 'react';

// O funcție ajutătoare pentru a formata timpul relativ
function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " ani în urmă";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " luni în urmă";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " zile în urmă";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " ore în urmă";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minute în urmă";
  return "câteva secunde în urmă";
}

// Componenta principală pentru status
function ScreenStatus({ lastSeen }) {
  const [now, setNow] = useState(new Date());

  // Re-randăm componenta în fiecare minut pentru a actualiza timpul de uptime
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  if (!lastSeen) {
    return <span className="text-gray-400 italic">Niciodată văzut</span>;
  }

  const lastSeenDate = new Date(lastSeen);
  const diffMinutes = (now - lastSeenDate) / 1000 / 60;

  const isOnline = diffMinutes < 20; // Prag de 20 de minute pentru statusul "Online"

  const formattedLastSeen = lastSeenDate.toLocaleString('ro-RO', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="flex flex-col">
      {isOnline ? (
        <div className="flex items-center">
          <span className="h-3 w-3 rounded-full bg-green-500 mr-2"></span>
          <span className="font-semibold text-green-600">Online</span>
        </div>
      ) : (
        <div className="flex items-center">
          <span className="h-3 w-3 rounded-full bg-gray-400 mr-2"></span>
          <span className="font-semibold text-gray-500">Offline</span>
        </div>
      )}
      <span className="text-xs text-gray-500 dark:text-slate-400 mt-1">
        {isOnline ? `Văzut ${formatTimeAgo(lastSeenDate)}` : `Ultima dată: ${formattedLastSeen}`}
      </span>
    </div>
  );
}

export default ScreenStatus;