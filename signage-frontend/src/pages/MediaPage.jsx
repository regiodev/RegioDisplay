// Cale fișier: src/pages/MediaPage.jsx

import Pagination from '@/components/Pagination';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  File,
  HardDrive,
  LayoutGrid,
  List,
  Loader2,
  Trash2,
  Upload,
  FolderOpen,
  Search,
  Settings,
  Database,
  Link,
  Globe,
  Plus,
  Filter,
  Image,
  Video,
  Edit,
  Save,
  X,
  Download,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import apiClient from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import VideoProcessingProgress from '../components/VideoProcessingProgress';
import useUnsavedChanges from '../hooks/useUnsavedChanges';
import UnsavedChangesDialog from '../components/UnsavedChangesDialog';

const ITEMS_PER_PAGE = 12;

// --- Funcție ajutătoare pentru formatarea biților ---
function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// --- Componenta Dropzone a fost modificată să nu mai încarce direct ---
const FileUploadDropzone = ({ onFilesStaged }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesStaged(e.dataTransfer.files);
    }
  };
  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesStaged(e.target.files);
      e.target.value = ''; // Permite re-selectarea aceluiași fișier
    }
  };
  const openFileDialog = () => inputRef.current?.click();

  return (
    <div
      onClick={openFileDialog}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      className={cn(
        'relative flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ease-in-out hover:shadow-md',
        isDragging
          ? 'border-primary bg-primary/10 shadow-lg scale-[1.02]'
          : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/20',
      )}
    >
      <input ref={inputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
      <div className="flex flex-col items-center justify-center text-center space-y-4">
        <div className="p-4 bg-primary/10 rounded-full">
          <Upload className="h-10 w-10 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-lg">
            Trageți fișierele aici sau <span className="text-primary underline">click pentru a naviga</span>
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Suport pentru încărcare multiplă • Imagini, video, audio acceptate
          </p>
        </div>
      </div>
    </div>
  );
};

const SortableHeader = ({ children, columnKey, sortConfig, onSort }) => {
  const isSorted = sortConfig.key === columnKey;
  const direction = isSorted ? sortConfig.direction : 'none';
  return (
    <th
      className="px-6 py-4 text-left font-semibold cursor-pointer hover:bg-muted/30 transition-colors"
      onClick={() => onSort(columnKey)}
    >
      <div className="flex items-center space-x-2">
        <span>{children}</span>
        {isSorted && (
          <span className="text-primary">
            {direction === 'asc' ? (
              <ArrowUp className="h-4 w-4" />
            ) : (
              <ArrowDown className="h-4 w-4" />
            )}
          </span>
        )}
      </div>
    </th>
  );
};

const MediaPreview = ({ file }) => {
  const mediaServeUrl = `${apiClient.defaults.baseURL}/media/serve/`;
  const thumbnailBaseUrl = `${apiClient.defaults.baseURL}/media/thumbnails/`;

  const isProcessing =
    file.processing_status === 'PENDING' || file.processing_status === 'PROCESSING';

  // Determină sursa imaginii - prioritizează thumbnail-ul dacă există
  const getImageSrc = () => {
    if (file.thumbnail_path) {
      return `${thumbnailBaseUrl}${file.thumbnail_path}`;
    }
    if (file.type.startsWith('image/')) {
      return `${mediaServeUrl}${file.id}`;
    }
    return null;
  };

  const imageSrc = getImageSrc();

  return (
    <div className="relative w-full h-full">
      {isProcessing && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white z-10">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-xs mt-2">În procesare...</span>
        </div>
      )}

      {imageSrc ? (
        <img
          src={imageSrc}
          alt={file.filename}
          className="w-full h-full object-cover"
          loading="lazy" // Lazy loading pentru performanță
          onError={(e) => {
            // Fallback la imaginea originală dacă thumbnail-ul eșuează
            if (file.type.startsWith('image/') && file.thumbnail_path && e.target.src.includes('thumbnails')) {
              e.target.src = `${mediaServeUrl}${file.id}`;
            }
          }}
        />
      ) : (
        <div className="flex flex-col items-center justify-center h-full bg-muted text-muted-foreground">
          {file.type === 'web/html' ? (
            <Globe className="w-10 h-10 text-blue-500" />
          ) : (
            <File className="w-10 h-10" />
          )}
          <span className="mt-2 text-xs text-center px-1">{file.filename}</span>
          {file.type === 'web/html' && (
            <span className="text-xs text-blue-500 font-medium">WEB</span>
          )}
        </div>
      )}
    </div>
  );
};

