// Componenta ScreenIcon reutilizabilă pentru afișarea rotației ecranelor
// Extrasă din EditScreenPage pentru reutilizare în ScreensPage

const ScreenIcon = ({ rotation, size = 24, className = "" }) => {
  // Determinăm orientarea reală a ecranului bazat pe rotație
  const isLandscape = rotation === 0 || rotation === 180;
  
  // Calculăm dimensiunile pentru orientarea corectă
  let width, height;
  if (isLandscape) {
    width = size;
    height = size * 0.7;
  } else { // portrait
    width = size * 0.7;
    height = size;
  }
  
  return (
    <div 
      className={`relative flex items-center justify-center ${className}`} 
      style={{ width: size, height: size }}
      title={`Rotație ${rotation}° - ${isLandscape ? 'Landscape' : 'Portrait'}`}
    >
      <div 
        className="border-2 border-current rounded-md bg-current/10 relative transition-all duration-200"
        style={{ 
          width: width, 
          height: height
        }}
      >
        {/* Indicator pentru bottom (unde este jos-ul ecranului) - poziționat diferit bazat pe rotație */}
        {rotation === 0 && (
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 bg-current rounded-full"></div>
        )}
        {rotation === 90 && (
          <div className="absolute bottom-0 right-0 transform translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 bg-current rounded-full"></div>
        )}
        {rotation === 180 && (
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-current rounded-full"></div>
        )}
        {rotation === 270 && (
          <div className="absolute bottom-0 left-0 transform -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 bg-current rounded-full"></div>
        )}
        
        {/* Stand pentru ecran (doar pentru 0° și 180°) - mai mic pentru versiunea tabel */}
        {rotation === 0 && size > 30 && (
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 translate-y-full">
            <div className="w-2 h-0.5 bg-current/60 rounded-sm"></div>
          </div>
        )}
        {rotation === 180 && size > 30 && (
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 -translate-y-full">
            <div className="w-2 h-0.5 bg-current/60 rounded-sm"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScreenIcon;