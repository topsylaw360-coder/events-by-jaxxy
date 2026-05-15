import React, { useState, useRef, useEffect } from 'react';
import { 
  Maximize, Move, RotateCw, Trash2, Users, Plus, 
  Minus, ZoomIn, ZoomOut, Save, LayoutGrid, Armchair, 
  Music, Coffee, DoorOpen, Flower, Download, Settings, Ticket, CheckCircle
} from 'lucide-react';
import jsPDF from 'jspdf';
import { EventPlan, FloorElement, FloorElementType, Guest } from '../types';

interface FloorPlanEditorProps {
  event: EventPlan;
  onUpdateEvent: (updatedEvent: EventPlan) => void;
}

const ELEMENT_DEFAULTS: Record<FloorElementType, { w: number, h: number, cap?: number, label: string }> = {
  'table-round': { w: 80, h: 80, cap: 8, label: 'Round Table' },
  'table-rect': { w: 120, h: 60, cap: 8, label: 'Rect Table' },
  'theatre-row': { w: 140, h: 30, cap: 5, label: 'Theatre Row' },
  'stage': { w: 200, h: 100, label: 'Stage' },
  'bar': { w: 150, h: 40, label: 'Bar' },
  'dancefloor': { w: 150, h: 150, label: 'Dance Floor' },
  'wall': { w: 200, h: 10, label: 'Wall' },
  'entrance': { w: 60, h: 60, label: 'Entrance' },
  'plant': { w: 40, h: 40, label: 'Plant' }
};

