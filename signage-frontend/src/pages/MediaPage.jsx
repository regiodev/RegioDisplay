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

  return (
    <div className="relative w-full h-full">
      {isProcessing && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white z-10">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-xs mt-2">În procesare...</span>
        </div>
      )}

      {file.type.startsWith('image/') && (
        <img
          src={`${mediaServeUrl}${file.id}`}
          alt={file.filename}
          className="w-full h-full object-cover"
        />
      )}
      {file.thumbnail_path && (
        <img
          src={`${thumbnailBaseUrl}${file.thumbnail_path}`}
          alt={file.filename}
          className="w-full h-full object-cover"
        />
      )}
      {!file.type.startsWith('image/') && !file.thumbnail_path && (
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

  const handleFilesStaged = (files) => {
    const newFiles = Array.from(files).map((file) => ({
      id: `${file.name}-${file.lastModified}-${file.size}`, // Cheie mai unică
      file,
      status: 'staged', // staged | uploading | success | error
      progress: 0,
    }));
    setStagedFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveStagedFile = (id) => {
    setStagedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleUpload = async () => {
    setIsUploading(true);
    for (const stagedFile of stagedFiles) {
      // Verificăm dacă fișierul este încă în starea 'staged' înainte de a încerca să-l încărcăm
      if (stagedFiles.find((f) => f.id === stagedFile.id)?.status !== 'staged') continue;

      const formData = new FormData();
      formData.append('files', stagedFile.file);

      try {
        setStagedFiles((prev) =>
          prev.map((f) => (f.id === stagedFile.id ? { ...f, status: 'uploading' } : f)),
        );

        await apiClient.post('/media/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setStagedFiles((prev) =>
              prev.map((f) => (f.id === stagedFile.id ? { ...f, progress: percentCompleted } : f)),
            );
          },
        });

        setStagedFiles((prev) =>
          prev.map((f) => (f.id === stagedFile.id ? { ...f, status: 'success' } : f)),
        );
      } catch (error) {
        setStagedFiles((prev) =>
          prev.map((f) => (f.id === stagedFile.id ? { ...f, status: 'error' } : f)),
        );
        toast({
          variant: 'destructive',
          title: `Eroare la încărcarea ${stagedFile.file.name}`,
          description: error.response?.data?.detail || 'A apărut o problemă.',
        });
        setIsUploading(false); // Oprim procesul la prima eroare
        return;
      }
    }

    setIsUploading(false);
    toast({ title: 'Finalizat', description: 'Procesul de încărcare s-a terminat.' });

    // După un scurt timp pentru ca utilizatorul să vadă barele verzi, curățăm lista și reîmprospătăm datele
    setTimeout(() => {
      setStagedFiles((prev) => prev.filter((f) => f.status !== 'success'));
      fetchMediaFiles();
      refreshUser();
    }, 1500);
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
            </CardHeader>
            <CardContent className="space-y-3 max-h-96 overflow-y-auto">
              {stagedFiles.map((item) => (
                <div key={item.id} className="space-y-2 p-3 bg-muted/20 rounded-lg border border-border/50">
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded">
                        <File className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="truncate font-medium">{item.file.name}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-muted-foreground font-mono text-xs">{formatBytes(item.file.size)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:bg-red-100 dark:hover:bg-red-900/30"
                        onClick={() => handleRemoveStagedFile(item.id)}
                        disabled={isUploading}
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
                    )}
                  />
                  {item.status === 'success' && (
                    <p className="text-xs text-green-600 dark:text-green-400">✓ Încărcat cu succes</p>
                  )}
                  {item.status === 'error' && (
                    <p className="text-xs text-red-600 dark:text-red-400">✗ Eroare la încărcare</p>
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
                disabled={isUploading || isOverQuota || stagedFiles.length === 0}
                size="lg"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Se încarcă...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Încarcă Acum ({stagedFiles.filter((f) => f.status === 'staged').length})
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
                          <div className="flex items-center gap-1 mt-2">
                            <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
                            <span className="text-xs text-amber-600 dark:text-amber-400">În procesare...</span>
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
                              <div className="flex items-center gap-2">
                                <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
                                <span className="text-xs text-amber-600 dark:text-amber-400">În procesare</span>
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
