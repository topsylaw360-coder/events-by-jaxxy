import React, { useState } from 'react';
import { Lock, Search, User, KeyRound, Sparkles, QrCode, ClipboardList, Send, Utensils, Armchair, Flower2 } from 'lucide-react';
import { EventPlan, Guest, EventRequest, EventType } from '../types';

interface AuthLandingProps {
  events: EventPlan[];
  onAdminLogin: () => void;
  onGuestLogin: (guest: Guest, eventId: string) => void;
  onPlanRequest: (req: EventRequest) => void;
}

const AuthLanding: React.FC<AuthLandingProps> = ({ events, onAdminLogin, onGuestLogin, onPlanRequest }) => {
  const [activeTab, setActiveTab] = useState<'guest' | 'admin' | 'plan'>('guest');
  
  // Guest State
  const [accessCode, setAccessCode] = useState('');
  const [guestError, setGuestError] = useState('');

  // Admin State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminError, setAdminError] = useState('');

  // Plan Request State
  const [planForm, setPlanForm] = useState({
      name: '',
      phone: '',
      email: '',
      type: 'Wedding' as EventType,
      budget: '',
      guests: '',
      date: '',
      hasMenu: false,
      hasSeating: false
  });
  const [planSent, setPlanSent] = useState(false);

  const handleGuestLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setGuestError('');

    const code = accessCode.trim().toLowerCase();

    let foundGuest: Guest | undefined;
    let foundEventId: string | undefined;

    for (const event of events) {
      const match = event.guests.find(g => g.accessCode.toLowerCase() === code);
      if (match) {
        foundGuest = match;
        foundEventId = event.id;
        break;
      }
    }

    if (foundGuest && foundEventId) {
      onGuestLogin(foundGuest, foundEventId);
    } else {
      setGuestError('Invalid invitation code. Please check the code provided by the host.');
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');

    const creds = [
      { u: 'jaxyzankli@gmail.com', p: 'jokebaby' },
      { u: 'planner@jaxyevents.com', p: 'eventsj101' }
    ];

    const isValid = creds.some(c => c.u.toLowerCase() === email.toLowerCase() && c.p === password);

    if (isValid) {
      onAdminLogin();
    } else {
      setAdminError('Invalid credentials.');
    }
  };

  const handlePlanSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const request: EventRequest = {
          id: Date.now().toString(),
          clientName: planForm.name,
          phone: planForm.phone,
          email: planForm.email,
          eventType: planForm.type,
          budget: parseFloat(planForm.budget) || 0,
          guestCount: parseInt(planForm.guests) || 0,
          date: planForm.date,
          timestamp: new Date().toISOString(),
          hasMenu: planForm.hasMenu,
          hasSeating: planForm.hasSeating,
          status: 'pending'
      };
      onPlanRequest(request);
      setPlanSent(true);
      setPlanForm({ name: '', phone: '', email: '', type: 'Wedding', budget: '', guests: '', date: '', hasMenu: false, hasSeating: false });
      setTimeout(() => {
          setPlanSent(false);
          setActiveTab('guest');
      }, 3000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
        {/* Background Decor */}
        <div className="absolute top-0 left-0 w-full h-96 bg-emerald-900 rounded-b-[4rem] shadow-2xl z-0" />
        
        <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="p-8 pb-6 bg-emerald-900 text-white text-center flex flex-col items-center">
                {/* Logo Graphic */}
                <div className="relative h-20 w-16 mb-2 flex items-center justify-center text-emerald-100/80">
                    <div className="absolute inset-x-2 top-0 bottom-0 border border-current rounded-full"></div>
                    <div className="absolute inset-x-0 top-1/2 border-t border-current"></div>
                    <div className="absolute inset-y-0 left-1/2 border-l border-current"></div>
                    <div className="relative z-10 bg-emerald-900 p-1">
                        <Flower2 className="h-6 w-6 text-white" />
                    </div>
                </div>
                
                <h1 className="text-4xl font-cursive font-normal tracking-wide">Events By Jaxy</h1>
                <p className="text-emerald-200/60 mt-2 text-xs uppercase tracking-widest">Est. 2000</p>
            </div>

            <div className="flex border-b border-slate-100">
                <button 
                    onClick={() => setActiveTab('guest')}
                    className={`flex-1 py-4 text-xs sm:text-sm font-semibold transition-colors ${activeTab === 'guest' ? 'text-emerald-900 border-b-2 border-emerald-900' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Find Invitation
                </button>
                <button 
                    onClick={() => setActiveTab('plan')}
                    className={`flex-1 py-4 text-xs sm:text-sm font-semibold transition-colors ${activeTab === 'plan' ? 'text-emerald-900 border-b-2 border-emerald-900' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Plan My Event
                </button>
                <button 
                    onClick={() => setActiveTab('admin')}
                    className={`flex-1 py-4 text-xs sm:text-sm font-semibold transition-colors ${activeTab === 'admin' ? 'text-emerald-900 border-b-2 border-emerald-900' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Planner Login
                </button>
            </div>

            <div className="p-8">
                {activeTab === 'guest' && (
                    <form onSubmit={handleGuestLookup} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Invitation Code</label>
                            <div className="relative">
                                <QrCode className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                                <input 
                                    type="text"
                                    placeholder="e.g. WED-2024"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all uppercase"
                                    value={accessCode}
                                    onChange={(e) => setAccessCode(e.target.value)}
                                    required
                                />
                            </div>
                            <p className="text-xs text-slate-500">Enter the unique code provided by the event organizer.</p>
                        </div>
                        {guestError && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{guestError}</p>}
                        <button type="submit" className="w-full bg-emerald-900 hover:bg-emerald-800 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-900/20">
                            Access Invitation
                        </button>
                    </form>
                )}
                
                {activeTab === 'plan' && (
                    planSent ? (
                        <div className="text-center py-10">
                            <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Send className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">Request Sent!</h3>
                            <p className="text-slate-500 mt-2">A planner will review your details and contact you shortly.</p>
                        </div>
                    ) : (
                        <form onSubmit={handlePlanSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Your Details</label>
                                <input 
                                    type="text" placeholder="Full Name" required
                                    className="w-full mt-1 px-4 py-2 rounded-lg border border-slate-200 text-sm focus:border-emerald-500 outline-none"
                                    value={planForm.name} onChange={e => setPlanForm({...planForm, name: e.target.value})}
                                />
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <input 
                                        type="tel" placeholder="Phone" required
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:border-emerald-500 outline-none"
                                        value={planForm.phone} onChange={e => setPlanForm({...planForm, phone: e.target.value})}
                                    />
                                    <input 
                                        type="email" placeholder="Email" required
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:border-emerald-500 outline-none"
                                        value={planForm.email} onChange={e => setPlanForm({...planForm, email: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Event Details</label>
                                <select 
                                    className="w-full mt-1 px-4 py-2 rounded-lg border border-slate-200 text-sm focus:border-emerald-500 outline-none bg-white"
                                    value={planForm.type} onChange={e => setPlanForm({...planForm, type: e.target.value as EventType})}
                                >
                                    <option value="Wedding">Wedding</option>
                                    <option value="Party">Party</option>
                                    <option value="Seminar">Seminar</option>
                                    <option value="Other">Other</option>
                                </select>
                                <div className="mt-2">
                                    <input 
                                        type="date" required
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:border-emerald-500 outline-none mb-2"
                                        value={planForm.date} onChange={e => setPlanForm({...planForm, date: e.target.value})}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <input 
                                        type="number" placeholder="Budget (₦)"
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:border-emerald-500 outline-none"
                                        value={planForm.budget} onChange={e => setPlanForm({...planForm, budget: e.target.value})}
                                    />
                                    <input 
                                        type="number" placeholder="Guest Count"
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:border-emerald-500 outline-none"
                                        value={planForm.guests} onChange={e => setPlanForm({...planForm, guests: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-1 border-t border-slate-100">
                                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer p-2 hover:bg-slate-50 rounded-lg flex-1">
                                    <input 
                                        type="checkbox" 
                                        checked={planForm.hasMenu} 
                                        onChange={e => setPlanForm({...planForm, hasMenu: e.target.checked})}
                                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" 
                                    />
                                    <div className="flex items-center gap-1.5">
                                        <Utensils className="h-3.5 w-3.5 text-slate-400" /> Include Menu
                                    </div>
                                </label>
                                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer p-2 hover:bg-slate-50 rounded-lg flex-1">
                                    <input 
                                        type="checkbox" 
                                        checked={planForm.hasSeating} 
                                        onChange={e => setPlanForm({...planForm, hasSeating: e.target.checked})}
                                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" 
                                    />
                                    <div className="flex items-center gap-1.5">
                                        <Armchair className="h-3.5 w-3.5 text-slate-400" /> Enable Seating
                                    </div>
                                </label>
                            </div>

                            <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2">
                                <ClipboardList className="h-4 w-4" /> Send Request
                            </button>
                        </form>
                    )
                )}

                {activeTab === 'admin' && (
                    <form onSubmit={handleAdminLogin} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Email Address</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                                <input 
                                    type="email"
                                    placeholder="admin@jaxyevents.com"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Password</label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                                <input 
                                    type="password"
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        {adminError && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{adminError}</p>}
                        <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg">
                            Login as Admin
                        </button>
                    </form>
                )}
            </div>
        </div>
        
        <div className="absolute bottom-6 text-slate-400 text-sm">
            © 2024 Events By Jaxy. All rights reserved.
        </div>
    </div>
  );
};

export default AuthLanding;