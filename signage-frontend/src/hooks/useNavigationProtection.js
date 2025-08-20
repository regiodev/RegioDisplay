// Hook pentru protecția navigării cu modificări nesalvate
// Integrează cu React Router pentru a preveni navigarea accidentală

import { useEffect, useRef, useState } from 'react';

// Hook personalizat care simulează comportamentul useBlocker
function useBlockerFallback(shouldBlock) {
  const [blockedNavigation, setBlockedNavigation] = useState(null);
  
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (typeof shouldBlock === 'function' ? shouldBlock({ currentLocation: window.location, nextLocation: null }) : shouldBlock) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [shouldBlock]);

  return {
    state: blockedNavigation ? "blocked" : "unblocked",
    location: blockedNavigation,
    proceed: () => setBlockedNavigation(null),
    reset: () => setBlockedNavigation(null)
  };
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
  const blocker = useBlockerFallback(
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