// Cale fișier: src/pages/MediaPage.jsx

import { useState, useEffect, useCallback, useMemo } from 'react';
import apiClient from '../api/axios';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Pagination from '@/components/Pagination';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUp, ArrowDown, Upload, Trash2, LayoutGrid, List, File } from 'lucide-react';

const ITEMS_PER_PAGE = 12;

const SortableHeader = ({ children, columnKey, sortConfig, onSort }) => {
  const isSorted = sortConfig.key === columnKey;
  const direction = isSorted ? sortConfig.direction : 'none';
  return (
    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700" onClick={() => onSort(columnKey)}>
      <div className="flex items-center space-x-2">
        <span>{children}</span>
        {isSorted && (<span>{direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}</span>)}
      </div>
    </th>
  );
};

function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

const MediaPreview = ({ file }) => {
    const mediaServeUrl = `${apiClient.defaults.baseURL}/media/serve/`;
    const thumbnailBaseUrl = `${apiClient.defaults.baseURL}/media/thumbnails/`;

    if (file.type.startsWith('image/')) {
        return <img src={`${mediaServeUrl}${file.id}`} alt={file.filename} className="w-full h-full object-cover" />;
    }
    if (file.thumbnail_path) {
        return <img src={`${thumbnailBaseUrl}${file.thumbnail_path}`} alt={file.filename} className="w-full h-full object-cover" />;
    }
    return (
        <div className="flex flex-col items-center justify-center h-full bg-muted text-muted-foreground">
            <File className="w-10 h-10" />
            <span className="mt-2 text-xs text-center px-1">{file.filename}</span>
        </div>
    );
}

function MediaPage() {
  const [mediaFiles, setMediaFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [viewMode, setViewMode] = useState('grid');

  const { toast } = useToast();

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
      toast({ variant: "destructive", title: "Eroare", description: "Nu s-au putut încărca fișierele media." });
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, sortConfig, toast]);

  useEffect(() => {
    fetchMediaFiles();
  }, [fetchMediaFiles]);
  
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleSelectFile = (fileId) => {
    setSelectedFiles(prev =>
      prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
    );
  };
  
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedFiles(mediaFiles.map(file => file.id));
    } else {
      setSelectedFiles([]);
    }
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
      toast({ title: "Succes", description: `Ștergerea a fost efectuată.` });
      setSelectedFiles([]);
      fetchMediaFiles();
    } catch (error) {
       toast({ variant: "destructive", title: "Eroare", description: error.response?.data?.detail || "Ștergerea a eșuat." });
    } finally {
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
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

  const handleFileUpload = async (event) => {
    const files = event.target.files;
    if (files.length === 0) return;

    const formData = new FormData();
    for (const file of files) {
        formData.append('files', file);
    }

    toast({ title: "Încărcare...", description: `Se încarcă ${files.length} fișier(e).`});

    try {
        await apiClient.post('/media/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast({ title: "Succes!", description: "Fișierele au fost încărcate."});
        fetchMediaFiles();
    } catch (error) {
        toast({ variant: "destructive", title: "Eroare la încărcare", description: error.response?.data?.detail || "A apărut o problemă." });
    }
  };
  
  const isAllSelected = useMemo(() => mediaFiles.length > 0 && selectedFiles.length === mediaFiles.length, [mediaFiles, selectedFiles]);

  return (
    <div className="p-4 md:p-8 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Management Media</h1>
        <div className="flex items-center gap-2">
            <Input
                type="search"
                placeholder="Caută după nume..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-64"
            />
            <Button asChild>
              <Label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" /> Încarcă
              </Label>
            </Button>
            <Input id="file-upload" type="file" multiple className="hidden" onChange={handleFileUpload} />
        </div>
      </div>
        
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
           {selectedFiles.length > 0 && (
            <Button variant="destructive" onClick={() => handleDeleteClick(null)}>
              <Trash2 className="mr-2 h-4 w-4" /> Șterge ({selectedFiles.length})
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('grid')}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('list')}>
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
              {mediaFiles.map(file => (
                <Card key={file.id} className="overflow-hidden relative group">
                  <CardContent className="p-0">
                    <div className="absolute top-2 left-2 z-10">
                       <Checkbox checked={selectedFiles.includes(file.id)} onCheckedChange={() => handleSelectFile(file.id)} />
                    </div>
                    <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                       <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDeleteClick(file)}><Trash2 className="h-4 w-4"/></Button>
                    </div>
                    <div className="aspect-video bg-muted flex items-center justify-center">
                        <MediaPreview file={file} />
                    </div>
                  </CardContent>
                  <CardFooter className="p-3 flex flex-col items-start text-sm">
                    <p className="font-semibold truncate w-full">{file.filename}</p>
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
                      <th className="px-4 py-3"><Checkbox checked={isAllSelected} onCheckedChange={handleSelectAll} /></th>
                      <SortableHeader columnKey="filename" sortConfig={sortConfig} onSort={handleSort}>Nume Fișier</SortableHeader>
                      <th className="px-4 py-3">Tip</th>
                      <SortableHeader columnKey="size" sortConfig={sortConfig} onSort={handleSort}>Dimensiune</SortableHeader>
                      <SortableHeader columnKey="duration" sortConfig={sortConfig} onSort={handleSort}>Durată</SortableHeader>
                      <th className="px-4 py-3">Acțiuni</th>
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-950 divide-y divide-gray-200 dark:divide-slate-800">
                  {mediaFiles.map(file => (
                    <tr key={file.id}>
                        <td data-label="Select"><Checkbox checked={selectedFiles.includes(file.id)} onCheckedChange={() => handleSelectFile(file.id)} /></td>
                        <td data-label="Nume" className="font-medium">{file.filename}</td>
                        <td data-label="Tip">{file.type}</td>
                        {/* AICI ESTE MODIFICAREA */}
                        <td data-label="Dimensiune" className="text-right pr-4">{formatBytes(file.size)}</td>
                        <td data-label="Durată">{file.duration ? `${Math.round(file.duration)}s` : '-'}</td>
                        <td data-label="Acțiuni">
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(file)}><Trash2 className="h-4 w-4 text-red-500"/></Button>
                        </td>
                   </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
          {(mediaFiles.length === 0 && !loading) && ( <div className="col-span-full text-center text-gray-500 mt-6">Niciun fișier nu corespunde criteriilor.</div>)}
        </>
      )}
      
      <Pagination
        currentPage={currentPage} totalItems={totalItems} itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={(page) => setCurrentPage(page)}
      />
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ești absolut sigur?</AlertDialogTitle>
            <AlertDialogDescription>
              {itemToDelete?.type === 'single' && `Această acțiune nu poate fi anulată. Fișierul media "${itemToDelete?.name}" va fi șters permanent.`}
              {itemToDelete?.type === 'bulk' && `Această acțiune nu poate fi anulată. Cele ${itemToDelete?.count} fișiere selectate vor fi șterse permanent.`}
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