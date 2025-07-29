import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/axios';
import { Button } from "@/components/ui/button";
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

// Funcție ajutătoare pentru a formata dimensiunea fișierelor
function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const ITEMS_PER_PAGE = 12;

function MediaPage() {
  const { toast } = useToast();
  const [mediaFiles, setMediaFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Stări pentru upload
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  
  // Stare pentru vizualizare
  const [viewMode, setViewMode] = useState('list');
  
  // Stări pentru ștergere
  const [selectedForDeletion, setSelectedForDeletion] = useState(new Set());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  
  // Stări pentru paginare
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchMediaFiles = useCallback(async (page) => {
    try {
      setLoading(true);
      const response = await apiClient.get('/media/', {
        params: { skip: (page - 1) * ITEMS_PER_PAGE, limit: ITEMS_PER_PAGE }
      });
      setMediaFiles(response.data.items);
      setTotalItems(response.data.total);
      setError(null);
    } catch (err) {
      setError('Nu s-au putut încărca fișierele media.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMediaFiles(currentPage);
  }, [currentPage, fetchMediaFiles]);

  const handlePageChange = (newPage) => {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    if (newPage > 0 && newPage <= totalPages) {
        setCurrentPage(newPage);
    }
  };

  const handleFileChange = (event) => {
    if (event.target.files) {
      setSelectedFiles(prevFiles => [...prevFiles, ...Array.from(event.target.files)]);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    const filesToUpload = [...selectedFiles];
    setSelectedFiles([]);
    for (const file of filesToUpload) {
      const formData = new FormData();
      formData.append('files', file);
      try {
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
        await apiClient.post('/media/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(prev => ({ ...prev, [file.name]: percentCompleted }));
          },
        });
      } catch (err) { toast({ variant: "destructive", title: "Eroare la Upload", description: `Fișierul ${file.name} nu a putut fi încărcat.`}); console.error(err); }
    }
    setUploadProgress({});
    if (currentPage !== 1) {
        setCurrentPage(1);
    } else {
        await fetchMediaFiles(1);
    }
  };
  
  const handleDeleteClick = (fileId, fileName) => { setItemToDelete({ type: 'single', id: fileId, name: fileName }); setIsDeleteDialogOpen(true); };
  const handleBulkDeleteClick = () => { setItemToDelete({ type: 'bulk', count: selectedForDeletion.size }); setIsDeleteDialogOpen(true); };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      if (itemToDelete.type === 'single') {
        await apiClient.delete(`/media/${itemToDelete.id}`);
        toast({ title: "Succes", description: `Fișierul "${itemToDelete.name}" a fost șters.` });
      } else if (itemToDelete.type === 'bulk') {
        const idsToDelete = Array.from(selectedForDeletion);
        await apiClient.post('/media/bulk-delete', { ids: idsToDelete });
        setSelectedForDeletion(new Set());
        toast({ title: "Succes", description: `${itemToDelete.count} fișiere au fost șterse.` });
      }
      
      const remainingItems = totalItems - (itemToDelete.type === 'bulk' ? itemToDelete.count : 1);
      const newTotalPages = Math.ceil(remainingItems / ITEMS_PER_PAGE);
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      } else {
        await fetchMediaFiles(currentPage);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'A apărut o eroare la ștergere.';
      toast({ variant: "destructive", title: "Eroare la Ștergere", description: errorMessage });
      console.error(err);
    } finally { setIsDeleteDialogOpen(false); setItemToDelete(null); }
  };

  const handleSelectionChange = (fileId) => { setSelectedForDeletion(prevSelected => { const newSelected = new Set(prevSelected); if (newSelected.has(fileId)) { newSelected.delete(fileId); } else { newSelected.add(fileId); } return newSelected; }); };
  const handleSelectAll = (event) => { if (event.target.checked) { setSelectedForDeletion(new Set(mediaFiles.map(file => file.id))); } else { setSelectedForDeletion(new Set()); } };
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      setSelectedFiles(prevFiles => [...prevFiles, ...Array.from(e.dataTransfer.files)]);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-200">Management Fișiere Media</h1>
        <div className="flex items-center space-x-4">
          {selectedForDeletion.size > 0 && (<Button variant="destructive" onClick={handleBulkDeleteClick}>Șterge ({selectedForDeletion.size})</Button>)}
          <div className="flex items-center space-x-2 p-1 bg-gray-200 dark:bg-slate-800 rounded-lg">
            <button onClick={() => setViewMode('grid')} className={`px-3 py-1 text-sm rounded-md ${viewMode === 'grid' ? 'bg-white dark:bg-slate-950 shadow' : 'hover:bg-gray-300 dark:hover:bg-slate-700'}`}>Grilă</button>
            <button onClick={() => setViewMode('list')} className={`px-3 py-1 text-sm rounded-md ${viewMode === 'list' ? 'bg-white dark:bg-slate-950 shadow' : 'hover:bg-gray-300 dark:hover:bg-slate-700'}`}>Listă</button>
          </div>
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-white dark:bg-slate-900 rounded-lg shadow">
        <h2 className="text-xl font-semibold">Adaugă Fișiere Noi</h2>
        <label htmlFor="file-input" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`mt-4 flex justify-center w-full h-32 px-6 pt-5 pb-6 border-2 ${isDragging ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300'} border-dashed rounded-md cursor-pointer`}><div className="space-y-1 text-center"><svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg><div className="flex text-sm text-gray-600 dark:text-slate-400"><p className="pl-1">Trage fișierele aici sau apasă pentru a le selecta</p></div></div><input id="file-input" name="file-input" type="file" multiple onChange={handleFileChange} className="sr-only" /></label>
        {selectedFiles.length > 0 && (<div className="mt-4"><h3 className="text-md font-medium">Fișiere în așteptare:</h3><ul className="mt-2 space-y-2">{selectedFiles.map((file, index) => (<li key={index} className="text-sm text-slate-700 dark:text-slate-300">{file.name} ({formatBytes(file.size)})</li>))}</ul><Button onClick={handleUpload} className="mt-4">Încarcă Toate</Button></div>)}
        {Object.keys(uploadProgress).length > 0 && (<div className="mt-4 space-y-2"><h3 className="text-md font-medium">Progres încărcare:</h3>{Object.entries(uploadProgress).map(([name, progress]) => (<div key={name}><span className="text-sm">{name}</span><div className="w-full bg-gray-200 rounded-full h-2.5"><div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div></div></div>))}</div>)}
      </div>

      <div className="mt-6">
        {loading ? <p>Se încarcă fișierele...</p> : error ? <p className="text-red-500">{error}</p> :
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-6">
              {mediaFiles.map((file) => {
                  const imageUrl = file.thumbnail_path ? `https://display.regio-cloud.ro${file.thumbnail_path}` : `https://display.regio-cloud.ro/media/serve/${file.id}`;
                  const isSelected = selectedForDeletion.has(file.id);
                  return (
                    <div key={file.id} onClick={() => handleSelectionChange(file.id)} className={`relative cursor-pointer border-4 ${isSelected ? 'border-indigo-500' : 'border-transparent'} rounded-lg overflow-hidden shadow-lg group bg-white dark:bg-slate-900`}>
                      <img src={imageUrl} alt={file.filename} className="w-full h-32 object-cover bg-gray-200 pointer-events-none" />
                      <div className="p-2"><p className="text-sm font-semibold truncate" title={file.filename}>{file.filename}</p></div>
                      <div className={`absolute top-2 left-2 w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-white' : 'bg-white bg-opacity-50 border-gray-400'}`}>
                        {isSelected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                      </div>
                      <Button variant="destructive" size="icon" onClick={(e) => { e.stopPropagation(); handleDeleteClick(file.id, file.filename); }} className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">X</Button>
                    </div>
                  );
              })}
            </div>
          ) : (
            <div className="mt-6 bg-white dark:bg-slate-900 shadow rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
                <thead className="bg-gray-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-4 py-3 w-12"><input type="checkbox" onChange={handleSelectAll} checked={mediaFiles.length > 0 && selectedForDeletion.size === mediaFiles.length}/></th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider w-20">Preview</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Nume Fișier</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Mărime</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Durată</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Acțiuni</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
                  {mediaFiles.map(file => {
                    const imageUrl = file.thumbnail_path ? `https://display.regio-cloud.ro${file.thumbnail_path}` : `https://display.regio-cloud.ro/media/serve/${file.id}`;
                    return (
                      <tr key={file.id} className={selectedForDeletion.has(file.id) ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}>
                        <td className="px-4 py-2"><input type="checkbox" checked={selectedForDeletion.has(file.id)} onChange={() => handleSelectionChange(file.id)} /></td>
                        <td className="px-4 py-2"><img src={imageUrl} alt={file.filename} className="w-16 h-12 object-cover rounded bg-gray-200"/></td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-slate-200">{file.filename}</td>
                        <td className="px-4 py-2 text-sm text-gray-500 dark:text-slate-400">{formatBytes(file.size)}</td>
                        <td className="px-4 py-2 text-sm text-gray-500 dark:text-slate-400">{file.duration ? `${Math.round(file.duration)}s` : '-'}</td>
                        <td className="px-4 py-2 text-sm"><Button variant="destructive" size="sm" onClick={() => handleDeleteClick(file.id, file.filename)}>Șterge</Button></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {(mediaFiles.length === 0 && !loading) && ( <div className="col-span-full text-center text-gray-500 mt-6">Nu există fișiere media încărcate.</div>)}
        </>
        }
      </div>
      
      <Pagination
        currentPage={currentPage}
        totalItems={totalItems}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={handlePageChange}
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