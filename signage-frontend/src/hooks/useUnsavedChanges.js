// Hook pentru detectarea și gestionarea modificărilor nesalvate
// Oferă funcționalități complete pentru protecția datelor utilizatorului

import { useState, useCallback, useRef, useEffect } from 'react';
import { deepEqual } from '../utils/deepEqual';
import { useNavigationProtection } from './useNavigationProtection';

/**
 * Hook pentru detectarea modificărilor nesalvate în formulare
 * 
 * @param {Object} initialData - Datele inițiale ale formularului
 * @param {Object} currentData - Datele curente ale formularului
 * @param {Function} onSave - Funcția de salvare
 * @param {Object} options - Opțiuni de configurare
 * @returns {Object} - Obiect cu stări și funcții pentru gestionarea modificărilor
 */
export function useUnsavedChanges(initialData, currentData, onSave, options = {}) {
  const {
    // Permite ignoarea anumitor câmpuri din comparație
    ignoreFields = [],
    // Activează protecția automată la navigare/refresh
    enableBeforeUnload = true,
    // Activează protecția pentru navigarea între pagini React Router
    enableRouterProtection = true,
    // Timeout pentru debounce la detectarea modificărilor
    debounceMs = 300
  } = options;

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const debounceTimeoutRef = useRef(null);
  const initialDataRef = useRef(initialData);

  // Protecție pentru navigarea între pagini React Router
  const navigationProtection = useNavigationProtection(
    hasUnsavedChanges && enableRouterProtection,
    ({ targetPath, proceed, cancel }) => {
      // Când se încearcă navigarea, afișează dialogul de confirmare
      setPendingAction({
        action: proceed,
        actionType: 'navigate',
        resolve: (result) => {
          if (result) proceed();
          else cancel();
        },
        targetPath
      });
      setIsConfirmDialogOpen(true);
    }
  );

  // Actualizează datele inițiale când se salvează cu succes
  const updateInitialData = useCallback((newData) => {
    initialDataRef.current = newData;
    setHasUnsavedChanges(false);
  }, []);

  // Funcție pentru filtrarea câmpurilor ignorate
  const filterIgnoredFields = useCallback((data) => {
    if (!ignoreFields.length) return data;
    
    const filtered = { ...data };
    ignoreFields.forEach(field => {
      delete filtered[field];
    });
    return filtered;
  }, [ignoreFields]);

  // Detectează modificările cu debounce
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      const filteredInitial = filterIgnoredFields(initialDataRef.current || {});
      const filteredCurrent = filterIgnoredFields(currentData || {});
      
      const hasChanges = !deepEqual(filteredInitial, filteredCurrent);
      setHasUnsavedChanges(hasChanges);
    }, debounceMs);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [currentData, filterIgnoredFields, debounceMs]);

  // Protecție pentru refresh/navigare browser
  useEffect(() => {
    if (!enableBeforeUnload) return;

    const handleBeforeUnload = (event) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = 'Aveți modificări nesalvate. Sigur doriți să părăsiți pagina?';
        return event.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, enableBeforeUnload]);

  // Funcție pentru încercarea unei acțiuni care poate necesita salvare
  const attemptAction = useCallback((action, actionType = 'navigate') => {
    if (!hasUnsavedChanges) {
      // Nu sunt modificări, execută direct acțiunea
      action();
      return Promise.resolve(true);
    }

    // Sunt modificări nesalvate, afișează dialogul de confirmare
    return new Promise((resolve) => {
      setPendingAction({
        action,
        actionType,
        resolve
      });
      setIsConfirmDialogOpen(true);
    });
  }, [hasUnsavedChanges]);

  // Gestionează răspunsul la dialogul de confirmare
  const handleConfirmResponse = useCallback(async (response) => {
    const action = pendingAction;
    setIsConfirmDialogOpen(false);
    setPendingAction(null);

    if (!action) return;

    switch (response) {
      case 'save':
        // Salvează și apoi execută acțiunea
        try {
          await onSave();
          // Actualizează datele inițiale după salvare cu succes
          updateInitialData(currentData);
          action.action();
          action.resolve(true);
        } catch (error) {
          console.error('Eroare la salvare:', error);
          action.resolve(false);
        }
        break;
      
      case 'discard':
        // Abandonează modificările și execută acțiunea
        setHasUnsavedChanges(false);
        action.action();
        action.resolve(true);
        break;
      
      case 'cancel':
      default:
        // Anulează acțiunea, rămâne în starea curentă
        action.resolve(false);
        break;
    }
  }, [pendingAction, onSave]);

  // Funcție convenabilă pentru închiderea modului de editare
  const handleClose = useCallback(() => {
    return attemptAction(() => {
      // Logica de închidere va fi furnizată de componenta părinte
    }, 'close');
  }, [attemptAction]);

  // Reset manual al stării de modificări nesalvate
  const resetUnsavedChanges = useCallback(() => {
    setHasUnsavedChanges(false);
    initialDataRef.current = currentData;
  }, [currentData]);

  return {
    // Stări
    hasUnsavedChanges,
    isConfirmDialogOpen,
    pendingAction,
    
    // Funcții de control
    attemptAction,
    handleConfirmResponse,
    handleClose,
    updateInitialData,
    resetUnsavedChanges,
    
    // Informații despre navigare
    navigationProtection,
    
    // Date pentru dialog
    confirmDialogProps: {
      open: isConfirmDialogOpen,
      onOpenChange: (open) => {
        if (!open) handleConfirmResponse('cancel');
      },
      onSave: () => handleConfirmResponse('save'),
      onDiscard: () => handleConfirmResponse('discard'),
      onCancel: () => handleConfirmResponse('cancel'),
      actionType: pendingAction?.actionType || 'navigate',
      customMessage: pendingAction?.targetPath ? 
        `Doriți să navigați la "${pendingAction.targetPath}" fără să salvați modificările?` : 
        undefined
    }
  };
}

export default useUnsavedChanges;