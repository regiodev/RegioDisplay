// Cale fișier: src/components/PlaylistPreviewModal.jsx

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, StepBack, StepForward, X, ImageOff } from 'lucide-react';

function PlaylistPreviewModal({ playlistData, isOpen, onClose }) {
  const [imageItems, setImageItems] = useState([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const timerRef = useRef(null);
  const progressIntervalRef = useRef(null);

  const clearAllTimers = useCallback(() => {
    clearTimeout(timerRef.current);
    clearInterval(progressIntervalRef.current);
  }, []);

  useEffect(() => {
    if (isOpen && playlistData) {
      // --- CORECȚIE CHEIE: Folosim proprietatea corectă `type` în loc de `content_type` ---
      const images = (playlistData.items || []).filter(item => 
        item && item.media_file && (item.media_file.type || '').startsWith('image')
      );
      
      if (images.length > 0) {
        setImageItems(images);
        setCurrentItemIndex(0);
        setProgress(0);
        setIsPlaying(true);
        setError('');
      } else {
        setError('Acest playlist nu conține imagini pentru a putea fi previzualizat.');
      }
    } else {
      clearAllTimers();
      setImageItems([]);
    }
  }, [playlistData, isOpen, clearAllTimers]);

  const currentItem = imageItems[currentItemIndex];

  const handleNext = useCallback(() => {
    if (imageItems.length < 2) return;
    setProgress(0);
    setCurrentItemIndex(prev => (prev + 1) % imageItems.length);
  }, [imageItems.length]);

  useEffect(() => {
    clearAllTimers();
    if (!currentItem || !isPlaying) return;
    
    const durationMs = currentItem.duration * 1000;
    let startTime = Date.now();
    
    timerRef.current = setTimeout(handleNext, durationMs);
    progressIntervalRef.current = setInterval(() => {
      setProgress(Math.min(100, ((Date.now() - startTime) / durationMs) * 100));
    }, 100);
    
    return clearAllTimers;
  }, [currentItemIndex, isPlaying, currentItem, handleNext, clearAllTimers]);
  
  const handlePrev = () => {
    if (imageItems.length < 2) return;
    setProgress(0);
    setCurrentItemIndex(prev => (prev - 1 + imageItems.length) % imageItems.length);
  };
  
  const handleTogglePlay = () => setIsPlaying(!isPlaying);
  const handleClose = () => { setIsPlaying(false); clearAllTimers(); onClose(); };
  
  const mediaUrl = currentItem?.media_file?.id ? `https://display.regio-cloud.ro/api/media/serve/${currentItem.media_file.id}` : '';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl w-full h-full sm:h-auto sm:max-h-[90vh] flex flex-col p-0 bg-black text-white border-0">
        <div className="flex-grow flex items-center justify-center relative bg-black aspect-video">
          {error && (
            <div className="absolute flex flex-col items-center text-center p-4 text-gray-400">
                <ImageOff className="h-10 w-10 mb-2"/>
                <p className="font-semibold">{error}</p>
            </div>
          )}
          
          {currentItem && mediaUrl && (
             <img src={mediaUrl} alt={currentItem.media_file.filename} className="max-w-full max-h-full object-contain" />
          )}
        </div>

        <div className="bg-gray-900 bg-opacity-80 p-4 space-y-3">
          {currentItem && (
            <div className="flex justify-between items-center text-sm">
              <p className="truncate">{currentItemIndex + 1} / {imageItems.length}: {currentItem.media_file.filename}</p>
              <p>{currentItem.duration}s</p>
            </div>
          )}
          {isPlaying && currentItem && <Progress value={progress} className="h-1 [&>div]:bg-white" />}
          <div className="flex justify-center items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={handlePrev} className="hover:bg-white/20" disabled={!currentItem}><StepBack /></Button>
            <Button variant="ghost" size="icon" onClick={handleTogglePlay} className="hover:bg-white/20" disabled={!currentItem}>
              {isPlaying ? <Pause /> : <Play />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleNext} className="hover:bg-white/20" disabled={!currentItem}><StepForward /></Button>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={handleClose} className="absolute top-2 right-2 hover:bg-white/20 rounded-full z-10">
          <X />
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export default PlaylistPreviewModal;