import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { X, Camera, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { EventPlan, Guest } from '../types';

interface QRScannerProps {
  event: EventPlan;
  onClose: () => void;
  onScanSuccess: (guest: Guest) => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ event, onClose, onScanSuccess }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [scanError, setScanError] = useState('');
  const [scanResult, setScanResult] = useState<Guest | null>(null);

  // --- Camera Logic ---
  useEffect(() => {
    let animationFrameId: number;

    const startCamera = async () => {
      if (!isScanning) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true"); // required to tell iOS safari we don't want fullscreen
          videoRef.current.play();
          requestAnimationFrame(tick);
        }
      } catch (err) {
        console.error("Error accessing camera", err);
        setScanError("Camera access denied or unavailable. Try uploading an image.");
      }
    };

    const tick = () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code) {
            handleCodeFound(code.data);
          } else {
             if(isScanning) animationFrameId = requestAnimationFrame(tick);
          }
        }
      } else {
         if(isScanning) animationFrameId = requestAnimationFrame(tick);
      }
    };

    startCamera();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, [isScanning]);

  // --- File Upload Logic ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          
          if (code) {
            handleCodeFound(code.data);
          } else {
            setScanError("No QR code found in this image.");
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleCodeFound = (data: string) => {
    setIsScanning(false);
    
    // Parse the data. 
    // We use a regex to extract the "Code: XXX" part, ignoring case and whitespace.
    // This allows it to work with our new "JAXY TICKET" header format.
    const codeMatch = data.match(/Code:\s*([A-Za-z0-9-]+)/i);
    const extractedCode = codeMatch ? codeMatch[1].trim() : null;

    let foundGuest: Guest | undefined;

    if (extractedCode) {
        foundGuest = event.guests.find(g => g.accessCode.toLowerCase() === extractedCode.toLowerCase());
    } else {
        // Fallback: Check if the whole string matches a code (legacy support)
        foundGuest = event.guests.find(g => g.accessCode.toLowerCase() === data.trim().toLowerCase());
    }

    if (foundGuest) {
        setScanResult(foundGuest);
    } else {
        setScanError("QR Code read successfully, but guest not found in this event.");
    }
  };

  const handleConfirmArrival = () => {
      if(scanResult) {
          onScanSuccess(scanResult);
          onClose();
      }
  };

  const resetScan = () => {
      setIsScanning(true);
      setScanResult(null);
      setScanError('');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200 pb-safe">
        
        <div className="flex justify-between items-center p-4 border-b border-slate-100">
            <h3 className="font-bold text-lg flex items-center gap-2">
                <Camera className="h-5 w-5 text-emerald-600" /> 
                Check-in Scanner
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6">
            {!scanResult ? (
                <>
                    {/* Viewfinder */}
                    <div className="relative aspect-square bg-black rounded-2xl overflow-hidden mb-6">
                        {isScanning ? (
                             <>
                                <video ref={videoRef} playsInline autoPlay muted className="absolute inset-0 w-full h-full object-cover opacity-80" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-48 h-48 border-2 border-white/50 rounded-lg relative">
                                        <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-500 -mt-1 -ml-1"></div>
                                        <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-500 -mt-1 -mr-1"></div>
                                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-500 -mb-1 -ml-1"></div>
                                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-500 -mb-1 -mr-1"></div>
                                    </div>
                                </div>
                                <canvas ref={canvasRef} className="hidden" />
                             </>
                        ) : (
                            <div className="flex items-center justify-center h-full text-white">Processing...</div>
                        )}
                    </div>
                    
                    {scanError && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-4 flex items-start gap-2">
                            <AlertCircle className="h-5 w-5 flex-shrink-0" />
                            {scanError}
                        </div>
                    )}

                    <div className="text-center">
                        <p className="text-sm text-slate-500 mb-4">Camera broken? Upload a QR screenshot.</p>
                        <label className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 px-6 py-3 rounded-xl font-semibold cursor-pointer hover:bg-slate-200 transition w-full justify-center">
                            <Upload className="h-4 w-4" />
                            Upload QR Image
                            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                        </label>
                    </div>
                </>
            ) : (
                <div className="text-center py-4">
                    <div className="h-20 w-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="h-10 w-10" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">{scanResult.name}</h2>
                    <p className="text-slate-500 font-mono mb-6">{scanResult.accessCode}</p>
                    
                    <div className="bg-slate-50 rounded-xl p-4 text-left space-y-2 mb-6 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Status:</span>
                            <span className="font-semibold text-slate-800">{scanResult.status}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Plus One:</span>
                            <span className="font-semibold text-slate-800">{scanResult.plusOneAllowed ? (scanResult.plusOneName || 'Allowed') : 'No'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Meal:</span>
                            <span className="font-semibold text-slate-800">{scanResult.mealChoice || '-'}</span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={resetScan} className="flex-1 py-3 text-slate-600 font-semibold hover:bg-slate-50 rounded-xl">
                            Scan Next
                        </button>
                        <button onClick={handleConfirmArrival} className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200">
                            Confirm Arrival
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default QRScanner;