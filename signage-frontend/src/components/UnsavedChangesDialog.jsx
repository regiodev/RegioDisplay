// Componenta pentru dialogul de avertizare privind modificările nesalvate
// Oferă opțiuni clare pentru gestionarea datelor utilizatorului

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Save, X, RotateCcw } from 'lucide-react';

/**
 * Dialog pentru confirmarea acțiunilor cu modificări nesalvate
 * 
 * @param {Object} props - Props pentru componentă
 * @param {boolean} props.open - Starea de vizibilitate a dialogului
 * @param {Function} props.onOpenChange - Callback pentru schimbarea vizibilității
 * @param {Function} props.onSave - Callback pentru salvare și continuare
 * @param {Function} props.onDiscard - Callback pentru abandonarea modificărilor
 * @param {Function} props.onCancel - Callback pentru anularea acțiunii
 * @param {string} props.actionType - Tipul acțiunii ('navigate', 'close', 'custom')
 * @param {string} props.customMessage - Mesaj personalizat (opțional)
 * @param {boolean} props.isSaving - Starea de salvare în progres
 * @returns {JSX.Element} - Componenta dialog
 */
export function UnsavedChangesDialog({
  open,
  onOpenChange,
  onSave,
  onDiscard,
  onCancel,
  actionType = 'navigate',
  customMessage,
  isSaving = false
}) {
  // Definește mesajele pe baza tipului de acțiune
  const getMessages = () => {
    switch (actionType) {
      case 'close':
        return {
          title: 'Închideți fără să salvați?',
          description: 'Aveți modificări nesalvate. Dacă închideți acum, modificările vor fi pierdute permanent.'
        };
      case 'navigate':
        return {
          title: 'Părăsiți pagina fără să salvați?',
          description: 'Aveți modificări nesalvate. Dacă navigați în altă parte, modificările vor fi pierdute permanent.'
        };
      case 'delete':
        return {
          title: 'Ștergeți cu modificări nesalvate?',
          description: 'Aveți modificări nesalvate pentru acest element. Șterând elementul, atât datele existente cât și modificările vor fi pierdute permanent.'
        };
      default:
        return {
          title: 'Continuați fără să salvați?',
          description: customMessage || 'Aveți modificări nesalvate. Dacă continuați, modificările vor fi pierdute permanent.'
        };
    }
  };

  const { title, description } = getMessages();

  const handleSave = async () => {
    try {
      await onSave();
    } catch (error) {
      // Eroarea va fi gestionată de hook-ul useUnsavedChanges
      console.error('Eroare la salvare în UnsavedChangesDialog:', error);
      // Re-propagăm eroarea pentru a fi gestionată corect de hook
      throw error;
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[650px] max-w-[95vw] w-full min-w-[320px] p-6 sm:p-8">
        <AlertDialogHeader className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full flex-shrink-0 mt-1">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <AlertDialogTitle className="text-left text-lg font-semibold leading-6">
                {title}
              </AlertDialogTitle>
            </div>
          </div>
          <AlertDialogDescription className="text-left text-sm leading-relaxed pl-0">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="flex flex-col gap-3 sm:flex-row sm:justify-end sm:gap-3 pt-6 mt-2">
          {/* Buton pentru anularea acțiunii */}
          <AlertDialogCancel 
            onClick={onCancel}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 w-full sm:w-auto sm:min-w-[120px] order-1 sm:order-1"
          >
            <RotateCcw className="h-4 w-4" />
            Anulează
          </AlertDialogCancel>
          
          {/* Buton pentru abandonarea modificărilor */}
          <AlertDialogAction
            onClick={onDiscard}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 w-full sm:w-auto sm:min-w-[180px] bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 order-2 sm:order-2"
          >
            <X className="h-4 w-4" />
            <span className="whitespace-nowrap text-sm">Abandonează Modificările</span>
          </AlertDialogAction>
          
          {/* Buton pentru salvare și continuare */}
          <AlertDialogAction
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 w-full sm:w-auto sm:min-w-[160px] bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 order-3 sm:order-3"
          >
            {isSaving ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="whitespace-nowrap text-sm">Se salvează...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span className="whitespace-nowrap text-sm">Salvează și Continuă</span>
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Versiune simplificată pentru cazurile comune
export function QuickUnsavedChangesDialog({ open, onSave, onDiscard, onCancel, isSaving }) {
  return (
    <UnsavedChangesDialog
      open={open}
      onOpenChange={(open) => !open && onCancel()}
      onSave={onSave}
      onDiscard={onDiscard}
      onCancel={onCancel}
      isSaving={isSaving}
    />
  );
}

export default UnsavedChangesDialog;