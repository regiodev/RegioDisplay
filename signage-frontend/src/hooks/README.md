# Sistemul de Protecție pentru Modificările Nesalvate

Acest sistem oferă protecție completă împotriva pierderii accidentale a datelor utilizatorului prin:

- **Detectare automată** a modificărilor în formulare
- **Dialog de confirmare** cu opțiuni clare pentru utilizator
- **Protecție la navigare** între pagini React Router
- **Protecție la refresh/închidere** browser

## Componente Principale

### 1. `useUnsavedChanges` Hook

Hook principal pentru detectarea și gestionarea modificărilor nesalvate.

```javascript
import useUnsavedChanges from '@/hooks/useUnsavedChanges';

function MyEditForm({ initialData }) {
  const [formData, setFormData] = useState(initialData);
  
  const unsavedChanges = useUnsavedChanges(
    initialData,      // Date inițiale
    formData,         // Date curente
    handleSave,       // Funcție de salvare
    {
      ignoreFields: ['id', 'updated_at'],
      enableBeforeUnload: true,
      enableRouterProtection: true,
      debounceMs: 500
    }
  );
  
  const handleSave = async () => {
    // Logica de salvare
    await saveData(formData);
    // Actualizează datele inițiale după salvare
    unsavedChanges.updateInitialData(formData);
  };
  
  const handleClose = () => {
    unsavedChanges.attemptAction(() => {
      // Închide modalul/form-ul
      onClose();
    }, 'close');
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      {/* Conținutul form-ului */}
      
      {/* Dialog pentru modificări nesalvate */}
      <UnsavedChangesDialog
        {...unsavedChanges.confirmDialogProps}
        isSaving={isSaving}
      />
    </Dialog>
  );
}
```

### 2. `UnsavedChangesDialog` Componentă

Dialog standardizat pentru confirmarea acțiunilor cu modificări nesalvate.

```javascript
import UnsavedChangesDialog from '@/components/UnsavedChangesDialog';

<UnsavedChangesDialog
  open={isOpen}
  onSave={handleSave}
  onDiscard={handleDiscard}
  onCancel={handleCancel}
  actionType="close" // 'navigate', 'close', 'delete', 'custom'
  customMessage="Mesaj personalizat"
  isSaving={false}
/>
```

### 3. `useNavigationProtection` Hook

Hook pentru protecția navigării între pagini React Router.

```javascript
import useNavigationProtection from '@/hooks/useNavigationProtection';

const navigation = useNavigationProtection(
  hasUnsavedChanges,
  ({ targetPath, proceed, cancel }) => {
    // Afișează dialog de confirmare
    showConfirmDialog({
      onConfirm: proceed,
      onCancel: cancel
    });
  }
);
```

## Opțiuni de Configurare

### `useUnsavedChanges` Opțiuni

```javascript
{
  // Câmpuri ignorate în comparația pentru modificări
  ignoreFields: ['id', 'created_at', 'updated_at'],
  
  // Activează protecția la refresh/închidere browser
  enableBeforeUnload: true,
  
  // Activează protecția la navigarea React Router
  enableRouterProtection: true,
  
  // Timeout pentru debounce la detectarea modificărilor (ms)
  debounceMs: 300
}
```

### Tipuri de Acțiuni pentru Dialog

- **`navigate`** - Navigare între pagini
- **`close`** - Închiderea unui modal/form
- **`delete`** - Ștergerea cu modificări nesalvate
- **`custom`** - Acțiune personalizată

## Exemple de Integrare

### Modal de Editare

```javascript
function EditModal({ item, isOpen, onClose }) {
  const [formData, setFormData] = useState(item);
  const [initialData, setInitialData] = useState(item);
  
  const unsavedChanges = useUnsavedChanges(
    initialData,
    formData,
    handleSave,
    { enableRouterProtection: isOpen }
  );
  
  const handleSave = async () => {
    const result = await updateItem(formData);
    unsavedChanges.updateInitialData(result);
    onClose();
  };
  
  const handleClose = () => {
    unsavedChanges.attemptAction(onClose, 'close');
  };
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        {/* Form content */}
      </Dialog>
      
      <UnsavedChangesDialog {...unsavedChanges.confirmDialogProps} />
    </>
  );
}
```

### Pagină cu Formular

```javascript
function EditPage() {
  const [formData, setFormData] = useState(initialData);
  
  const unsavedChanges = useUnsavedChanges(
    initialData,
    formData,
    handleSave,
    {
      enableBeforeUnload: true,
      enableRouterProtection: true
    }
  );
  
  return (
    <div>
      {/* Form content */}
      
      <UnsavedChangesDialog {...unsavedChanges.confirmDialogProps} />
    </div>
  );
}
```

## Funcții Disponibile

### Din `useUnsavedChanges`

- **`hasUnsavedChanges`** - Boolean care indică dacă sunt modificări
- **`attemptAction(action, type)`** - Încearcă o acțiune cu verificarea modificărilor
- **`updateInitialData(newData)`** - Actualizează datele inițiale după salvare
- **`resetUnsavedChanges()`** - Reset manual al stării de modificări
- **`confirmDialogProps`** - Props pentru UnsavedChangesDialog

### Callback-uri pentru Dialog

- **`onSave`** - Salvează modificările și continuă
- **`onDiscard`** - Abandonează modificările și continuă  
- **`onCancel`** - Anulează acțiunea, rămâne în starea curentă

## Best Practices

1. **Folosește `updateInitialData`** după salvare cu succes
2. **Activează protecțiile** doar când sunt relevante (ex: modal deschis)
3. **Personalizează mesajele** pentru context specific
4. **Testează fluxurile** de navigare și închidere
5. **Gestionează erorile** în funcțiile de salvare

## Aplicat în Proiect

Sistemul este deja integrat în:
- ✅ **MediaPage** - Editare fișiere media
- ✅ **MediaPage** - Adăugare conținut web

Pentru noi formulare, urmați exemplele de mai sus și pattern-urile existente.