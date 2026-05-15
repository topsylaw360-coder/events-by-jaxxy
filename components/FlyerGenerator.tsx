import React, { useRef, useState } from 'react';
import { Download, Palette, Upload, Loader2, Sparkles } from 'lucide-react';
import { generateFlyerDesigns } from '../services/geminiService';
import DOMPurify from 'dompurify';
import html2canvas from 'html2canvas';

interface FlyerGeneratorProps {
  initialTitle: string;
  initialDate: string;
  initialLocation: string;
}

type FlyerDesign = { id: string, name: string, html: string, width?: number, height?: number };

const FlyerGenerator: React.FC<FlyerGeneratorProps> = ({ initialTitle, initialDate, initialLocation }) => {
  const [title, setTitle] = useState(initialTitle);
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState('18:00');
  const [location, setLocation] = useState(initialLocation);
  const [theme, setTheme] = useState('Modern Minimal');
  const [extraPrompt, setExtraPrompt] = useState('');
  
  type FlyerDimension = 'post' | 'portrait' | 'story';
  const [dimension, setDimension] = useState<FlyerDimension>('story');

  const dimensionConfigs = {
      post: { width: 1080, height: 1080, label: 'Instagram Post (Square)' },
      portrait: { width: 1080, height: 1350, label: 'Instagram Portrait' },
      story: { width: 1080, height: 1920, label: 'Instagram Story' },
  };

  const [uploadedImageSrc, setUploadedImageSrc] = useState<string | null>(null);
  
  const [designs, setDesigns] = useState<FlyerDesign[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(null);

  const flyerRefs = useRef<{[key: string]: HTMLDivElement | null}>({});

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImageSrc(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setDesigns([]);
    setSelectedDesignId(null);
    try {
        const config = dimensionConfigs[dimension];
        const results = await generateFlyerDesigns({
            eventName: title,
            date,
            time,
            location,
            theme,
            hasCustomImage: !!uploadedImageSrc,
            extraPrompt,
            dimensionConfig: {
                width: config.width,
                height: config.height
            }
        });
        const mappedResults = results.map(r => ({ ...r, width: config.width, height: config.height }));
        setDesigns(mappedResults);
        if (mappedResults.length > 0) setSelectedDesignId(mappedResults[0].id);
    } catch (e: any) {
        console.error("Flyer design error:", e);
        alert(`Failed to generate flyers. ${e?.message || 'Please try again.'}`);
    } finally {
        setIsGenerating(false);
    }
  };

  const handleDownload = async (designId: string) => {
      const element = flyerRefs.current[designId];
      if (!element) return;
      
      try {
          const canvas = await html2canvas(element, { scale: 2, useCORS: true });
          const image = canvas.toDataURL("image/png");
          const link = document.createElement("a");
          link.href = image;
          link.download = `${(title || "").replace(/\s+/g, '_')}_Flyer.png`;
          link.click();
      } catch (e) {
          console.error("Failed to download image", e);
          alert("Failed to download the flyer image.");
      }
  };

  const processHtml = (html: string | undefined) => {
      let processed = html || "";
      if (uploadedImageSrc) {
          processed = processed.replace(/CUSTOM_IMAGE_PLACEHOLDER/g, uploadedImageSrc);
      }
      return DOMPurify.sanitize(processed, {
          ADD_ATTR: ['style'],
          ADD_TAGS: ['style'],
          ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
      });
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            <div className="space-y-6 xl:col-span-4 border-r border-slate-100 pr-0 xl:pr-6">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-emerald-600" />
                    AI Flyer Designer
                </h2>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Platform Dimension</label>
                        <div className="grid grid-cols-1 gap-2 mb-4">
                            {(Object.keys(dimensionConfigs) as FlyerDimension[]).map(d => (
                                <button
                                    key={d}
                                    onClick={() => setDimension(d)}
                                    className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all ${dimension === d ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-1 ring-emerald-500' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                    {dimensionConfigs[d].label}
                                </button>
                            ))}
                        </div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Design Theme/Vibe</label>
                        <div className="grid grid-cols-2 gap-2">
                            {['Modern Minimal', 'Neon Cyberpunk', 'Elegant Floral', 'Bold Typo', 'Vintage Retro', 'Luxury Gold'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => setTheme(s)}
                                    className={`px-2 py-2 text-xs font-medium rounded-lg border transition-all ${theme === s ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-1 ring-emerald-500' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Custom Image (Optional)</label>
                         <label className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 bg-white text-sm text-slate-600">
                             <Upload className="h-4 w-4" />
                             {uploadedImageSrc ? "Change Image" : "Upload Photo"}
                             <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                         </label>
                         {uploadedImageSrc && <p className="text-xs text-green-600 mt-1 truncate">Image loaded</p>}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Event Name</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 outline-none" />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Time</label>
                            <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 outline-none" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Location</label>
                        <input type="text" value={location} onChange={e => setLocation(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 outline-none" />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Any specific instructions?</label>
                        <input type="text" placeholder="e.g. Make it dark, use lots of gold..." value={extraPrompt} onChange={e => setExtraPrompt(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 outline-none" />
                    </div>

                    <button 
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                        {isGenerating ? "Designing Flyers..." : "Generate AI Designs"}
                    </button>
                </div>
            </div>

            <div className="xl:col-span-8 bg-slate-100 rounded-2xl p-6 border border-slate-200 flex flex-col items-center overflow-x-auto">
                {isGenerating && (
                    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-slate-500">
                        <Loader2 className="h-12 w-12 animate-spin mb-4 text-emerald-600" />
                        <p className="font-medium animate-pulse">Our AI is crafting your layout...</p>
                    </div>
                )}
                
                {!isGenerating && designs.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-slate-400">
                        <Palette className="h-16 w-16 mb-4 opacity-50" />
                        <p className="font-medium">Fill out the details on the left and click Generate.</p>
                    </div>
                )}

                {!isGenerating && designs.length > 0 && (
                    <div className="w-full">
                        <div className="flex gap-4 mb-8 justify-center overflow-x-auto p-2">
                             {(designs || []).map((design, i) => (
                                 <button
                                     key={design.id}
                                     onClick={() => setSelectedDesignId(design.id)}
                                     className={`px-6 py-3 rounded-xl font-bold transition-all shadow-sm whitespace-nowrap ${selectedDesignId === design.id ? 'bg-emerald-600 text-white shadow-emerald-500/20' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
                                 >
                                     Option {i + 1}: {design.name}
                                 </button>
                             ))}
                        </div>

                        {(designs || []).map(design => {
                            const w = design.width || 800;
                            const h = design.height || 1200;
                            const previewScale = w > 600 ? 500 / w : 1; 
                            const displayW = w * previewScale;
                            const displayH = h * previewScale;

                            return (
                                <div key={design.id} className={`flex flex-col items-center transition-all w-full max-w-full ${selectedDesignId === design.id ? 'block' : 'hidden'}`}>
                                    <button 
                                        onClick={() => handleDownload(design.id)}
                                        className="mb-8 px-8 py-3 bg-white border-2 border-slate-900 text-slate-900 font-bold rounded-xl shadow-lg hover:bg-slate-50 transition flex items-center justify-center gap-2"
                                    >
                                        <Download className="h-5 w-5" /> Download Design
                                    </button>
                                    
                                    <div className="relative shadow-2xl ring-1 ring-slate-900/10 overflow-hidden" style={{ width: `${displayW}px`, height: `${displayH}px`, backgroundColor: '#e2e8f0' }}>
                                        <div style={{ transform: `scale(${previewScale})`, transformOrigin: 'top left', width: `${w}px`, height: `${h}px` }}>
                                            <div 
                                                ref={el => flyerRefs.current[design.id] = el!}
                                                style={{width: `${w}px`, height: `${h}px`, backgroundColor: 'white'}}
                                                dangerouslySetInnerHTML={{ __html: processHtml(design.html) }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default FlyerGenerator;
