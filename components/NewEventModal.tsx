import React, { useState } from 'react';
import { X, Calendar, MapPin, Utensils, Plus, Trash2, Armchair } from 'lucide-react';
import { EventPlan, EventType, MenuItem } from '../types';

interface NewEventModalProps {
  onClose: () => void;
  onCreate: (event: EventPlan) => void;
}

const NewEventModal: React.FC<NewEventModalProps> = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    title: '',
    type: 'Wedding' as EventType,
    date: '',
    location: '',
    description: '',
    budget: '',
    guestCount: ''
  });

  // Menu State
  const [hasMenu, setHasMenu] = useState(false);
  // Seating State
  const [hasSeating, setHasSeating] = useState(false);
  
  // We initialize with simple strings for the Quick Add, but will convert to MenuItems later
  const [quickMenuItems, setQuickMenuItems] = useState<string[]>(['']);

  const handleAddQuickItem = () => {
    setQuickMenuItems([...quickMenuItems, '']);
  };

  const handleUpdateQuickItem = (index: number, value: string) => {
    const newItems = [...quickMenuItems];
    newItems[index] = value;
    setQuickMenuItems(newItems);
  };

  const handleRemoveQuickItem = (index: number) => {
    const newItems = quickMenuItems.filter((_, i) => i !== index);
    setQuickMenuItems(newItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Choose a random image based on type for variety
    const eventImages: Record<EventType, string[]> = {
        'Wedding': [
            'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=2070',
            'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=2069',
            'https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&q=80&w=2070',
            'https://images.unsplash.com/photo-1520342868574-5fa3804e551c?auto=format&fit=crop&q=80&w=2000'
        ],
        'Party': [
            'https://images.unsplash.com/photo-1530103862676-de3c9a59af57?auto=format&fit=crop&q=80&w=2070',
            'https://images.unsplash.com/photo-1496337589254-7e19d01cec44?auto=format&fit=crop&q=80&w=2070',
            'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&q=80&w=2070',
            'https://images.unsplash.com/photo-1514525253440-b393452e8d26?auto=format&fit=crop&q=80&w=2000'
        ],
        'Seminar': [
            'https://images.unsplash.com/photo-1544531696-60c35eb84300?auto=format&fit=crop&q=80&w=2070',
            'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&q=80&w=2070',
            'https://images.unsplash.com/photo-1551818255-e6e10975bc17?auto=format&fit=crop&q=80&w=2073',
            'https://images.unsplash.com/photo-1591115765373-5207764f72e7?auto=format&fit=crop&q=80&w=2000'
        ],
        'Other': [
            'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&q=80&w=2070',
            'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=2070',
            'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=2069',
            'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=2000'
        ]
    };

    const typeImages = eventImages[formData.type] || eventImages['Other'];
    const selectedImage = typeImages[Math.floor(Math.random() * typeImages.length)];

    // Convert quick strings to structured MenuItem objects
    const structuredMenuItems: MenuItem[] = hasMenu 
        ? quickMenuItems
            .filter(item => item.trim() !== '')
            .map((item, idx) => ({
                id: Date.now().toString() + idx,
                name: item,
                category: 'General', // Default category for quick add
                description: ''
            }))
        : [];

    const newEvent: EventPlan = {
      id: Date.now().toString(),
      title: formData.title,
      type: formData.type,
      date: formData.date,
      location: formData.location,
      description: formData.description,
      tasks: formData.budget ? [{
          id: `budget-init-${Date.now()}`,
          title: 'Initial Budget Limit',
          completed: false,
          category: 'Budget Allocation',
          estimatedCost: parseFloat(formData.budget) || 0
      }] : [],
      guests: [],
      vendors: [],
      imageUrl: selectedImage,
      hasMenu: hasMenu,
      menuItems: structuredMenuItems,
      hasSeating: hasSeating,
      floorDimensions: { width: 50, length: 40, shape: 'rectangle' },
      floorElements: [],
      tables: [],
      notifications: [] // Init empty inbox
    };

    onCreate(newEvent);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-emerald-950/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto pb-safe">
        <div className="bg-emerald-600 p-6 text-white flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-2xl font-bold">New Event</h2>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition"><X className="h-5 w-5" /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Event Title</label>
            <input 
              required
              type="text" 
              className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              placeholder="e.g., Summer Garden Party"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select 
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 bg-white"
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value as EventType})}
                >
                  <option value="Wedding">Wedding</option>
                  <option value="Party">Party</option>
                  <option value="Seminar">Seminar</option>
                  <option value="Other">Other</option>
                </select>
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input 
                  required
                  type="date" 
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                />
             </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
             <div className="relative">
                <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input 
                    type="text" 
                    className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-3 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    placeholder="Venue or Address"
                    value={formData.location}
                    onChange={e => setFormData({...formData, location: e.target.value})}
                />
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Est. Budget (₦)</label>
                 <input 
                    type="number" 
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    placeholder="500000"
                    value={formData.budget}
                    onChange={e => setFormData({...formData, budget: e.target.value})}
                 />
            </div>
            <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Guest Count</label>
                 <input 
                    type="number" 
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    placeholder="100"
                    value={formData.guestCount}
                    onChange={e => setFormData({...formData, guestCount: e.target.value})}
                 />
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
             <textarea 
                className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 min-h-[80px]"
                placeholder="Any specific themes or ideas?"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
             />
          </div>

          {/* Menu Section */}
          <div className="border-t border-slate-100 pt-4 space-y-4">
             {/* Menu Toggle */}
             <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Utensils className="h-4 w-4" />
                    Include Menu Selection?
                </label>
                <div 
                  onClick={() => setHasMenu(!hasMenu)}
                  className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300 ${hasMenu ? 'bg-emerald-500' : 'bg-slate-200'}`}
                >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transition-transform duration-300 ${hasMenu ? 'translate-x-6' : ''}`} />
                </div>
             </div>

             {hasMenu && (
                 <div className="space-y-3 bg-slate-50 p-4 rounded-2xl">
                     <p className="text-xs text-slate-500 mb-2">
                        Quick Add (Basic names only). You can create a fully detailed menu with descriptions and categories in the Event Details page after creation.
                     </p>
                     {quickMenuItems.map((item, idx) => (
                         <div key={idx} className="flex gap-2">
                             <input 
                                type="text" 
                                placeholder={`Option ${idx + 1} (e.g. Jollof Rice)`}
                                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                                value={item}
                                onChange={(e) => handleUpdateQuickItem(idx, e.target.value)}
                             />
                             {quickMenuItems.length > 1 && (
                                 <button 
                                    type="button" 
                                    onClick={() => handleRemoveQuickItem(idx)}
                                    className="p-2 text-red-400 hover:text-red-500"
                                 >
                                     <Trash2 className="h-4 w-4" />
                                 </button>
                             )}
                         </div>
                     ))}
                     <button 
                        type="button"
                        onClick={handleAddQuickItem}
                        className="text-sm text-emerald-600 font-semibold flex items-center gap-1 hover:text-emerald-700"
                     >
                         <Plus className="h-4 w-4" /> Add Another Option
                     </button>
                 </div>
             )}

             {/* Seating Toggle */}
             <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Armchair className="h-4 w-4" />
                    Enable Seating Chart?
                </label>
                <div 
                  onClick={() => setHasSeating(!hasSeating)}
                  className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300 ${hasSeating ? 'bg-emerald-500' : 'bg-slate-200'}`}
                >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transition-transform duration-300 ${hasSeating ? 'translate-x-6' : ''}`} />
                </div>
             </div>
          </div>

          <button 
            type="submit"
            className="w-full rounded-xl bg-emerald-600 py-4 text-white font-bold text-lg hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/20"
          >
            Create Plan
          </button>
        </form>
      </div>
    </div>
  );
};

export default NewEventModal;