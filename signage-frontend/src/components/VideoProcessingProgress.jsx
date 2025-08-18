// Cale fișier: src/components/VideoProcessingProgress.jsx

import React, { useEffect, useState } from 'react';
import { Progress } from './ui/progress';
import { useAuth } from '../contexts/AuthContext';

const VideoProcessingProgress = ({ mediaFile, onProcessingComplete }) => {
  const [progress, setProgress] = useState(mediaFile?.processing_progress || 0);
  const [eta, setEta] = useState(mediaFile?.processing_eta);
  const [speed, setSpeed] = useState(mediaFile?.processing_speed);
  const [processingStatus, setProcessingStatus] = useState(mediaFile?.processing_status);
  const [ws, setWs] = useState(null);
  const { user } = useAuth();

  // Formatare timp ETA
  const formatETA = (seconds) => {
    if (!seconds || seconds <= 0) return null;
    
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  };

  // Configurare WebSocket pentru progress updates
  useEffect(() => {
    if (!user?.id || processingStatus === 'COMPLETED' || processingStatus === 'FAILED') {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/media/progress/${user.id}`;
    
    console.log('Conectez la WebSocket pentru progress updates:', wsUrl);
    
    const websocket = new WebSocket(wsUrl);
    
    websocket.onopen = () => {
      console.log('WebSocket conectat pentru progress updates');
      setWs(websocket);
    };
    
    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'media_progress' && message.data.id === mediaFile.id) {
          const data = message.data;
          
          setProgress(data.processing_progress);
          setEta(data.processing_eta);
          setSpeed(data.processing_speed);
          setProcessingStatus(data.processing_status);
          
          console.log(`Progress update pentru ${data.filename}: ${data.processing_progress}%`);
          
          // Notifică componenta părinte când procesarea e completă
          if (data.processing_status === 'COMPLETED' || data.processing_status === 'FAILED') {
            if (onProcessingComplete) {
              onProcessingComplete(data);
            }
          }
        }
      } catch (error) {
        console.error('Eroare la parsarea mesajului WebSocket:', error);
      }
    };
    
    websocket.onclose = () => {
      console.log('WebSocket închis');
      setWs(null);
    };
    
    websocket.onerror = (error) => {
      console.error('Eroare WebSocket:', error);
    };
    
    return () => {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.close();
      }
    };
  }, [user?.id, mediaFile.id, processingStatus, onProcessingComplete]);

  // Cleanup WebSocket când componenta se demontează
  useEffect(() => {
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [ws]);

  if (processingStatus === 'COMPLETED') {
    return (
      <div className="text-center py-2">
        <div className="text-sm text-green-600 dark:text-green-400 font-medium">
          ✅ Procesare completă
        </div>
      </div>
    );
  }

  if (processingStatus === 'FAILED') {
    return (
      <div className="text-center py-2">
        <div className="text-sm text-red-600 dark:text-red-400 font-medium">
          ❌ Procesare eșuată
        </div>
      </div>
    );
  }

  if (processingStatus === 'PENDING') {
    return (
      <div className="text-center py-2">
        <div className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
          ⏳ În așteptare...
        </div>
      </div>
    );
  }

  // Status PROCESSING
  return (
    <div className="w-full space-y-2">
      {/* Progress Bar */}
      <Progress value={progress} className="h-2" />
      
      {/* Progress Info */}
      <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
        <span className="font-medium">
          Procesare: {progress.toFixed(1)}%
        </span>
        
        <div className="flex items-center space-x-3">
          {speed && (
            <span className="text-blue-600 dark:text-blue-400">
              {speed}
            </span>
          )}
          
          {eta && (
            <span className="text-orange-600 dark:text-orange-400">
              ~{formatETA(eta)}
            </span>
          )}
        </div>
      </div>
      
      {/* Processing Animation */}
      <div className="flex justify-center">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
      </div>
    </div>
  );
};

export default VideoProcessingProgress;