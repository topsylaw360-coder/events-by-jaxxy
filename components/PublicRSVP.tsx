import React, { useState } from 'react';
import { EventPlan, MenuItem } from '../types';
import { MapPin, Calendar, CheckCircle, Download } from 'lucide-react';
import jsPDF from 'jspdf';

interface PublicRSVPProps {
    event: EventPlan;
    onRsvpSubmit: (eventId: string, guestData: any) => void;
}

const PublicRSVP: React.FC<PublicRSVPProps> = ({ event, onRsvpSubmit }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        mealChoice: '',
        plusOne: false,
        plusOneName: ''
    });
    const [submitted, setSubmitted] = useState(false);
    const [accessCode, setAccessCode] = useState('');

    const menuByCategory = (event.menuItems || []).reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {} as Record<string, MenuItem[]>);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const code = `${formData.name.split(' ')[0].toUpperCase()}-${Math.floor(Math.random() * 9000) + 1000}`;
        setAccessCode(code);
        onRsvpSubmit(event.id, {
            name: formData.name,
            email: formData.email,
            status: 'Confirmed',
            mealChoice: formData.mealChoice,
            plusOneAllowed: formData.plusOne,
            plusOneName: formData.plusOneName,
            accessCode: code
        });
        setSubmitted(true);
    };

    const qrDetails = [
        `JAXY TICKET`,
        `Code: ${accessCode}`,
        `Event: ${event.title}`,
        `Guest: ${formData.name}`,
        formData.plusOne ? `Plus One: ${formData.plusOneName || 'Yes (Name Pending)'}` : 'Plus One: No',
        `Meal: ${formData.mealChoice || 'Not Selected'}`
    ].join('\n');

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrDetails)}`;

    const handleDownloadTicket = () => {
        const doc = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a5'
        });

        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, 148, 210, 'F');
        
        doc.setFillColor(5, 150, 105);
        doc.rect(0, 0, 148, 30, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.text("EVENTS BY JAXY", 74, 18, { align: 'center' });

        doc.addImage(qrUrl, 'PNG', 44, 45, 60, 60);

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text(event.title, 74, 120, { align: 'center' });

        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(new Date(event.date).toLocaleDateString(), 74, 128, { align: 'center' });
        doc.text(event.location, 74, 135, { align: 'center' });

        doc.setDrawColor(200, 200, 200);
        doc.line(20, 145, 128, 145);

        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(formData.name, 74, 160, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(`Code: ${accessCode}`, 74, 168, { align: 'center' });
        
        if(formData.plusOne) {
            doc.setTextColor(5, 150, 105);
            doc.text(`+1: ${formData.plusOneName || 'Guest'}`, 74, 176, { align: 'center' });
        }

        if(formData.mealChoice) {
            doc.setTextColor(50, 50, 50);
            doc.setFontSize(10);
            doc.text(`Meal: ${formData.mealChoice}`, 74, 185, { align: 'center' });
        }

        doc.save(`ticket_${accessCode}.pdf`);
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
                        <CheckCircle size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">RSVP Confirmed!</h2>
                    <p className="text-slate-600 mb-6">Thank you for confirming your attendance to {event.title}. We look forward to seeing you there!</p>

                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-6 flex flex-col items-center">
                        <span className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-4">Your Entry Pass</span>
                        <div className="bg-white p-2 border-2 border-slate-100 rounded-xl shadow-sm mb-4">
                            <img src={qrUrl} alt="QR Code" className="w-40 h-40" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">{formData.name}</h3>
                        <p className="text-slate-500 font-mono font-bold">{accessCode}</p>
                    </div>

                    <button 
                        onClick={handleDownloadTicket}
                        className="w-full flex justify-center items-center gap-2 rounded-xl bg-emerald-600 py-4 text-white font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/20"
                    >
                        <Download size={20} /> Download Ticket
                    </button>
                    
                    <button 
                        onClick={() => window.location.href = window.location.origin}
                        className="w-full text-slate-500 font-medium hover:text-emerald-600 transition mt-4"
                    >
                        Go back to Events
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-xl mx-auto">
                <div className="bg-white rounded-3xl overflow-hidden shadow-xl">
                    <div className="h-48 w-full relative">
                        <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-6">
                            <h1 className="text-3xl font-bold text-white mb-2">{event.title}</h1>
                            <div className="flex items-center text-slate-200 text-sm gap-4">
                                <span className="flex items-center"><Calendar className="w-4 h-4 mr-1" /> {new Date(event.date).toLocaleDateString()}</span>
                                <span className="flex items-center"><MapPin className="w-4 h-4 mr-1" /> {event.location}</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 md:p-8">
                        <p className="text-slate-600 mb-8 border-b pb-8 border-slate-100">{event.description}</p>
                        
                        <h2 className="text-xl font-bold text-slate-800 mb-6">RSVP to this Event</h2>
                        
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                                <input 
                                    required
                                    type="text" 
                                    className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-emerald-500 focus:outline-none"
                                    placeholder="Your full name"
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                                <input 
                                    required
                                    type="email" 
                                    className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-emerald-500 focus:outline-none"
                                    placeholder="Your email address"
                                    value={formData.email}
                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                />
                            </div>

                            {event.hasMenu && Object.keys(menuByCategory).length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Meal Preference</label>
                                    <select 
                                        className="w-full rounded-xl border border-slate-200 px-4 py-3 bg-white focus:border-emerald-500 focus:outline-none"
                                        value={formData.mealChoice}
                                        onChange={e => setFormData({...formData, mealChoice: e.target.value})}
                                    >
                                        <option value="">Select a meal</option>
                                        {Object.entries(menuByCategory).map(([category, items]) => (
                                            <optgroup key={category} label={category}>
                                                {(items as MenuItem[]).map(item => (
                                                    <option key={item.id} value={item.name}>{item.name}</option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="border border-slate-200 rounded-xl p-4 mt-6">
                                <div className="flex items-center mb-4">
                                    <input 
                                        type="checkbox" 
                                        id="plusOne"
                                        className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                        checked={formData.plusOne}
                                        onChange={e => setFormData({...formData, plusOne: e.target.checked})}
                                    />
                                    <label htmlFor="plusOne" className="ml-3 text-sm font-medium text-slate-700">I am bringing a +1</label>
                                </div>
                                
                                {formData.plusOne && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Your +1's Full Name</label>
                                        <input 
                                            required
                                            type="text" 
                                            className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-emerald-500 focus:outline-none"
                                            placeholder="+1's name"
                                            value={formData.plusOneName}
                                            onChange={e => setFormData({...formData, plusOneName: e.target.value})}
                                        />
                                    </div>
                                )}
                            </div>

                            <button 
                                type="submit"
                                className="w-full rounded-xl bg-emerald-600 py-4 text-white font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/20 mt-8"
                            >
                                Confirm Attendance
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublicRSVP;
