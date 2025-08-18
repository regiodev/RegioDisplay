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
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import apiClient from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import VideoProcessingProgress from '../components/VideoProcessingProgress';

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
          <File className="w-10 h-10" />
          <span className="mt-2 text-xs text-center px-1">{file.filename}</span>
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

  // --- STĂRI NOI PENTRU UPLOAD ---
  const [stagedFiles, setStagedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

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
      setSelectedFiles(mediaFiles.map((file) => file.id));
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
    } catch (error) {
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

  const isAllSelected = useMemo(
    () => mediaFiles.length > 0 && selectedFiles.length === mediaFiles.length,
    [mediaFiles, selectedFiles],
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
          
          {/* Status indicator */}
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2 px-3 py-2 bg-muted/50 rounded-lg">
              <Database className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">
                {mediaFiles.length} fișier{mediaFiles.length !== 1 ? 'e' : ''}
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
                {mediaFiles.map((file) => (
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
                      <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
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
                      {mediaFiles.map((file) => (
                        <tr key={file.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4">
                            <Checkbox
                              checked={selectedFiles.includes(file.id)}
                              onCheckedChange={() => handleSelectFile(file.id)}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded">
                                <File className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                              </div>
                              <span className="font-medium">{file.filename}</span>
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
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDeleteClick(file)}
                              className="h-8 w-8 hover:bg-red-100 dark:hover:bg-red-900/30"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
            {mediaFiles.length === 0 && !loading && (
              <Card className="shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="p-4 bg-muted/50 rounded-full mb-4">
                    <FolderOpen className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Niciun fișier găsit</h3>
                  <p className="text-muted-foreground text-center">
                    {searchTerm 
                      ? 'Niciun fișier nu corespunde criteriilor de căutare.' 
                      : 'Nu aveți încă fișiere media. Începeți prin a încărca primul fișier.'
                    }
                  </p>
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
      </div>
    </div>
  );
}

export default MediaPage;
