import React, { useState } from 'react';
import { QrCode, Calendar, MapPin, Check, X, Utensils, Users, ArrowRight, Download, LogOut, Lock, AlertTriangle, Flower2 } from 'lucide-react';
import { EventPlan, Guest, MenuItem } from '../types';
import jsPDF from 'jspdf';

interface GuestPortalProps {
  event: EventPlan;
  guest: Guest;
  onUpdateGuest: (updatedGuest: Guest) => void;
  onLogout: () => void;
}

const GuestPortal: React.FC<GuestPortalProps> = ({ event, guest, onUpdateGuest, onLogout }) => {
  // Local state for form editing before saving
  const [formData, setFormData] = useState({
    status: guest.status,
    plusOneName: guest.plusOneName || '',
    mealChoice: guest.mealChoice || '',
    dietaryNotes: guest.dietaryNotes || ''
  });
  const [isSaved, setIsSaved] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const isLocked = guest.isLocked;

  const handleInitiateSave = () => {
      setShowConfirmModal(true);
  };

  const handleConfirmSave = () => {
    onUpdateGuest({
      ...guest,
      status: formData.status,
      plusOneName: formData.plusOneName,
      mealChoice: formData.mealChoice,
      dietaryNotes: formData.dietaryNotes,
      isLocked: true // Lock the response
    });
    setShowConfirmModal(false);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  // Group menu items by category
  const menuByCategory = (event.menuItems || []).reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
  }, {} as Record<string, MenuItem[]>);

  // Generate detailed QR Data for scanning
  // Reordered to prioritize Access Code for reliability
  const qrDetails = [
      `JAXY TICKET`,
      `Code: ${guest.accessCode}`,
      `Event: ${event.title}`,
      `Guest: ${guest.name}`,
      guest.plusOneAllowed ? `Plus One: ${guest.plusOneName || 'Yes (Name Pending)'}` : 'Plus One: No',
      `Meal: ${guest.mealChoice || 'Not Selected'}`
  ].join('\n');

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrDetails)}`;

  const handleDownloadTicket = () => {
      const doc = new jsPDF({
          orientation: 'p',
          unit: 'mm',
          format: 'a5'
      });

      // Background
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, 148, 210, 'F');
      
      // Header Bar
      doc.setFillColor(5, 150, 105); // Emerald 600
      doc.rect(0, 0, 148, 30, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("EVENTS BY JAXY", 74, 18, { align: 'center' });

      // QR Code
      doc.addImage(qrUrl, 'PNG', 44, 45, 60, 60);

      // Event Info
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(event.title, 74, 120, { align: 'center' });

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(new Date(event.date).toLocaleDateString(), 74, 128, { align: 'center' });
      doc.text(event.location, 74, 135, { align: 'center' });

      // Divider
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 145, 128, 145);

      // Guest Info
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(guest.name, 74, 160, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Code: ${guest.accessCode}`, 74, 168, { align: 'center' });
      
      if(guest.plusOneAllowed) {
          doc.setTextColor(5, 150, 105);
          doc.text(`+1: ${guest.plusOneName || 'Guest'}`, 74, 176, { align: 'center' });
      }

      if(guest.mealChoice) {
          doc.setTextColor(50, 50, 50);
          doc.setFontSize(10);
          doc.text(`Meal: ${guest.mealChoice}`, 74, 185, { align: 'center' });
      }

      doc.save(`ticket_${guest.accessCode}.pdf`);
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans pb-10">
      
      {/* Header */}
      <div className="bg-emerald-900 text-white pb-20 rounded-b-[2.5rem] shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div className="max-w-md mx-auto p-6 relative z-10">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-2">
                    {/* Tiny Logo */}
                    <div className="relative h-6 w-5 flex items-center justify-center text-white/90">
                        <div className="absolute inset-x-0.5 top-0 bottom-0 border border-current rounded-full"></div>
                        <div className="absolute inset-x-0 top-1/2 border-t border-current"></div>
                        <div className="absolute inset-y-0 left-1/2 border-l border-current"></div>
                        <Flower2 className="relative z-10 h-3 w-3 fill-emerald-900" />
                    </div>
                    <h3 className="font-cursive font-bold text-xl tracking-wide">Events By Jaxy</h3>
                </div>
                <button onClick={onLogout} className="flex items-center gap-1 text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition">
                    <LogOut className="h-3 w-3" /> Logout
                </button>
            </div>
            <div className="text-center space-y-2">
                <span className="inline-block px-3 py-1 rounded-full bg-emerald-800 text-emerald-200 text-xs font-semibold uppercase tracking-wider">
                    You are invited to
                </span>
                <h1 className="text-3xl font-bold leading-tight">{event.title}</h1>
                <div className="flex justify-center gap-4 text-emerald-100 text-sm mt-4">
                    <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {new Date(event.date).toLocaleDateString('en-GB')}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {event.location}</span>
                </div>
            </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-16 space-y-6 relative z-20">
        
        {/* Ticket / QR Code Card */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className="bg-emerald-600 p-4 text-center text-white text-sm font-medium">
                Entry Pass - Scan at Venue
            </div>
            <div className="p-8 flex flex-col items-center">
                <div className="bg-white p-2 border-2 border-slate-100 rounded-xl shadow-sm mb-4">
                    <img src={qrUrl} alt="Guest QR Code" className="w-48 h-48" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">{guest.name}</h2>
                <p className="text-slate-500 text-sm mb-3">{guest.email}</p>
                
                {/* Visual Meal & +1 Info */}
                {guest.mealChoice && (
                    <div className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wide border border-emerald-100">
                        <Utensils className="h-3 w-3" />
                        {guest.mealChoice}
                    </div>
                )}

                <div className="w-full border-t border-dashed border-slate-200 pt-4 flex justify-between text-xs text-slate-400 uppercase tracking-wider font-semibold">
                    <span>Ticket # {guest.accessCode}</span>
                    <div className="text-right">
                        <div>ADMIT ONE</div>
                        {guest.plusOneAllowed && (
                            <div className="text-emerald-600 font-bold mt-0.5">
                                + {guest.plusOneName || 'Guest'}
                            </div>
                        )}
                    </div>
                </div>
                <button 
                    onClick={handleDownloadTicket}
                    className="mt-6 flex items-center gap-2 text-emerald-600 text-sm font-semibold hover:text-emerald-700 bg-emerald-50 px-4 py-2 rounded-full transition-colors"
                >
                    <Download className="h-4 w-4" /> Download Ticket
                </button>
            </div>
        </div>

        {/* RSVP & Details Form */}
        <div className="bg-white rounded-3xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <ArrowRight className="h-5 w-5 text-emerald-500" /> Your Response
            </h3>
            
            {/* Locked Banner */}
            {isLocked && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                    <Lock className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                        <h4 className="font-bold text-amber-800 text-sm">Response Locked</h4>
                        <p className="text-amber-700 text-xs mt-1">
                            You have confirmed and locked your details. Please contact the host directly if you need to make urgent changes.
                        </p>
                    </div>
                </div>
            )}

            <div className="space-y-6">
                {/* RSVP Status */}
                <div className={isLocked ? 'opacity-60 pointer-events-none' : ''}>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Are you attending?</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            disabled={isLocked}
                            onClick={() => setFormData({...formData, status: 'Confirmed'})}
                            className={`flex items-center justify-center gap-2 py-3 rounded-xl border font-semibold transition-all ${
                                formData.status === 'Confirmed' 
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200' 
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            <Check className="h-4 w-4" /> Yes, attending
                        </button>
                        <button 
                            disabled={isLocked}
                            onClick={() => setFormData({...formData, status: 'Declined'})}
                            className={`flex items-center justify-center gap-2 py-3 rounded-xl border font-semibold transition-all ${
                                formData.status === 'Declined' 
                                ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-200' 
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            <X className="h-4 w-4" /> No, can't make it
                        </button>
                    </div>
                </div>

                {/* Conditional Fields if Attending */}
                {formData.status === 'Confirmed' && (
                    <div className={`space-y-6 animate-in fade-in slide-in-from-top-4 duration-300 ${isLocked ? 'opacity-60 pointer-events-none' : ''}`}>
                        
                        {/* Plus One */}
                        {guest.plusOneAllowed && (
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                    <Users className="h-4 w-4 text-emerald-500" /> Plus One Name
                                </label>
                                <input 
                                    disabled={isLocked}
                                    type="text" 
                                    placeholder="Enter your guest's name"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                                    value={formData.plusOneName}
                                    onChange={(e) => setFormData({...formData, plusOneName: e.target.value})}
                                />
                            </div>
                        )}

                        {/* Menu Selection */}
                        {event.hasMenu && (
                             <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <label className="block text-sm font-medium text-slate-700 mb-4 flex items-center gap-2">
                                    <Utensils className="h-4 w-4 text-emerald-500" /> Meal Preference
                                </label>
                                
                                {(event.menuItems && event.menuItems.length > 0) ? (
                                    <div className="space-y-4">
                                        {Object.entries(menuByCategory).map(([category, items]) => (
                                            <div key={category}>
                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{category}</h4>
                                                <div className="space-y-2">
                                                    {(items as MenuItem[]).map(item => (
                                                        <label key={item.id} className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-emerald-300 transition-colors">
                                                            <div className="flex items-center h-5 mt-0.5">
                                                                <input 
                                                                    disabled={isLocked}
                                                                    type="radio" 
                                                                    name="mealChoice" 
                                                                    value={item.name}
                                                                    checked={formData.mealChoice === item.name}
                                                                    onChange={(e) => setFormData({...formData, mealChoice: e.target.value})}
                                                                    className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500"
                                                                />
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-slate-800 text-sm">{item.name}</div>
                                                                {item.description && <div className="text-xs text-slate-500">{item.description}</div>}
                                                            </div>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500 italic">No menu items available yet.</p>
                                )}
                            </div>
                        )}

                        {/* Dietary Restrictions */}
                        <div>
                             <label className="block text-sm font-medium text-slate-700 mb-2">Dietary Requirements / Allergies</label>
                             <textarea 
                                disabled={isLocked}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[80px] bg-white"
                                placeholder="e.g. Nut allergy, Gluten free..."
                                value={formData.dietaryNotes}
                                onChange={(e) => setFormData({...formData, dietaryNotes: e.target.value})}
                             />
                        </div>
                    </div>
                )}

                <button 
                    onClick={handleInitiateSave}
                    className={`w-full py-4 font-bold rounded-xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${
                        isLocked 
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' 
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                    disabled={isLocked || isSaved}
                >
                    {isLocked ? (
                        <>
                            <Lock className="h-4 w-4" /> Response Submitted
                        </>
                    ) : (
                        isSaved ? "Saved!" : "Update My Details"
                    )}
                </button>
            </div>
        </div>

      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="h-14 w-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                    <AlertTriangle className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold text-center text-slate-900 mb-2">Finalize Your Response?</h3>
                <p className="text-sm text-slate-500 text-center mb-6 leading-relaxed">
                    Once you approve, your details will be <strong>locked</strong> and sent to the host. You won't be able to edit them again here.
                </p>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowConfirmModal(false)}
                        className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                    >
                        I Reject (Edit)
                    </button>
                    <button 
                        onClick={handleConfirmSave}
                        className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-colors"
                    >
                        I Approve
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default GuestPortal;