function MediaPage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  // Stări pentru media existentă
  const [mediaFiles, setMediaFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Stări pentru control UI (căutare, sortare, etc.)
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [fileTypeFilter, setFileTypeFilter] = useState('all'); // nou pentru filtru

  // --- STĂRI NOI PENTRU UPLOAD ---
  const [stagedFiles, setStagedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);


  // --- STĂRI NOI PENTRU CONȚINUT WEB ---
  const [isWebModalOpen, setIsWebModalOpen] = useState(false);
  const [webFormData, setWebFormData] = useState({
    filename: '',
    web_url: '',
    web_refresh_interval: 30,
    tags: ''
  });
  const [webInitialData, setWebInitialData] = useState({});
  const [isWebLoading, setIsWebLoading] = useState(false);

  // Hook pentru detectarea modificărilor nesalvate în modalul pentru conținut web
  const webUnsavedChanges = useUnsavedChanges(
    webInitialData,
    webFormData,
    async () => {
      await handleWebContentSubmitInternal();
    },
    {
      ignoreFields: [],
      enableBeforeUnload: false, // Dezactivăm - va fi gestionată global
      enableRouterProtection: false // Dezactivăm - va fi gestionată global
    }
  );

  // --- STĂRI PENTRU EDITARE ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingFile, setEditingFile] = useState(null);
  const [editFormData, setEditFormData] = useState({
    filename: '',
    tags: '',
    web_url: '',
    web_refresh_interval: 30
  });
  const [editInitialData, setEditInitialData] = useState({});
  const [isEditLoading, setIsEditLoading] = useState(false);

  // Hook pentru detectarea modificărilor nesalvate în modalul de editare
  const editUnsavedChanges = useUnsavedChanges(
    editInitialData,
    editFormData,
    async () => {
      // Funcția de salvare va fi apelată din hook
      await handleEditSubmitInternal();
    },
    {
      // Ignorăm ID-ul și alte câmpuri care nu afectează conținutul
      ignoreFields: ['id', 'uploaded_at', 'processing_status'],
      enableBeforeUnload: false, // Dezactivăm - va fi gestionată global
      enableRouterProtection: false // Dezactivăm - va fi gestionată global
    }
  );

  // --- PROTECȚIE GLOBALĂ PENTRU MODIFICĂRILE NESALVATE ---
  // Calculează dacă există modificări nesalvate oriunde în pagină
  const hasGlobalUnsavedChanges = useMemo(() => {
    // Verifică dacă sunt fișiere staged pentru upload
    const hasStagedFiles = stagedFiles.length > 0;
    // Verifică modificările în modaluri (când sunt deschise)
    const hasWebChanges = isWebModalOpen && webUnsavedChanges?.hasUnsavedChanges;
    const hasEditChanges = isEditModalOpen && editUnsavedChanges?.hasUnsavedChanges;
    
    return hasStagedFiles || hasWebChanges || hasEditChanges;
  }, [stagedFiles.length, isWebModalOpen, webUnsavedChanges?.hasUnsavedChanges, isEditModalOpen, editUnsavedChanges?.hasUnsavedChanges]);

  // Hook global pentru protecția navigării și refresh-ului
  const globalUnsavedChanges = useUnsavedChanges(
    {}, // Nu avem date inițiale la nivel global
    {}, // Nu avem date curente la nivel global
    async () => {
      // Funcția de salvare globală - gestionează diferite scenarii
      if (stagedFiles.length > 0) {
        // Dacă sunt fișiere staged, întreabă utilizatorul ce să facă
        const shouldUpload = window.confirm(
          `Aveți ${stagedFiles.length} fișiere pregătite pentru încărcare. Doriți să le încărcați înainte de plecare?`
        );
        if (shouldUpload) {
          await handleUpload();
        } else {
          // Curăță fișierele staged
          setStagedFiles([]);
        }
      }
      
      // Pentru modificările în modaluri, acestea vor fi gestionate de hook-urile respective
      return Promise.resolve();
    },
    {
      ignoreFields: [],
      enableBeforeUnload: hasGlobalUnsavedChanges,
      enableRouterProtection: hasGlobalUnsavedChanges
    }
  );

  // --- Calcul spațiu ---
  const totalStagedSizeBytes = useMemo(
    () => stagedFiles.reduce((acc, curr) => acc + curr.file.size, 0),
    [stagedFiles],
  );
  const availableSpaceBytes = useMemo(
    () => (user.disk_quota_mb - user.current_usage_mb) * 1024 * 1024,
    [user],
  );
  const isOverQuota = totalStagedSizeBytes > availableSpaceBytes;

  const handleSort = useCallback((columnKey) => {
    setSortConfig((prevConfig) => {
      if (prevConfig.key === columnKey) {
        return {
          ...prevConfig,
          direction: prevConfig.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key: columnKey, direction: 'asc' };
    });
  }, []);

  const fetchMediaFiles = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/media/', {
        params: {
          skip: (currentPage - 1) * ITEMS_PER_PAGE,
          limit: ITEMS_PER_PAGE,
          search: searchTerm,
          sort_by: sortConfig.key,
          sort_dir: sortConfig.direction,
        },
      });
      setMediaFiles(response.data.items);
      setTotalItems(response.data.total);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Eroare',
        description: 'Nu s-au putut încărca fișierele media.',
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, sortConfig, toast]);

  useEffect(() => {
    fetchMediaFiles();
  }, [fetchMediaFiles]);

  // --- BLOCUL DE COD PENTRU POLLING, PLASAT AICI ---
  useEffect(() => {
    const isAnyFileProcessing = mediaFiles.some(
      (file) => file.processing_status === 'PENDING' || file.processing_status === 'PROCESSING',
    );

    if (isAnyFileProcessing) {
      const timer = setTimeout(() => {
        fetchMediaFiles();
      }, 20000); // Verifică din nou peste 20 secunde

      return () => clearTimeout(timer);
    }
  }, [mediaFiles, fetchMediaFiles]);

  const handleSelectFile = (fileId) => {
    setSelectedFiles((prev) =>
      prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId],
    );
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedFiles(filteredMediaFiles.map((file) => file.id));
    } else {
      setSelectedFiles([]);
    }
  };

  const handleDeleteClick = (file = null) => {
    if (file) {
      setItemToDelete({ type: 'single', id: file.id, name: file.filename });
    } else {
      setItemToDelete({ type: 'bulk', ids: selectedFiles, count: selectedFiles.length });
    }
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    const isBulk = itemToDelete.type === 'bulk';
    const deleteUrl = isBulk ? '/media/bulk-delete' : `/media/${itemToDelete.id}`;
    const payload = isBulk ? { ids: itemToDelete.ids } : {};

    try {
      if (isBulk) {
        await apiClient.post(deleteUrl, payload);
      } else {
        await apiClient.delete(deleteUrl);
      }
      toast({ title: 'Succes', description: `Ștergerea a fost efectuată.` });
      setSelectedFiles([]);
      fetchMediaFiles();
      refreshUser();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Eroare',
        description: error.response?.data?.detail || 'Ștergerea a eșuat.',
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handleFilesStaged = async (files) => {
    const filesArray = Array.from(files);
    const processedFiles = [];

    for (const file of filesArray) {
      let processedFile = file;
      let isCompressed = false;
      
      // Compresie imagini mari
      if (file.type.startsWith('image/') && file.size > IMAGE_COMPRESSION_THRESHOLD) {
        try {
          setStagedFiles((prev) => [...prev, {
            id: `${file.name}-${file.lastModified}-${file.size}`,
            file,
            status: 'compressing',
            progress: 0,
            originalSize: file.size
          }]);

          const compressedBlob = await compressImage(file);
          if (compressedBlob && compressedBlob.size < file.size) {
            // Creează un nou File object cu numele original
            processedFile = new File([compressedBlob], file.name, {
              type: file.type,
              lastModified: file.lastModified,
            });
            isCompressed = true;
          }

          // Elimină fișierul temporar din listă
          setStagedFiles((prev) => prev.filter(f => f.id !== `${file.name}-${file.lastModified}-${file.size}`));
        } catch (error) {
          console.warn('Compresie eșuată pentru', file.name, error);
          // Continuă cu fișierul original
        }
      }

      const stagedFile = {
        id: `${file.name}-${file.lastModified}-${file.size}`,
        file: processedFile,
        originalFile: isCompressed ? file : undefined,
        status: 'staged',
        progress: 0,
        isCompressed,
        compressionRatio: isCompressed ? ((file.size - processedFile.size) / file.size * 100).toFixed(1) : undefined,
        priority: file.type.startsWith('image/') ? 1 : file.type.startsWith('video/') ? 3 : 2, // imagini = 1 (prioritate mare), audio = 2, video = 3
        isLargeFile: processedFile.size > LARGE_FILE_THRESHOLD
      };

      processedFiles.push(stagedFile);
    }

    setStagedFiles((prev) => [...prev, ...processedFiles]);
  };

  const handleRemoveStagedFile = (id) => {
    setStagedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleRetryFailedFile = async (id) => {
    const fileToRetry = stagedFiles.find(f => f.id === id);
    if (!fileToRetry || fileToRetry.status !== 'error') return;

    // Resetează statusul fișierului la 'staged' pentru a permite retry
    setStagedFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: 'staged', progress: 0, error: undefined } : f)),
    );

    // Upload individual pentru acest fișier
    try {
      await uploadFileWithRetry(fileToRetry);
      toast({ 
        title: 'Retry reușit', 
        description: `Fișierul ${fileToRetry.file.name} a fost încărcat cu succes.` 
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Retry eșuat',
        description: `Fișierul ${fileToRetry.file.name} nu a putut fi încărcat.`,
      });
    }
  };

  const handleRegenerateThumbnails = async () => {
    try {
      const response = await apiClient.post('/media/regenerate-thumbnails');
      
      if (response.data.count === 0) {
        toast({
          title: 'Info',
          description: 'Toate imaginile au deja thumbnail-uri.',
        });
      } else {
        toast({
          title: 'Procesare începută',
          description: `Se generează thumbnail-uri pentru ${response.data.count} imagini în background.`,
        });
        
        // Reîmprospătează lista după 3 secunde
        setTimeout(() => {
          fetchMediaFiles();
        }, 3000);
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Eroare',
        description: 'Nu s-au putut regenera thumbnail-urile.',
      });
    }
  };

  // Constante pentru optimizări
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
  const LARGE_FILE_THRESHOLD = 100 * 1024 * 1024; // 100MB
  const IMAGE_COMPRESSION_THRESHOLD = 2 * 1024 * 1024; // 2MB

  // Funcție pentru compresie imagini
  const compressImage = async (file, quality = 0.8, maxWidth = 1920, maxHeight = 1080) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculează dimensiunile noi păstrând aspectul
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Desenează imaginea redimensionată
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertește înapoi în blob
        canvas.toBlob(resolve, file.type, quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  // Funcție pentru chunk upload
  const uploadFileInChunks = async (stagedFile) => {
    const file = stagedFile.file;
    let upload_id;
    
    try {
      // Inițiază upload-ul chunk
      const initResponse = await apiClient.post('/media/chunk/initiate', null, {
        params: {
          filename: file.name,
          file_size: file.size,
          content_type: file.type,
          chunk_size: CHUNK_SIZE
        }
      });
      
      const { upload_id: uploadId, chunk_size, total_chunks } = initResponse.data;
      upload_id = uploadId;
      
      // Upload-ează chunk-urile în paralel (cu limita de 3 paralel)
      const uploadChunk = async (chunkNumber) => {
        const start = chunkNumber * chunk_size;
        const end = Math.min(start + chunk_size, file.size);
        const chunkBlob = file.slice(start, end);
        
        const formData = new FormData();
        formData.append('chunk', chunkBlob);
        
        await apiClient.post(`/media/chunk/upload/${upload_id}`, formData, {
          params: { chunk_number: chunkNumber },
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const chunkProgress = (progressEvent.loaded / progressEvent.total) * 100;
            const overallProgress = ((chunkNumber * 100) + chunkProgress) / total_chunks;
            setStagedFiles((prev) =>
              prev.map((f) => (f.id === stagedFile.id ? { 
                ...f, 
                progress: Math.round(overallProgress),
                chunkInfo: `Chunk ${chunkNumber + 1}/${total_chunks}`
              } : f)),
            );
          },
        });
      };
      
      // Upload chunk-uri în batch-uri de 3
      const batchSize = 3;
      for (let i = 0; i < total_chunks; i += batchSize) {
        const batch = [];
        for (let j = i; j < Math.min(i + batchSize, total_chunks); j++) {
          batch.push(uploadChunk(j));
        }
        await Promise.all(batch);
      }
      
      // Finalizează upload-ul
      const completeResponse = await apiClient.post(`/media/chunk/complete/${upload_id}`);
      
      return { success: true, file: stagedFile, data: completeResponse.data };
      
    } catch (error) {
      // În caz de eroare, încearcă să anulezi upload-ul dacă upload_id există
      if (typeof upload_id !== 'undefined') {
        try {
          await apiClient.delete(`/media/chunk/cancel/${upload_id}`);
        } catch (cancelError) {
          console.warn('Failed to cancel chunk upload:', cancelError);
        }
      }
      
      throw error;
    }
  };

  // Funcție pentru upload cu retry logic
  const uploadFileWithRetry = async (stagedFile, maxRetries = 3) => {
    let retryCount = 0;
    
    const attemptUpload = async () => {
      // Folosește chunk upload pentru fișiere mari, upload normal pentru cele mici
      if (stagedFile.isLargeFile) {
        return await uploadFileInChunks(stagedFile);
      } else {
        const formData = new FormData();
        formData.append('files', stagedFile.file);
        
        const response = await apiClient.post('/media/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setStagedFiles((prev) =>
              prev.map((f) => (f.id === stagedFile.id ? { ...f, progress: percentCompleted } : f)),
            );
          },
        });
        
        return { success: true, file: stagedFile, data: response.data };
      }
    };

    while (retryCount <= maxRetries) {
      try {
        setStagedFiles((prev) =>
          prev.map((f) => (f.id === stagedFile.id ? { 
            ...f, 
            status: 'uploading',
            retryCount: retryCount > 0 ? retryCount : undefined 
          } : f)),
        );

        await attemptUpload();
        
        setStagedFiles((prev) =>
          prev.map((f) => (f.id === stagedFile.id ? { ...f, status: 'success', retryCount: undefined } : f)),
        );
        
        return { success: true, file: stagedFile };
      } catch (error) {
        retryCount++;
        
        if (retryCount > maxRetries) {
          setStagedFiles((prev) =>
            prev.map((f) => (f.id === stagedFile.id ? { 
              ...f, 
              status: 'error',
              retryCount: undefined,
              error: error.response?.data?.detail || 'Eroare la încărcare'
            } : f)),
          );
          return { success: false, file: stagedFile, error };
        }
        
        // Așteaptă înainte de retry (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };

  const handleUpload = async () => {
    setIsUploading(true);
    
    // Filtrăm doar fișierele care sunt în starea 'staged'
    const filesToUpload = stagedFiles.filter(f => f.status === 'staged');
    
    if (filesToUpload.length === 0) {
      setIsUploading(false);
      return;
    }

    try {
      // Sortează fișierele după prioritate (1 = prioritate mare, 3 = prioritate mică)
      // Apoi după dimensiune (fișierele mici primele în fiecare categorie de prioritate)
      const sortedFiles = filesToUpload.sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority; // Prioritate mai mică = mai important
        }
        return a.file.size - b.file.size; // Fișiere mai mici primele
      });

      // Grupează fișierele în batch-uri pentru upload paralel controlat
      const batchSize = 3; // Maximum 3 fișiere în paralel
      const results = [];

      for (let i = 0; i < sortedFiles.length; i += batchSize) {
        const batch = sortedFiles.slice(i, i + batchSize);
        
        // Upload-ează batch-ul curent în paralel
        const batchPromises = batch.map(stagedFile => 
          uploadFileWithRetry(stagedFile)
        );
        
        const batchResults = await Promise.allSettled(batchPromises);
        results.push(...batchResults);
        
        // Scurtă pauză între batch-uri pentru a nu suprasolicita serverul
        if (i + batchSize < sortedFiles.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // Analizează rezultatele
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
      
      // Afișează rezultatele
      if (successful > 0 && failed === 0) {
        toast({ 
          title: 'Succes complet', 
          description: `Toate cele ${successful} fișiere au fost încărcate cu succes.` 
        });
      } else if (successful > 0 && failed > 0) {
        toast({ 
          title: 'Încărcare parțială', 
          description: `${successful} fișiere încărcate cu succes, ${failed} au eșuat.`,
          variant: 'destructive'
        });
      } else {
        toast({ 
          title: 'Eroare completă', 
          description: `Toate cele ${failed} fișiere au eșuat la încărcare.`,
          variant: 'destructive'
        });
      }
      
    } catch {
      toast({
        variant: 'destructive',
        title: 'Eroare neașteptată',
        description: 'A apărut o eroare în timpul procesului de încărcare.',
      });
    } finally {
      setIsUploading(false);
    }

    // Curăță fișierele cu succes după un timp scurt
    setTimeout(() => {
      setStagedFiles((prev) => prev.filter((f) => f.status !== 'success'));
      fetchMediaFiles();
      refreshUser();
    }, 2000);
  };

  // --- FUNCȚII PENTRU CONȚINUT WEB ---
  const handleWebContentSubmitInternal = async () => {
    setIsWebLoading(true);

    try {
      await apiClient.post('/media/web-content', webFormData);
      
      toast({
        title: 'Conținut web adăugat',
        description: `"${webFormData.filename}" a fost adăugat cu succes în bibliotecă.`,
      });

      // Reset form și închide modal
      const resetData = {
        filename: '',
        web_url: '',
        web_refresh_interval: 30,
        tags: ''
      };
      setWebFormData(resetData);
      webUnsavedChanges.updateInitialData(resetData);
      
      setIsWebModalOpen(false);
      fetchMediaFiles();
      
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Eroare',
        description: error.response?.data?.detail || 'Nu s-a putut adăuga conținutul web.',
      });
      throw error;
    } finally {
      setIsWebLoading(false);
    }
  };

  const handleWebContentSubmit = async (e) => {
    e.preventDefault();
    await handleWebContentSubmitInternal();
  };

  const handleWebModalClose = () => {
    if (!webUnsavedChanges.hasUnsavedChanges) {
      // Nu sunt modificări, închide direct
      const resetData = {
        filename: '',
        web_url: '',
        web_refresh_interval: 30,
        tags: ''
      };
      setWebFormData(resetData);
      setWebInitialData(resetData);
      setIsWebModalOpen(false);
      return;
    }

    // Sunt modificări nesalvate, afișează dialogul
    webUnsavedChanges.attemptAction(() => {
      const resetData = {
        filename: '',
        web_url: '',
        web_refresh_interval: 30,
        tags: ''
      };
      setWebFormData(resetData);
      setWebInitialData(resetData);
      setIsWebModalOpen(false);
    }, 'close');
  };

  // Inițializez datele pentru modalul web când se deschide
  const handleWebModalOpen = () => {
    const initialData = {
      filename: '',
      web_url: '',
      web_refresh_interval: 30,
      tags: ''
    };
    setWebFormData(initialData);
    setWebInitialData(initialData);
    setIsWebModalOpen(true);
  };

  const handleWebFormChange = (field, value) => {
    setWebFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // --- FUNCȚII PENTRU DOWNLOAD ---
  const handleDownload = async (file) => {
    try {
      // Pentru conținutul web, nu poate fi descărcat
      if (file.type === 'web/html') {
        toast({
          title: "Descărcare indisponibilă",
          description: "Conținutul web nu poate fi descărcat.",
          variant: "destructive",
        });
        return;
      }

      // Creează URL pentru descărcare
      const downloadUrl = `/api/media/serve/${file.id}`;
      
      // Creează un link temporar și simulează click-ul pentru descărcare
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = file.filename || `media_${file.id}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Descărcare inițiată",
        description: `Descărcarea fișierului "${file.filename}" a început.`,
      });
    } catch (error) {
      console.error('Eroare la descărcare:', error);
      toast({
        title: "Eroare la descărcare",
        description: "Nu s-a putut iniția descărcarea fișierului.",
        variant: "destructive",
      });
    }
  };

  // --- FUNCȚII PENTRU EDITARE ---
  const handleEditClick = (file) => {
    const initialData = {
      filename: file.filename || '',
      tags: file.tags || '',
      web_url: file.web_url || '',
      web_refresh_interval: file.web_refresh_interval || 30
    };
    
    setEditingFile(file);
    setEditFormData(initialData);
    setEditInitialData(initialData);
    setIsEditModalOpen(true);
  };

  const handleEditFormChange = (field, value) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Funcția internă pentru salvare (apelată de hook și din form)
  const handleEditSubmitInternal = async () => {
    if (!editingFile) return;

    setIsEditLoading(true);

    try {
      // Construiește payload-ul doar cu câmpurile modificate
      const payload = {};
      
      if (editFormData.filename !== editingFile.filename) {
        payload.filename = editFormData.filename;
      }
      
      if (editFormData.tags !== (editingFile.tags || '')) {
        payload.tags = editFormData.tags;
      }

      // Pentru conținut web
      if (editingFile.type === 'web/html') {
        if (editFormData.web_url !== editingFile.web_url) {
          payload.web_url = editFormData.web_url;
        }
        if (editFormData.web_refresh_interval !== editingFile.web_refresh_interval) {
          payload.web_refresh_interval = editFormData.web_refresh_interval;
        }
      }

      // Dacă nu s-a schimbat nimic, închide direct
      if (Object.keys(payload).length === 0) {
        setIsEditModalOpen(false);
        return;
      }

      await apiClient.put(`/media/${editingFile.id}`, payload);
      
      toast({
        title: 'Fișier actualizat',
        description: `"${editFormData.filename}" a fost actualizat cu succes.`,
      });

      // Actualizează datele inițiale după salvare cu succes
      editUnsavedChanges.updateInitialData(editFormData);
      setIsEditModalOpen(false);
      fetchMediaFiles();
      
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Eroare',
        description: error.response?.data?.detail || 'Nu s-a putut actualiza fișierul.',
      });
      throw error; // Re-throw pentru a permite hook-ului să gestioneze eroarea
    } finally {
      setIsEditLoading(false);
    }
  };

  // Funcția pentru submit din form
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    await handleEditSubmitInternal();
  };

  // Funcția pentru închiderea modalului cu verificarea modificărilor nesalvate
  const handleEditModalClose = () => {
    if (!editUnsavedChanges.hasUnsavedChanges) {
      // Nu sunt modificări, închide direct
      setIsEditModalOpen(false);
      setEditingFile(null);
      setEditFormData({
        filename: '',
        tags: '',
        web_url: '',
        web_refresh_interval: 30
      });
      setEditInitialData({});
      return;
    }

    // Sunt modificări nesalvate, afișează dialogul
    editUnsavedChanges.attemptAction(() => {
      setIsEditModalOpen(false);
      setEditingFile(null);
      setEditFormData({
        filename: '',
        tags: '',
        web_url: '',
        web_refresh_interval: 30
      });
      setEditInitialData({});
    }, 'close');
  };

  // --- FILTRARE ȘI STATISTICI TIPURI FIȘIERE ---
  const filteredMediaFiles = useMemo(() => {
    if (fileTypeFilter === 'all') return mediaFiles;
    
    return mediaFiles.filter(file => {
      switch (fileTypeFilter) {
        case 'images':
          return file.type.startsWith('image/');
        case 'videos':
          return file.type.startsWith('video/');
        case 'web':
          return file.type === 'web/html';
        case 'audio':
          return file.type.startsWith('audio/');
        default:
          return true;
      }
    });
  }, [mediaFiles, fileTypeFilter]);

  const fileTypeStats = useMemo(() => {
    const stats = mediaFiles.reduce((acc, file) => {
      if (file.type.startsWith('image/')) acc.images++;
      else if (file.type.startsWith('video/')) acc.videos++;
      else if (file.type === 'web/html') acc.web++;
      else if (file.type.startsWith('audio/')) acc.audio++;
      else acc.other++;
      return acc;
    }, { images: 0, videos: 0, web: 0, audio: 0, other: 0 });
    
    stats.total = mediaFiles.length;
    return stats;
  }, [mediaFiles]);

  const isAllSelected = useMemo(
    () => filteredMediaFiles.length > 0 && selectedFiles.length === filteredMediaFiles.length,
    [filteredMediaFiles, selectedFiles],
  );

  const storagePercentage = user ? (user.current_usage_mb / user.disk_quota_mb) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="p-4 md:p-8 mx-auto max-w-7xl space-y-8">
        {/* Header îmbunătățit */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <FolderOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Management Media</h1>
              <p className="text-muted-foreground">
                Gestionați biblioteca de fișiere multimedia pentru ecranele dumneavoastră
              </p>
            </div>
          </div>
          
          {/* Actions and Status */}
          <div className="flex items-center gap-4">
            {/* Web Content Button */}
            <Dialog open={isWebModalOpen} onOpenChange={(open) => {
              if (open) {
                handleWebModalOpen();
              } else {
                handleWebModalClose();
              }
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Globe className="h-4 w-4 mr-2" />
                  Pagină Web
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-blue-500" />
                    Adaugă Pagină Web
                  </DialogTitle>
                  <DialogDescription>
                    Adaugă o pagină web ca sursă de conținut pentru afișare pe ecrane.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleWebContentSubmit} className="space-y-4">
                  <div className="grid w-full gap-1.5">
                    <Label htmlFor="filename">Nume descriptiv</Label>
                    <Input
                      id="filename"
                      placeholder="ex: Pagina principală"
                      value={webFormData.filename}
                      onChange={(e) => handleWebFormChange('filename', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="grid w-full gap-1.5">
                    <Label htmlFor="web_url">URL pagină web</Label>
                    <Input
                      id="web_url"
                      type="url"
                      placeholder="https://example.com"
                      value={webFormData.web_url}
                      onChange={(e) => handleWebFormChange('web_url', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="grid w-full gap-1.5">
                    <Label htmlFor="refresh_interval">Interval refresh (secunde)</Label>
                    <Input
                      id="refresh_interval"
                      type="number"
                      min="5"
                      max="3600"
                      value={webFormData.web_refresh_interval}
                      onChange={(e) => handleWebFormChange('web_refresh_interval', parseInt(e.target.value) || 30)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Pagina se va actualiza automat la fiecare {webFormData.web_refresh_interval} secunde
                    </p>
                  </div>
                  
                  <div className="grid w-full gap-1.5">
                    <Label htmlFor="tags">Tag-uri (opțional)</Label>
                    <Input
                      id="tags"
                      placeholder="ex: știri, anunțuri"
                      value={webFormData.tags}
                      onChange={(e) => handleWebFormChange('tags', e.target.value)}
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleWebModalClose}
                      disabled={isWebLoading}
                    >
                      Anulează
                    </Button>
                    <Button type="submit" disabled={isWebLoading}>
                      {isWebLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Se adaugă...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Adaugă
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            
            <div className="flex items-center space-x-2 px-3 py-2 bg-muted/50 rounded-lg">
              <Database className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">
                {fileTypeFilter === 'all' 
                  ? `${mediaFiles.length} fișier${mediaFiles.length !== 1 ? 'e' : ''}`
                  : `${filteredMediaFiles.length}/${mediaFiles.length} fișier${filteredMediaFiles.length !== 1 ? 'e' : ''}`
                }
              </span>
            </div>
          </div>
        </div>

        {/* Storage card */}
        <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader>
            <CardTitle className="flex items-center">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg mr-3">
                <HardDrive className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              Spațiu de Stocare
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium">Utilizare curentă</span>
              <span className="text-muted-foreground">
                {`${user.current_usage_mb.toFixed(2)} MB / ${user.disk_quota_mb} MB`}
              </span>
            </div>
            <Progress value={storagePercentage} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0 MB</span>
              <span className={storagePercentage > 90 ? "text-red-500 font-medium" : ""}>
                {storagePercentage.toFixed(1)}% utilizat
              </span>
              <span>{user.disk_quota_mb} MB</span>
            </div>
          </CardContent>
        </Card>

      <FileUploadDropzone onFilesStaged={handleFilesStaged} />

        {stagedFiles.length > 0 && (
          <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="flex items-center">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg mr-3">
                  <Upload className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                Fișiere pregătite pentru încărcare
              </CardTitle>
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-100 dark:bg-green-900/30 rounded flex items-center justify-center">
                      <File className="h-2 w-2 text-green-600 dark:text-green-400" />
                    </div>
                    Imagini (prioritate mare)
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-yellow-100 dark:bg-yellow-900/30 rounded flex items-center justify-center">
                      <File className="h-2 w-2 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    Audio (prioritate medie)
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-100 dark:bg-red-900/30 rounded flex items-center justify-center">
                      <File className="h-2 w-2 text-red-600 dark:text-red-400" />
                    </div>
                    Video (prioritate mică)
                  </span>
                </div>
                <p>📦 Fișiere &gt;100MB folosesc chunk upload • 🗜️ Imagini &gt;2MB se comprimă automat</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 max-h-96 overflow-y-auto">
              {stagedFiles.map((item) => (
                <div key={item.id} className="space-y-2 p-3 bg-muted/20 rounded-lg border border-border/50">
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <div className={cn(
                        "p-1 rounded",
                        item.priority === 1 && "bg-green-100 dark:bg-green-900/30", // imagini - prioritate mare
                        item.priority === 2 && "bg-yellow-100 dark:bg-yellow-900/30", // audio - prioritate medie  
                        item.priority === 3 && "bg-red-100 dark:bg-red-900/30", // video - prioritate mică
                        !item.priority && "bg-blue-100 dark:bg-blue-900/30"
                      )}>
                        <File className={cn(
                          "h-3 w-3",
                          item.priority === 1 && "text-green-600 dark:text-green-400",
                          item.priority === 2 && "text-yellow-600 dark:text-yellow-400",
                          item.priority === 3 && "text-red-600 dark:text-red-400",
                          !item.priority && "text-blue-600 dark:text-blue-400"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="truncate font-medium block">{item.file.name}</span>
                        {item.isLargeFile && (
                          <span className="text-xs text-orange-500 dark:text-orange-400">📦 Fișier mare - chunk upload</span>
                        )}
                        {item.isCompressed && (
                          <span className="text-xs text-green-500 dark:text-green-400">
                            🗜️ Comprimat -{item.compressionRatio}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-muted-foreground font-mono text-xs">{formatBytes(item.file.size)}</span>
                      {item.status === 'error' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                          onClick={() => handleRetryFailedFile(item.id)}
                          disabled={isUploading}
                          title="Reîncearcă upload-ul"
                        >
                          <Loader2 className="h-3 w-3 text-blue-500" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:bg-red-100 dark:hover:bg-red-900/30"
                        onClick={() => handleRemoveStagedFile(item.id)}
                        disabled={isUploading && item.status === 'uploading'}
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  <Progress
                    value={item.progress}
                    className={cn(
                      'h-2',
                      item.status === 'success' && '[&>div]:bg-green-500',
                      item.status === 'error' && '[&>div]:bg-red-500',
                      item.status === 'uploading' && '[&>div]:bg-blue-500',
                    )}
                  />
                  {item.status === 'success' && (
                    <p className="text-xs text-green-600 dark:text-green-400">✓ Încărcat cu succes</p>
                  )}
                  {item.status === 'error' && (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      ✗ {item.error || 'Eroare la încărcare'}
                    </p>
                  )}
                  {item.status === 'compressing' && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">🗜️ Se comprimă imaginea...</p>
                  )}
                  {item.status === 'uploading' && (
                    <div className="flex items-center justify-between text-xs">
                      <p className="text-blue-600 dark:text-blue-400">
                        📤 Se încarcă... {item.progress}%
                        {item.chunkInfo && <span className="ml-1">({item.chunkInfo})</span>}
                      </p>
                      {item.retryCount && (
                        <p className="text-orange-500 dark:text-orange-400">
                          Reîncercare {item.retryCount}/3
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between bg-muted/50 p-4 rounded-b-lg">
              <div className="text-sm">
                <span className="font-semibold">Total de încărcat: </span>
                <span className={cn('font-bold font-mono', isOverQuota && 'text-red-500')}>
                  {formatBytes(totalStagedSizeBytes)}
                </span>
              </div>
              {isOverQuota && (
                <div className="flex items-center text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg border border-red-200 dark:border-red-800">
                  <AlertCircle className="mr-1.5 h-4 w-4" />
                  Spațiu insuficient. Eliberați{' '}
                  <span className="font-mono mx-1">{formatBytes(totalStagedSizeBytes - availableSpaceBytes)}</span>
                  pentru a putea încărca.
                </div>
              )}
              <Button
                onClick={handleUpload}
                disabled={isUploading || isOverQuota || stagedFiles.filter((f) => f.status === 'staged').length === 0}
                size="lg"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Upload paralel în curs...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Încarcă Paralel ({stagedFiles.filter((f) => f.status === 'staged').length})
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Controls și filtere */}
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              {/* Bulk actions */}
              <div className="flex items-center gap-2">
                {selectedFiles.length > 0 ? (
                  <Button variant="destructive" onClick={() => handleDeleteClick(null)}>
                    <Trash2 className="mr-2 h-4 w-4" /> 
                    Șterge ({selectedFiles.length})
                  </Button>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Selectați fișiere pentru acțiuni în masă
                  </div>
                )}
                
                {/* File Type Filter */}
                <div className="flex items-center gap-2 ml-4">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={fileTypeFilter} onValueChange={setFileTypeFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Toate tipurile" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <div className="flex items-center gap-2">
                          <Database className="h-4 w-4" />
                          Toate ({fileTypeStats.total})
                        </div>
                      </SelectItem>
                      <SelectItem value="images">
                        <div className="flex items-center gap-2">
                          <Image className="h-4 w-4 text-green-500" />
                          Imagini ({fileTypeStats.images})
                        </div>
                      </SelectItem>
                      <SelectItem value="videos">
                        <div className="flex items-center gap-2">
                          <Video className="h-4 w-4 text-red-500" />
                          Video ({fileTypeStats.videos})
                        </div>
                      </SelectItem>
                      <SelectItem value="web">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-blue-500" />
                          Web ({fileTypeStats.web})
                        </div>
                      </SelectItem>
                      {fileTypeStats.audio > 0 && (
                        <SelectItem value="audio">
                          <div className="flex items-center gap-2">
                            <File className="h-4 w-4 text-yellow-500" />
                            Audio ({fileTypeStats.audio})
                          </div>
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Search și view controls */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Caută fișiere..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full md:w-64 pl-10 h-12"
                  />
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerateThumbnails}
                  className="flex items-center gap-2"
                  title="Regenerează thumbnail-uri pentru imaginile existente"
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Regenerează Thumbnails</span>
                </Button>
                
                <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                  <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => setViewMode('grid')}
                    className="h-10 w-10"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => setViewMode('list')}
                    className="h-10 w-10"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card className="shadow-sm">
            <CardContent className="flex items-center justify-center p-12">
              <div className="flex items-center space-x-3 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Se încarcă fișierele...</span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                {filteredMediaFiles.map((file) => (
                  <Card key={file.id} className="overflow-hidden relative group shadow-sm hover:shadow-md transition-shadow duration-200">
                    <CardContent className="p-0">
                      <div className="absolute top-3 left-3 z-10">
                        <div className="bg-white/90 dark:bg-black/90 rounded p-1">
                          <Checkbox
                            checked={selectedFiles.includes(file.id)}
                            onCheckedChange={() => handleSelectFile(file.id)}
                          />
                        </div>
                      </div>
                      <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 shadow-lg bg-white/90 dark:bg-gray-900/90"
                          onClick={() => handleDownload(file)}
                          disabled={file.type === 'web/html'}
                          title={file.type === 'web/html' ? 'Conținutul web nu poate fi descărcat' : 'Descarcă fișierul'}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 shadow-lg bg-white/90 dark:bg-gray-900/90"
                          onClick={() => handleEditClick(file)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8 shadow-lg"
                          onClick={() => handleDeleteClick(file)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="aspect-video bg-muted flex items-center justify-center rounded-t-lg overflow-hidden">
                        <MediaPreview file={file} />
                      </div>
                    </CardContent>
                    <CardFooter className="p-4 space-y-2">
                      <div className="w-full">
                        <p className="truncate w-full font-medium text-sm">{file.filename}</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                          <span className="font-mono">{formatBytes(file.size)}</span>
                          {file.duration && (
                            <span className="font-mono">{Math.round(file.duration)}s</span>
                          )}
                        </div>
                        {file.processing_status && file.processing_status !== 'COMPLETED' && (
                          <div className="mt-2">
                            <VideoProcessingProgress 
                              mediaFile={file} 
                              onProcessingComplete={() => fetchMediaFiles()} 
                            />
                          </div>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-6 py-4">
                          <Checkbox checked={isAllSelected} onCheckedChange={handleSelectAll} />
                        </th>
                        <SortableHeader
                          columnKey="filename"
                          sortConfig={sortConfig}
                          onSort={handleSort}
                        >
                          Nume Fișier
                        </SortableHeader>
                        <th className="px-6 py-4 text-left font-semibold">Tip</th>
                        <SortableHeader columnKey="size" sortConfig={sortConfig} onSort={handleSort}>
                          Dimensiune
                        </SortableHeader>
                        <SortableHeader
                          columnKey="duration"
                          sortConfig={sortConfig}
                          onSort={handleSort}
                        >
                          Durată
                        </SortableHeader>
                        <th className="px-6 py-4 text-left font-semibold">Status</th>
                        <th className="px-6 py-4 text-right font-semibold">Acțiuni</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredMediaFiles.map((file) => (
                        <tr key={file.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4">
                            <Checkbox
                              checked={selectedFiles.includes(file.id)}
                              onCheckedChange={() => handleSelectFile(file.id)}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className={cn(
                                "p-1 rounded",
                                file.type === 'web/html' 
                                  ? "bg-blue-100 dark:bg-blue-900/30" 
                                  : "bg-gray-100 dark:bg-gray-900/30"
                              )}>
                                {file.type === 'web/html' ? (
                                  <Globe className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                ) : (
                                  <File className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium">{file.filename}</span>
                                {file.type === 'web/html' && (
                                  <span className="text-xs text-blue-500">Conținut Web</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-muted/50 rounded-full text-xs font-medium">
                              {file.type.split('/')[1]?.toUpperCase() || file.type}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-sm">{formatBytes(file.size)}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-sm">
                              {file.duration ? `${Math.round(file.duration)}s` : '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {file.processing_status && file.processing_status !== 'COMPLETED' ? (
                              <div className="min-w-[200px]">
                                <VideoProcessingProgress 
                                  mediaFile={file} 
                                  onProcessingComplete={() => fetchMediaFiles()} 
                                />
                              </div>
                            ) : (
                              <span className="text-xs text-green-600 dark:text-green-400">✓ Complet</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleDownload(file)}
                                disabled={file.type === 'web/html'}
                                className="h-8 w-8 hover:bg-green-100 dark:hover:bg-green-900/30"
                                title={file.type === 'web/html' ? 'Conținutul web nu poate fi descărcat' : 'Descarcă fișierul'}
                              >
                                <Download className="h-4 w-4 text-green-500" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleEditClick(file)}
                                className="h-8 w-8 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                              >
                                <Edit className="h-4 w-4 text-blue-500" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleDeleteClick(file)}
                                className="h-8 w-8 hover:bg-red-100 dark:hover:bg-red-900/30"
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
            {filteredMediaFiles.length === 0 && !loading && (
              <Card className="shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="p-4 bg-muted/50 rounded-full mb-4">
                    <FolderOpen className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Niciun fișier găsit</h3>
                  <p className="text-muted-foreground text-center">
                    {searchTerm 
                      ? 'Niciun fișier nu corespunde criteriilor de căutare.' 
                      : fileTypeFilter !== 'all'
                        ? 'Nu există fișiere pentru tipul selectat. Încercați alt filtru.'
                        : 'Nu aveți încă fișiere media. Începeți prin a încărca primul fișier.'
                    }
                  </p>
                  {(fileTypeFilter !== 'all' && !searchTerm) && (
                    <Button 
                      variant="outline" 
                      onClick={() => setFileTypeFilter('all')} 
                      className="mt-4"
                    >
                      Afișați toate fișierele
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Pagination */}
        {totalItems > ITEMS_PER_PAGE && (
          <div className="flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </div>
        )}

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Ești absolut sigur?</AlertDialogTitle>
              <AlertDialogDescription>
                {itemToDelete?.type === 'single' &&
                  `Această acțiune nu poate fi anulată. Fișierul media "${itemToDelete?.name}" va fi șters permanent.`}
                {itemToDelete?.type === 'bulk' &&
                  `Această acțiune nu poate fi anulată. Cele ${itemToDelete?.count} fișiere selectate vor fi șterse permanent.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setItemToDelete(null)}>Anulează</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>Da, șterge</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={(open) => {
          if (!open) {
            handleEditModalClose();
          } else {
            setIsEditModalOpen(true);
          }
        }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-blue-500" />
                Editează {editingFile?.type === 'web/html' ? 'Conținutul Web' : 'Fișierul'}
              </DialogTitle>
              <DialogDescription>
                Modifică proprietățile și setările pentru acest element media.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid w-full gap-1.5">
                <Label htmlFor="edit-filename">Nume</Label>
                <Input
                  id="edit-filename"
                  placeholder="Nume descriptiv"
                  value={editFormData.filename}
                  onChange={(e) => handleEditFormChange('filename', e.target.value)}
                  required
                />
              </div>
              
              <div className="grid w-full gap-1.5">
                <Label htmlFor="edit-tags">Tag-uri</Label>
                <Input
                  id="edit-tags"
                  placeholder="ex: știri, anunțuri (opțional)"
                  value={editFormData.tags}
                  onChange={(e) => handleEditFormChange('tags', e.target.value)}
                />
              </div>

              {/* Câmpuri specifice pentru conținut web */}
              {editingFile?.type === 'web/html' && (
                <>
                  <div className="grid w-full gap-1.5">
                    <Label htmlFor="edit-web-url">URL pagină web</Label>
                    <Input
                      id="edit-web-url"
                      type="url"
                      placeholder="https://example.com"
                      value={editFormData.web_url}
                      onChange={(e) => handleEditFormChange('web_url', e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Modificarea URL-ului va regenera automat thumbnail-ul
                    </p>
                  </div>
                  
                  <div className="grid w-full gap-1.5">
                    <Label htmlFor="edit-refresh-interval">Interval refresh (secunde)</Label>
                    <Input
                      id="edit-refresh-interval"
                      type="number"
                      min="5"
                      max="3600"
                      value={editFormData.web_refresh_interval}
                      onChange={(e) => handleEditFormChange('web_refresh_interval', parseInt(e.target.value) || 30)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Pagina se va actualiza automat la fiecare {editFormData.web_refresh_interval} secunde
                    </p>
                  </div>
                </>
              )}
              
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleEditModalClose}
                  disabled={isEditLoading}
                >
                  Anulează
                </Button>
                <Button type="submit" disabled={isEditLoading}>
                  {isEditLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Se salvează...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvează
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Unsaved Changes Dialog pentru modalul de editare */}
        <UnsavedChangesDialog
          {...editUnsavedChanges.confirmDialogProps}
          isSaving={isEditLoading}
        />

        {/* Unsaved Changes Dialog pentru modalul de conținut web */}
        <UnsavedChangesDialog
          {...webUnsavedChanges.confirmDialogProps}
          isSaving={isWebLoading}
        />

        {/* Global Unsaved Changes Dialog */}
        <UnsavedChangesDialog
          {...globalUnsavedChanges.confirmDialogProps}
          customMessage="Aveți modificări nesalvate în pagină (fișiere staged sau formulare deschise). Ce doriți să faceți?"
        />
      </div>
    </div>
  );
}

export default MediaPage;
