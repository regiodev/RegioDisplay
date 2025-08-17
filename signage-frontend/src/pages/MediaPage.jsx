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
        'relative flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200 ease-in-out',
        isDragging
          ? 'border-primary bg-primary/10'
          : 'border-slate-300 dark:border-slate-600 hover:border-primary/50',
      )}
    >
      <input ref={inputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
      <div className="flex flex-col items-center justify-center text-center">
        <Upload className="h-8 w-8 text-slate-500 dark:text-slate-400 mb-2" />
        <p className="font-semibold text-slate-700 dark:text-slate-200">
          Trageți fișierele aici sau <span className="text-primary">click pentru a naviga</span>
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Selectare multiplă este permisă
        </p>
      </div>
    </div>
  );
};

const SortableHeader = ({ children, columnKey, sortConfig, onSort }) => {
  const isSorted = sortConfig.key === columnKey;
  const direction = isSorted ? sortConfig.direction : 'none';
  return (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700"
      onClick={() => onSort(columnKey)}
    >
      <div className="flex items-center space-x-2">
        <span>{children}</span>
        {isSorted && (
          <span>
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
    } catch (error) {
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
    <div className="p-4 md:p-8 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Management Media</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center text-sm font-medium">
              <HardDrive className="mr-2 h-4 w-4" /> Spațiu de Stocare
            </div>
            <span className="text-sm text-muted-foreground">
              {`${user.current_usage_mb.toFixed(2)} MB / ${user.disk_quota_mb} MB utilizați`}
            </span>
          </div>
          <Progress value={storagePercentage} />
        </CardContent>
      </Card>

      <FileUploadDropzone onFilesStaged={handleFilesStaged} />

      {stagedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Fișiere pregătite pentru încărcare</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {stagedFiles.map((item) => (
              <div key={item.id} className="space-y-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="truncate pr-2">{item.file.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{formatBytes(item.file.size)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleRemoveStagedFile(item.id)}
                      disabled={isUploading}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
                <Progress
                  value={item.progress}
                  className={cn(
                    item.status === 'success' && '[&>div]:bg-green-500',
                    item.status === 'error' && '[&>div]:bg-red-500',
                  )}
                />
              </div>
            ))}
          </CardContent>
          <CardFooter className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between bg-muted/50 p-4 rounded-b-lg">
            <div className="text-sm">
              <span className="font-semibold">Total de încărcat: </span>
              <span className={cn('font-bold', isOverQuota && 'text-red-500')}>
                {formatBytes(totalStagedSizeBytes)}
              </span>
            </div>
            {isOverQuota && (
              <div className="flex items-center text-xs text-red-600">
                <AlertCircle className="mr-1.5 h-4 w-4" />
                Spațiu insuficient. Eliberați{' '}
                {formatBytes(totalStagedSizeBytes - availableSpaceBytes)} pentru a putea încărca.
              </div>
            )}
            <Button
              onClick={handleUpload}
              disabled={isUploading || isOverQuota || stagedFiles.length === 0}
            >
              {isUploading
                ? 'Se încarcă...'
                : `Încarcă Acum (${stagedFiles.filter((f) => f.status === 'staged').length})`}
            </Button>
          </CardFooter>
        </Card>
      )}

      <div className="flex items-center justify-between pt-4">
        <div className="flex items-center gap-2">
          {selectedFiles.length > 0 && (
            <Button variant="destructive" onClick={() => handleDeleteClick(null)}>
              <Trash2 className="mr-2 h-4 w-4" /> Șterge ({selectedFiles.length})
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="search"
            placeholder="Caută..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-48"
          />
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center p-8">Se încarcă...</div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {mediaFiles.map((file) => (
                <Card key={file.id} className="overflow-hidden relative group">
                  <CardContent className="p-0">
                    <div className="absolute top-2 left-2 z-10">
                      <Checkbox
                        checked={selectedFiles.includes(file.id)}
                        onCheckedChange={() => handleSelectFile(file.id)}
                      />
                    </div>
                    <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDeleteClick(file)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="aspect-video bg-muted flex items-center justify-center">
                      <MediaPreview file={file} />
                    </div>
                  </CardContent>
                  <CardFooter className="p-3 flex flex-col items-start text-sm">
                    <p className="truncate w-full">{file.filename}</p>
                    <p className="text-muted-foreground">{formatBytes(file.size)}</p>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800 responsive-table">
                <thead className="bg-gray-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-4 py-3">
                      <Checkbox checked={isAllSelected} onCheckedChange={handleSelectAll} />
                    </th>
                    <SortableHeader
                      columnKey="filename"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                    >
                      Nume Fișier
                    </SortableHeader>
                    <th className="px-4 py-3">Tip</th>
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
                    <th className="px-4 py-3">Acțiuni</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-950 divide-y divide-gray-200 dark:divide-slate-800">
                  {mediaFiles.map((file) => (
                    <tr key={file.id}>
                      <td data-label="Select">
                        <Checkbox
                          checked={selectedFiles.includes(file.id)}
                          onCheckedChange={() => handleSelectFile(file.id)}
                        />
                      </td>
                      <td data-label="Nume">
                        {file.filename}
                      </td>
                      <td data-label="Tip">{file.type}</td>
                      <td data-label="Dimensiune" className="text-right pr-4">
                        {formatBytes(file.size)}
                      </td>
                      <td data-label="Durată">
                        {file.duration ? `${Math.round(file.duration)}s` : '-'}
                      </td>
                      <td data-label="Acțiuni">
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(file)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {mediaFiles.length === 0 && !loading && (
            <div className="col-span-full text-center text-gray-500 mt-6">
              Niciun fișier nu corespunde criteriilor.
            </div>
          )}
        </>
      )}

      <Pagination
        currentPage={currentPage}
        totalItems={totalItems}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={(page) => setCurrentPage(page)}
      />

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
  );
}

export default MediaPage;
