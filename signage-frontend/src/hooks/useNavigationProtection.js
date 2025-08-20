// Hook pentru protecția navigării cu modificări nesalvate
// Integrează cu React Router pentru a preveni navigarea accidentală

import { useEffect, useRef } from 'react';

// Pentru React Router v6 - API-ul useBlocker poate varia între versiuni
// Încărcăm dinamic useBlocker cu fallback complet
let useBlocker;
try {
  // eslint-disable-next-line no-undef
  const router = require('react-router-dom');
  useBlocker = router.useBlocker || router.unstable_useBlocker;
} catch {
  console.warn('React Router useBlocker not available, navigation protection disabled');
}

// Fallback complet pentru când useBlocker nu este disponibil
if (!useBlocker) {
  useBlocker = () => ({
    state: "unblocked",
    proceed: () => {},
    reset: () => {},
    location: null
  });
}

/**
 * Hook pentru protecția navigării între pagini când există modificări nesalvate
 * 
 * @param {boolean} hasUnsavedChanges - Indică dacă există modificări nesalvate
 * @param {Function} onAttemptNavigation - Callback apelat când se încearcă navigarea
 * @returns {Object} - Obiect cu funcții de control al navigării
 */
export function useNavigationProtection(hasUnsavedChanges, onAttemptNavigation) {
  const navigationAttemptRef = useRef(null);

  // Blochează navigarea când există modificări nesalvate
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => {
      // Nu bloca dacă nu sunt modificări nesalvate
      if (!hasUnsavedChanges) return false;
      
      // Nu bloca dacă navigăm către aceeași pagină
      if (currentLocation.pathname === nextLocation.pathname) return false;
      
      return true;
    }
  );

  // Gestionează încercările de navigare
  useEffect(() => {
    if (blocker.state === "blocked") {
      // Salvează detaliile navigării pentru a le folosi mai târziu
      navigationAttemptRef.current = {
        location: blocker.location,
        proceed: blocker.proceed,
        reset: blocker.reset
      };

      // Apelează callback-ul pentru a afișa dialogul de confirmare
      if (onAttemptNavigation) {
        onAttemptNavigation({
          targetPath: blocker.location.pathname,
          proceed: () => {
            blocker.proceed();
            navigationAttemptRef.current = null;
          },
          cancel: () => {
            blocker.reset();
            navigationAttemptRef.current = null;
          }
        });
      }
    }
  }, [blocker, onAttemptNavigation]);

  // Funcții de control pentru navigarea programatică
  const proceedNavigation = () => {
    if (navigationAttemptRef.current) {
      navigationAttemptRef.current.proceed();
      navigationAttemptRef.current = null;
    }
  };

  const cancelNavigation = () => {
    if (navigationAttemptRef.current) {
      navigationAttemptRef.current.reset();
      navigationAttemptRef.current = null;
    }
  };

  return {
    isBlocked: blocker.state === "blocked",
    targetLocation: blocker.location,
    proceedNavigation,
    cancelNavigation
  };
}

export default useNavigationProtection;