const FloorPlanEditor: React.FC<FloorPlanEditorProps> = ({ event, onUpdateEvent }) => {
  const floorW = Math.max(event.floorDimensions?.width || 50, 10);
  const floorL = Math.max(event.floorDimensions?.length || 40, 10);
  const CANVAS_WIDTH = floorW * 20;
  const CANVAS_HEIGHT = floorL * 20;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Local state for elements to allow smooth dragging before syncing up
  const [elements, setElements] = useState<FloorElement[]>(event.floorElements || []);

  // Sync from props if external update occurs
  useEffect(() => {
      setElements(event.floorElements || []);
  }, [event.floorElements]);

  const handleSave = () => {
    onUpdateEvent({ ...event, floorElements: elements });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  // Keyboard Delete Support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
            removeElement(selectedId, false); 
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, elements]);

  // --- Element Management ---

  const addElement = (type: FloorElementType) => {
    const defaults = ELEMENT_DEFAULTS[type];
    
    // Spawn in center of canvas with slight jitter
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;
    const jitter = (Math.random() - 0.5) * 50;

    const newElement: FloorElement = {
      id: `el-${Date.now()}`,
      type,
      label: defaults.label,
      x: centerX - (defaults.w / 2) + jitter, 
      y: centerY - (defaults.h / 2) + jitter,
      width: defaults.w,
      height: defaults.h,
      rotation: 0,
      capacity: defaults.cap,
      guestIds: []
    };
    const updated = [...elements, newElement];
    setElements(updated);
    setSelectedId(newElement.id);
    onUpdateEvent({ ...event, floorElements: updated });
  };

  const removeElement = (id: string, confirmDelete = true) => {
    if(!confirmDelete || confirm('Delete this element?')) {
        const updated = elements.filter(e => e.id !== id);
        setElements(updated);
        setSelectedId(null);
        onUpdateEvent({ ...event, floorElements: updated });
    }
  };

  const updateElement = (id: string, updates: Partial<FloorElement>) => {
    const updated = (elements || []).map(e => e.id === id ? { ...e, ...updates } : e);
    setElements(updated);
    onUpdateEvent({ ...event, floorElements: updated });
  };

  const updateRoomDimensions = (updates: Partial<{ width: number; length: number; shape: EventPlan['floorDimensions']['shape'] }>) => {
      const currentDims = event.floorDimensions || { width: 50, length: 40, shape: 'rectangle' };
      const newDims = { ...currentDims, ...updates };
      
      // Keep width and length synced for square and round shapes
      if (newDims.shape === 'square' || newDims.shape === 'round') {
          if (updates.width !== undefined) newDims.length = updates.width;
          else if (updates.length !== undefined) newDims.width = updates.length;
      }
      
      onUpdateEvent({
          ...event,
          floorDimensions: newDims
      });
  };

  // --- PDF Export ---
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3' });
    const offsetX = 50;
    const offsetY = 80;

    // Header
    doc.setFillColor(241, 245, 249);
    doc.rect(0, 0, 1200, 900, 'F');
    doc.setFontSize(24);
    doc.setTextColor(15, 23, 42);
    doc.text(event.title + " - Floor Plan", 50, 50);
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139);
    doc.text(`Total Guests: ${event.guests.length} | Seating Groups: ${elements.filter(e => e.type.startsWith('table') || e.type === 'theatre-row').length}`, 50, 70);

    // Draw Elements
    elements.forEach(el => {
        const x = el.x + offsetX;
        const y = el.y + offsetY;
        
        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(1);
        doc.setFillColor(255, 255, 255);

        if (el.type === 'table-round') {
             const r = el.width / 2;
             doc.circle(x + r, y + (el.height/2), r, 'FD');
        } else if (el.type === 'theatre-row') {
             // For PDF, simple rect representation of row
             doc.setFillColor(241, 245, 249);
             doc.roundedRect(x, y, el.width, el.height, 5, 5, 'FD');
        } else if (['table-rect', 'bar', 'stage', 'dancefloor'].includes(el.type)) {
             if (el.type === 'stage') doc.setFillColor(30, 41, 59);
             if (el.type === 'bar') doc.setFillColor(120, 53, 15);
             if (el.type === 'dancefloor') doc.setFillColor(226, 232, 240);
             doc.rect(x, y, el.width, el.height, 'FD');
        } else if (el.type === 'entrance') {
             (doc as any).setLineDashPattern([5, 5], 0);
             doc.rect(x, y, el.width, el.height, 'FD');
             (doc as any).setLineDashPattern([], 0);
        } else {
             doc.setFillColor(51, 65, 85);
             doc.rect(x, y, el.width, el.height, 'F');
        }

        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        if(['stage', 'bar', 'wall'].includes(el.type)) doc.setTextColor(255, 255, 255);
        
        const label = el.label;
        const textWidth = doc.getTextWidth(label);
        doc.text(label, x + (el.width/2) - (textWidth/2), y + (el.height/2) + 4);

        if (el.type.startsWith('table') || el.type === 'theatre-row') {
             doc.setFontSize(8);
             doc.setTextColor(100, 100, 100);
             const countText = `${el.guestIds.length}/${el.capacity}`;
             doc.text(countText, x + (el.width/2) - (doc.getTextWidth(countText)/2), y + (el.height/2) + 14);
             
             let nameY = y + el.height + 12;
             doc.setFontSize(7);
             el.guestIds.forEach(gid => {
                 const g = event.guests.find(gst => gst.id === gid);
                 if(g) {
                     doc.text(`• ${g.name}`, x, nameY);
                     nameY += 8;
                 }
             });
        }
    });

    doc.save(`${(event.title || "").replace(/\s+/g, '_')}_Seating_Plan.pdf`);
  };

  // --- Guest Assignment ---
  const assignGuest = (elementId: string, guestId: string) => {
    const cleanElements = (elements || []).map(e => ({
        ...e,
        guestIds: e.guestIds.filter(gid => gid !== guestId)
    }));
    const updated = cleanElements.map(e => 
        e.id === elementId ? { ...e, guestIds: [...e.guestIds, guestId] } : e
    );
    setElements(updated);
    onUpdateEvent({ ...event, floorElements: updated });
  };

  const unassignGuest = (elementId: string, guestId: string) => {
    const updated = (elements || []).map(e => 
        e.id === elementId ? { ...e, guestIds: e.guestIds.filter(gid => gid !== guestId) } : e
    );
    setElements(updated);
    onUpdateEvent({ ...event, floorElements: updated });
  };

  // --- Drag Logic ---
  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedId(id);
    setIsDragging(true);
    const element = elements.find(el => el.id === id);
    if (!element) return;
    setDragOffset({
      x: e.clientX / scale - element.x,
      y: e.clientY / scale - element.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedId) return;
    const x = (e.clientX / scale) - dragOffset.x;
    const y = (e.clientY / scale) - dragOffset.y;
    const element = elements.find(el => el.id === selectedId);
    if (!element) return;
    let snappedX = Math.round(x / 10) * 10;
    let snappedY = Math.round(y / 10) * 10;
    snappedX = Math.max(0, Math.min(snappedX, CANVAS_WIDTH - element.width));
    snappedY = Math.max(0, Math.min(snappedY, CANVAS_HEIGHT - element.height));
    setElements(prev => prev.map(el => 
      el.id === selectedId ? { ...el, x: snappedX, y: snappedY } : el
    ));
  };

  const handleMouseUp = () => {
    if(isDragging) {
        setIsDragging(false);
        // We auto-save on drag end, but we won't trigger the "Saved!" text to avoid spam
        onUpdateEvent({ ...event, floorElements: elements });
    }
  };

  // --- Rendering Helpers ---
  const selectedElement = elements.find(e => e.id === selectedId);
  const unassignedGuests = event.guests.filter(g => !elements.some(e => e.guestIds.includes(g.id)));

  const renderElementShape = (el: FloorElement) => {
     // ... (Existing render logic remains same, just ensuring correct copy/paste of container rendering)
     const isSelected = el.id === selectedId;
     const baseClasses = `absolute flex items-center justify-center text-xs text-center cursor-move transition-all select-none ${isSelected ? 'ring-2 ring-emerald-500 shadow-xl z-20 scale-105' : 'hover:ring-1 hover:ring-slate-300 shadow-md z-10'}`;
     const style: React.CSSProperties = {
         left: el.x,
         top: el.y,
         width: el.width,
         height: el.height,
         transform: `rotate(${el.rotation}deg)`,
     };

     const renderLabel = () => (
         <div className="flex flex-col items-center pointer-events-none z-10 relative">
            <span className="font-bold leading-tight">{el.label}</span>
            {(el.type.startsWith('table') || el.type === 'theatre-row') && (
                <span className={`mt-1 text-[9px] px-1.5 py-0.5 rounded-full font-mono ${el.guestIds.length >= (el.capacity || 0) ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {el.guestIds.length}/{el.capacity}
                </span>
            )}
         </div>
     );

     if (el.type === 'table-round') {
         return (
             <div style={style} className={`${baseClasses} rounded-full bg-white border-4 border-slate-200 text-slate-700`} onMouseDown={(e) => handleMouseDown(e, el.id)}>
                {renderLabel()}
                {Array.from({ length: el.capacity || 0 }).map((_, i) => {
                    const angle = (i * (360 / (el.capacity || 1))) * (Math.PI / 180);
                    return <div key={i} className={`absolute w-3 h-3 rounded-full border border-slate-300 ${i < el.guestIds.length ? 'bg-emerald-400' : 'bg-white'}`} style={{ left: '50%', top: '50%', marginLeft: -6, marginTop: -6, transform: `translate(${Math.cos(angle) * (el.width/2 + 8)}px, ${Math.sin(angle) * (el.height/2 + 8)}px)` }} />;
                })}
             </div>
         );
     }

     if (el.type === 'table-rect') {
         return (
             <div style={style} className={`${baseClasses} rounded bg-white border-2 border-slate-300 text-slate-700`} onMouseDown={(e) => handleMouseDown(e, el.id)}>
                {renderLabel()}
                <div className="absolute top-0 left-0 w-full h-full flex justify-between items-center px-1">
                     <div className="flex flex-col gap-1 -ml-4">
                        {Array.from({ length: Math.ceil((el.capacity||0)/2) }).map((_,i) => <div key={`l-${i}`} className={`w-2 h-2 rounded-full ${i < el.guestIds.length ? 'bg-emerald-400' : 'bg-slate-200'}`} />)}
                     </div>
                     <div className="flex flex-col gap-1 -mr-4">
                        {Array.from({ length: Math.floor((el.capacity||0)/2) }).map((_,i) => <div key={`r-${i}`} className={`w-2 h-2 rounded-full ${i + Math.ceil((el.capacity||0)/2) < el.guestIds.length ? 'bg-emerald-400' : 'bg-slate-200'}`} />)}
                     </div>
                </div>
             </div>
         );
     }

     if (el.type === 'theatre-row') {
         return (
             <div style={style} className={`${baseClasses} rounded-lg bg-slate-50 border border-slate-300 text-slate-700 flex-col justify-end pb-1`} onMouseDown={(e) => handleMouseDown(e, el.id)}>
                <div className="absolute top-1 w-full text-center">{renderLabel()}</div>
                <div className="flex justify-center gap-1 w-full px-1">
                     {Array.from({ length: el.capacity || 0 }).map((_, i) => (
                         <div key={i} className={`w-4 h-4 rounded-t-lg border border-slate-300 ${i < el.guestIds.length ? 'bg-emerald-400 border-emerald-500' : 'bg-white'}`}></div>
                     ))}
                </div>
             </div>
         );
     }

     if (el.type === 'stage') return <div style={style} className={`${baseClasses} bg-slate-800 text-white font-bold tracking-widest uppercase rounded-sm shadow-2xl`} onMouseDown={(e) => handleMouseDown(e, el.id)}>STAGE</div>;
     if (el.type === 'dancefloor') return <div style={style} className={`${baseClasses} bg-white opacity-90 border border-slate-300`} onMouseDown={(e) => handleMouseDown(e, el.id)}><div className="w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/checkered-pattern.png')]"></div><span className="absolute inset-0 flex items-center justify-center font-bold text-slate-400 tracking-widest">DANCE FLOOR</span></div>;
     if (el.type === 'bar') return <div style={style} className={`${baseClasses} bg-amber-900 text-amber-100 font-bold rounded-lg`} onMouseDown={(e) => handleMouseDown(e, el.id)}>BAR AREA</div>;
     if (el.type === 'plant') return <div style={style} className={`${baseClasses} bg-green-100/50 text-green-600 rounded-full border-2 border-dashed border-green-300`} onMouseDown={(e) => handleMouseDown(e, el.id)}><Flower className="h-6 w-6" /></div>;

     return <div style={style} className={`${baseClasses} ${el.type === 'wall' ? 'bg-slate-900' : 'bg-slate-200 border-2 border-slate-400'}`} onMouseDown={(e) => handleMouseDown(e, el.id)}>{el.type !== 'wall' && el.label}</div>;
  };

  return (
    <div className="flex flex-col h-[800px] bg-slate-100 border border-slate-200 rounded-3xl overflow-hidden shadow-sm relative">
      
      {/* Toolbar */}
      <div className="bg-white border-b border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4 z-30 shadow-sm">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
             <span className="text-xs font-bold text-slate-400 uppercase mr-2">Add:</span>
             <button onClick={() => addElement('table-round')} className="flex flex-col items-center gap-1 p-2 hover:bg-slate-50 rounded-lg text-slate-600 text-xs min-w-[60px] transition hover:-translate-y-0.5"><div className="h-6 w-6 rounded-full border-2 border-slate-400 bg-white"></div> Round</button>
             <button onClick={() => addElement('table-rect')} className="flex flex-col items-center gap-1 p-2 hover:bg-slate-50 rounded-lg text-slate-600 text-xs min-w-[60px] transition hover:-translate-y-0.5"><div className="h-4 w-8 border-2 border-slate-400 bg-white"></div> Rect</button>
             <button onClick={() => addElement('theatre-row')} className="flex flex-col items-center gap-1 p-2 hover:bg-slate-50 rounded-lg text-slate-600 text-xs min-w-[60px] transition hover:-translate-y-0.5"><Ticket className="h-6 w-6 text-purple-500" /> Theatre</button>
             <button onClick={() => addElement('stage')} className="flex flex-col items-center gap-1 p-2 hover:bg-slate-50 rounded-lg text-slate-600 text-xs min-w-[60px] transition hover:-translate-y-0.5"><LayoutGrid className="h-6 w-6 text-slate-700" /> Stage</button>
             <button onClick={() => addElement('dancefloor')} className="flex flex-col items-center gap-1 p-2 hover:bg-slate-50 rounded-lg text-slate-600 text-xs min-w-[60px] transition hover:-translate-y-0.5"><Music className="h-6 w-6 text-indigo-500" /> Dance</button>
             <button onClick={() => addElement('bar')} className="flex flex-col items-center gap-1 p-2 hover:bg-slate-50 rounded-lg text-slate-600 text-xs min-w-[60px] transition hover:-translate-y-0.5"><Coffee className="h-6 w-6 text-amber-700" /> Bar</button>
          </div>

          <div className="flex items-center gap-2">
              <button onClick={() => setShowRoomSettings(!showRoomSettings)} className={`p-2 rounded-full ${showRoomSettings ? 'bg-emerald-100 text-emerald-700' : 'hover:bg-slate-100 text-slate-500'}`} title="Room Settings"><Settings className="h-4 w-4"/></button>
              <div className="h-6 w-px bg-slate-300 mx-1"></div>
              <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><ZoomOut className="h-4 w-4"/></button>
              <span className="text-xs font-mono w-12 text-center">{Math.round(scale * 100)}%</span>
              <button onClick={() => setScale(s => Math.min(2, s + 0.1))} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><ZoomIn className="h-4 w-4"/></button>
              <div className="h-6 w-px bg-slate-300 mx-2"></div>
              <button onClick={handleExportPDF} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg hover:bg-slate-900 transition"><Download className="h-4 w-4" /> Export PDF</button>
              <button 
                  onClick={handleSave} 
                  className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-bold shadow-lg transition-all duration-300 ${isSaved ? 'bg-green-500 text-white shadow-green-200' : 'bg-emerald-600 text-white shadow-emerald-200 hover:bg-emerald-700'}`}
              >
                  {isSaved ? <CheckCircle className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                  {isSaved ? 'Saved!' : 'Save'}
              </button>
          </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
          
          {/* Room Settings Overlay */}
          {showRoomSettings && (
             <div className="absolute top-4 right-4 z-50 bg-white/95 backdrop-blur shadow-2xl border border-slate-200 p-4 rounded-xl w-64 animate-in fade-in zoom-in-95">
                 <div className="flex justify-between items-center mb-4">
                     <h4 className="font-bold text-slate-800">Room Configuration</h4>
                     <button onClick={() => setShowRoomSettings(false)}><Settings className="h-4 w-4 text-emerald-600"/></button>
                 </div>
                 <div className="space-y-4">
                     <div>
                         <label className="text-xs font-bold text-slate-500 uppercase">Room Shape</label>
                         <div className="grid grid-cols-2 gap-2 mt-1">
                             <button 
                                onClick={() => updateRoomDimensions({ shape: 'rectangle' })}
                                className={`py-2 text-xs font-bold rounded border ${event.floorDimensions?.shape === 'rectangle' || !event.floorDimensions?.shape ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-slate-200'}`}
                             >Rectangle</button>
                             <button 
                                onClick={() => updateRoomDimensions({ shape: 'oval' })}
                                className={`py-2 text-xs font-bold rounded border ${event.floorDimensions?.shape === 'oval' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-slate-200'}`}
                             >Oval</button>
                             <button 
                                onClick={() => updateRoomDimensions({ shape: 'square', length: event.floorDimensions?.width || 50 })}
                                className={`py-2 text-xs font-bold rounded border ${event.floorDimensions?.shape === 'square' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-slate-200'}`}
                             >Square</button>
                             <button 
                                onClick={() => updateRoomDimensions({ shape: 'round', length: event.floorDimensions?.width || 50 })}
                                className={`py-2 text-xs font-bold rounded border ${event.floorDimensions?.shape === 'round' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-slate-200'}`}
                             >Round</button>
                         </div>
                     </div>
                     <div className="grid grid-cols-2 gap-2">
                         <div>
                             <label className="text-xs font-bold text-slate-500 uppercase">Width (ft)</label>
                             <input type="number" className="w-full border rounded px-2 py-1 text-sm mt-1" value={event.floorDimensions?.width || 50} onChange={e => updateRoomDimensions({ width: parseInt(e.target.value) })} />
                         </div>
                         <div>
                             <label className="text-xs font-bold text-slate-500 uppercase">Length (ft)</label>
                             <input type="number" className="w-full border rounded px-2 py-1 text-sm mt-1" value={event.floorDimensions?.length || 40} onChange={e => updateRoomDimensions({ length: parseInt(e.target.value) })} />
                         </div>
                     </div>
                     <p className="text-[10px] text-slate-400">Note: Room size is abstract for visualization scale.</p>
                 </div>
             </div>
          )}

          {/* Canvas */}
          <div 
             className="flex-1 bg-slate-50 relative overflow-hidden cursor-grab active:cursor-grabbing"
             onMouseMove={handleMouseMove}
             onMouseUp={handleMouseUp}
             onMouseLeave={handleMouseUp}
             tabIndex={0}
          >
             {/* Grid Background */}
             <div 
                className="absolute inset-0 opacity-10 pointer-events-none" 
                style={{ 
                    backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
                    backgroundSize: `${20 * scale}px ${20 * scale}px` 
                }}
             />

             {/* Floor Container */}
             <div 
                ref={containerRef}
                className={`absolute left-1/2 top-1/2 shadow-2xl bg-white transition-all duration-300 origin-center border-4 border-slate-300 ${['oval', 'round'].includes(event.floorDimensions?.shape || '') ? 'rounded-[50%]' : ''}`}
                style={{
                    width: `${CANVAS_WIDTH}px`, 
                    height: `${CANVAS_HEIGHT}px`,
                    transform: `translate(-50%, -50%) scale(${scale})`
                }}
             >
                {(elements || []).map(el => (
                     <React.Fragment key={el.id}>
                         {renderElementShape(el)}
                     </React.Fragment>
                 ))}
             </div>

             <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur p-2 rounded-lg text-xs text-slate-500 pointer-events-none border border-slate-200 shadow-sm">
                 Shape: <span className="capitalize">{event.floorDimensions?.shape || 'Rectangle'}</span><br/>
                 Size: {event.floorDimensions?.width || 50}ft x {event.floorDimensions?.length || 40}ft <br/>
                 Canvas: {CANVAS_WIDTH}px x {CANVAS_HEIGHT}px
             </div>
          </div>
          
          {/* Inspector Panel */}
      <div className="w-80 bg-white border-l border-slate-200 p-4 overflow-y-auto z-20 shadow-xl">
          {!selectedElement ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center">
                  <Move className="h-12 w-12 mb-4 opacity-50" />
                  <p>Select an element to edit properties</p>
              </div>
          ) : (
              <div className="space-y-6 animate-in slide-in-from-right-10 duration-200">
                  <div>
                      <h3 className="font-bold text-lg text-slate-800 border-b border-slate-100 pb-2 mb-4">Properties</h3>
                      <div className="space-y-3">
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase">Label</label>
                              <input 
                                  type="text" 
                                  className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm mt-1 focus:border-emerald-500 outline-none"
                                  value={selectedElement.label}
                                  onChange={(e) => updateElement(selectedElement.id, { label: e.target.value })}
                              />
                          </div>
                          <div className="flex gap-2">
                              <div className="flex-1">
                                  <label className="text-xs font-bold text-slate-500 uppercase">Width</label>
                                  <input 
                                      type="number" 
                                      className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm mt-1"
                                      value={selectedElement.width}
                                      onChange={(e) => updateElement(selectedElement.id, { width: parseInt(e.target.value) })}
                                  />
                              </div>
                              <div className="flex-1">
                                  <label className="text-xs font-bold text-slate-500 uppercase">Height</label>
                                  <input 
                                      type="number" 
                                      className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm mt-1"
                                      value={selectedElement.height}
                                      onChange={(e) => updateElement(selectedElement.id, { height: parseInt(e.target.value) })}
                                  />
                              </div>
                          </div>
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase flex justify-between">
                                  Rotation <span>{selectedElement.rotation}°</span>
                              </label>
                              <input 
                                  type="range" 
                                  min="0" max="360" 
                                  className="w-full mt-1 accent-emerald-600"
                                  value={selectedElement.rotation}
                                  onChange={(e) => updateElement(selectedElement.id, { rotation: parseInt(e.target.value) })}
                              />
                              <div className="flex justify-between mt-1">
                                  <button onClick={() => updateElement(selectedElement.id, { rotation: (selectedElement.rotation - 45 + 360) % 360 })} className="p-1 hover:bg-slate-100 rounded"><RotateCw className="h-4 w-4 -scale-x-100" /></button>
                                  <button onClick={() => updateElement(selectedElement.id, { rotation: (selectedElement.rotation + 45) % 360 })} className="p-1 hover:bg-slate-100 rounded"><RotateCw className="h-4 w-4" /></button>
                              </div>
                          </div>
                          {(selectedElement.type.startsWith('table') || selectedElement.type === 'theatre-row') && (
                              <div>
                                  <label className="text-xs font-bold text-slate-500 uppercase">Capacity</label>
                                  <input 
                                      type="number" 
                                      className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm mt-1"
                                      value={selectedElement.capacity}
                                      onChange={(e) => updateElement(selectedElement.id, { capacity: parseInt(e.target.value) })}
                                  />
                              </div>
                          )}
                      </div>
                  </div>

                  {(selectedElement.type.startsWith('table') || selectedElement.type === 'theatre-row') && (
                      <div>
                          <h3 className="font-bold text-lg text-slate-800 border-b border-slate-100 pb-2 mb-4 flex justify-between items-center">
                              Guests
                              <span className={`text-xs px-2 py-1 rounded-full ${selectedElement.guestIds.length > (selectedElement.capacity || 0) ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                                  {selectedElement.guestIds.length} / {selectedElement.capacity}
                              </span>
                          </h3>
                          
                          {/* Seated Guests */}
                          <div className="space-y-1 mb-4">
                              {selectedElement.guestIds.map(gid => {
                                  const guest = event.guests.find(g => g.id === gid);
                                  if (!guest) return null;
                                  return (
                                      <div key={gid} className="flex justify-between items-center bg-emerald-50 p-2 rounded text-sm text-emerald-800">
                                          <span>{guest.name}</span>
                                          <button onClick={() => unassignGuest(selectedElement.id, gid)} className="text-emerald-400 hover:text-red-500"><Minus className="h-4 w-4"/></button>
                                      </div>
                                  );
                              })}
                              {selectedElement.guestIds.length === 0 && <p className="text-xs text-slate-400 italic">No guests seated.</p>}
                          </div>

                          {/* Unassigned Guests */}
                          <div>
                              <p className="text-xs font-bold text-slate-500 uppercase mb-2">Unassigned Guests</p>
                              <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                                  {unassignedGuests.length === 0 ? (
                                      <p className="text-xs text-slate-400 italic">All guests seated!</p>
                                  ) : (
                                      unassignedGuests.map(g => (
                                          <button 
                                              key={g.id}
                                              onClick={() => assignGuest(selectedElement.id, g.id)}
                                              className="w-full flex justify-between items-center p-2 rounded text-sm hover:bg-slate-50 border border-transparent hover:border-slate-200 text-slate-600 group"
                                          >
                                              <span>{g.name}</span>
                                              <Plus className="h-4 w-4 text-slate-300 group-hover:text-emerald-500" />
                                          </button>
                                      ))
                                  )}
                              </div>
                          </div>
                      </div>
                  )}

                  <div className="pt-4 border-t border-slate-100">
                      <button 
                          onClick={() => removeElement(selectedElement.id)}
                          className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 py-2 rounded-lg text-sm font-bold hover:bg-red-100 transition"
                      >
                          <Trash2 className="h-4 w-4" /> Delete Element
                      </button>
                  </div>
              </div>
          )}
      </div>
      </div>
    </div>
  );
};

export default FloorPlanEditor;