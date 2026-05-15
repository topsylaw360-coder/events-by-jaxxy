import React, { useState } from 'react';
import { Plus, Sparkles, Search, Calendar, Archive, Trash2, AlertCircle, Check, X, ClipboardList, Store, MapPin, Star, Phone, Ban, Home, LayoutList, Briefcase, Bell } from 'lucide-react';
import { EventPlan, EventType, EventRequest, Vendor } from '../types';
import EventCard from './EventCard';
import { findVendors } from '../services/geminiService';

interface DashboardProps {
  events: EventPlan[];
  requests: EventRequest[];
  onSelectEvent: (event: EventPlan) => void;
  onNewEvent: () => void;
  onArchiveEvent: (id: string) => void;
  onDeleteEvent: (id: string) => void;
  onApproveRequest: (req: EventRequest) => void;
  onRejectRequest: (id: string) => void;
  onDeleteRequest: (id: string) => void;
  onAddVendorToEvent: (eventId: string, vendor: Vendor) => void;
}

type MainTab = 'Events' | 'Requests' | 'Vendors';
type EventFilter = EventType | 'All' | 'Archived';

const Dashboard: React.FC<DashboardProps> = ({ 
  events, requests, onSelectEvent, onNewEvent, onArchiveEvent, onDeleteEvent, onApproveRequest, onRejectRequest, onDeleteRequest, onAddVendorToEvent
}) => {
  const [activeTab, setActiveTab] = useState<MainTab>('Events');
  const [eventFilter, setEventFilter] = useState<EventFilter>('All');
  
  // Vendor Search State
  const [vendorQuery, setVendorQuery] = useState('');
  const [isSearchingVendors, setIsSearchingVendors] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [addingVendorId, setAddingVendorId] = useState<string | null>(null);

  const filteredEvents = (events || []).filter(e => {
      if (eventFilter === 'Archived') return e.isArchived;
      if (e.isArchived) return false; 
      if (eventFilter === 'All') return true;
      return e.type === eventFilter;
  });

  // Active events specifically for the vendor adder
  const activeEvents = (events || []).filter(e => !e.isArchived);

  const pendingRequestsCount = (requests || []).filter(r => r.status === 'pending' || r.status === undefined).length;
  const archivedCount = (events || []).filter(e => e.isArchived).length;

  const isPastEvent = (dateStr: string) => {
      const eventDate = new Date(dateStr);
      const today = new Date();
      return eventDate < today;
  };

  const handleVendorSearch = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!vendorQuery.trim()) return;
      
      setIsSearchingVendors(true);
      setVendors([]); // clear previous
      
      const results = await findVendors(vendorQuery);
      setVendors(results.map((v, i) => ({...v, id: `temp-${i}`}))); // Assign temp IDs
      setIsSearchingVendors(false);
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in pb-24 md:pb-8">
      
      {/* Hero Section - Hidden on Requests/Vendors tabs on mobile to save space */}
      <div className={`relative overflow-hidden rounded-[2.5rem] bg-emerald-900 px-6 py-10 md:px-12 md:py-16 text-white shadow-2xl transition-all ${activeTab !== 'Events' ? 'hidden md:block' : 'block'}`}>
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 text-emerald-300 font-semibold mb-3 md:mb-4">
             <Sparkles className="h-5 w-5" />
             <span className="text-sm md:text-base">Welcome Back</span>
          </div>
          <h1 className="text-3xl md:text-6xl font-bold tracking-tight mb-4 md:mb-6 leading-tight">
            Crafting Unforgettable <span className="text-emerald-400">Moments</span>
          </h1>
          <p className="text-emerald-100/80 text-sm md:text-lg mb-6 md:mb-8 max-w-lg leading-relaxed">
            Your events, perfectly planned. Manage everything from guest lists to budgets in one beautiful space.
          </p>
          <button 
            onClick={onNewEvent}
            className="group flex w-full md:w-auto items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 md:py-4 text-emerald-900 font-bold transition-all hover:bg-emerald-50 active:scale-95 shadow-xl shadow-emerald-900/20"
          >
            <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
            Create New Event
          </button>
        </div>
        
        {/* Abstract Background Decor */}
        <div className="absolute top-0 right-0 -mt-20 -mr-20 h-[300px] md:h-[500px] w-[300px] md:w-[500px] rounded-full bg-emerald-500 opacity-20 blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 -mb-20 h-[200px] md:h-[300px] w-[200px] md:w-[300px] rounded-full bg-teal-400 opacity-10 blur-[80px]" />
      </div>

      {/* Main Desktop Tabs (Hidden on Mobile) */}
      <div className="hidden md:flex justify-between items-center mb-8">
        <div className="flex p-1.5 bg-white border border-slate-200 rounded-full shadow-sm">
          {(['Events', 'Requests', 'Vendors'] as MainTab[]).map(tab => (
            <button
               key={tab}
               onClick={() => setActiveTab(tab)}
               className={`flex items-center gap-2 px-8 py-2.5 rounded-full font-bold text-sm transition-all relative ${
                 activeTab === tab ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
               }`}
            >
               {tab === 'Events' && <Calendar className="w-4 h-4" />}
               {tab === 'Requests' && <LayoutList className="w-4 h-4" />}
               {tab === 'Vendors' && <Store className="w-4 h-4" />}
               {tab}
               {tab === 'Requests' && pendingRequestsCount > 0 && (
                   <span className={`absolute top-0 right-1 -mt-1 -mr-1 h-5 w-5 ${activeTab === tab ? 'bg-red-500' : 'bg-red-100 text-red-600'} text-white text-[10px] rounded-full flex items-center justify-center shadow-sm font-bold border-2 border-white`}>
                       {pendingRequestsCount}
                   </span>
               )}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      
      {/* EVENTS TAB */}
      {activeTab === 'Events' && (
      <div className="animate-in slide-in-from-right-4 md:slide-in-from-bottom-4 duration-300">
        <div className="flex justify-between items-center mb-4 md:mb-6">
            <div className="flex space-x-2 overflow-x-auto pb-4 pt-2 px-2 -mx-2 md:pb-0 md:pt-0 md:px-0 md:mx-0 no-scrollbar snap-x w-full">
                {['All', 'Wedding', 'Party', 'Seminar', 'Archived'].map((type) => (
                <button
                    key={type}
                    onClick={() => setEventFilter(type as EventFilter)}
                    className={`snap-start rounded-full px-5 py-2 md:px-6 md:py-2.5 text-xs md:text-sm font-semibold transition-colors whitespace-nowrap relative flex-shrink-0 ${
                    eventFilter === type
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 shadow-sm'
                    }`}
                >
                    {type}
                    {type === 'Archived' && archivedCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-slate-800 text-white text-[10px] rounded-full flex items-center justify-center shadow-sm border-2 border-white">
                            {archivedCount}
                        </span>
                    )}
                </button>
                ))}
            </div>
            <div className="hidden md:block relative ml-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Search events..." 
                    className="w-48 xl:w-64 rounded-full border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
            </div>
        </div>
        
        <div className="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(filteredEvents || []).map((event) => {
                const isPast = isPastEvent(event.date);
                return (
                    <div key={event.id} className="relative group">
                        <EventCard 
                            event={event} 
                            onClick={onSelectEvent} 
                            onDelete={onDeleteEvent}
                        />
                        
                        {/* Past Event Overlay - Only show if not already archived and date is past */}
                        {isPast && !event.isArchived && (
                            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center p-6 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 z-20">
                                <AlertCircle className="h-10 w-10 text-amber-400 mb-2" />
                                <h3 className="font-bold text-lg mb-1">Event Passed</h3>
                                <p className="text-sm text-slate-300 text-center mb-4">Date has passed. Would you like to archive or delete?</p>
                                <div className="flex gap-2 w-full">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onArchiveEvent(event.id); }}
                                        className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1 active:scale-95 transition-transform"
                                    >
                                        <Archive className="h-4 w-4" /> Archive
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onDeleteEvent(event.id); }}
                                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1 active:scale-95 transition-transform"
                                    >
                                        <Trash2 className="h-4 w-4" /> Delete
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
            
            {/* Empty State placeholder */}
            {filteredEvents.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
                    <div className="bg-slate-100 p-6 rounded-full mb-4">
                        <Calendar className="h-8 w-8 text-slate-300" />
                    </div>
                    <p>No events found in this category.</p>
                </div>
            )}
        </div>
      </div>
      )}

      {/* VENDOR FINDER TAB */}
      {activeTab === 'Vendors' && (
          <div className="animate-in slide-in-from-right-4 md:slide-in-from-bottom-4 duration-300">
              <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-200 text-center mb-6 md:mb-8">
                  <div className="inline-flex items-center justify-center h-16 w-16 bg-indigo-50 rounded-full mb-4">
                      <Store className="h-8 w-8 text-indigo-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Smart Vendor Finder</h2>
                  <p className="text-sm text-slate-500 max-w-lg mx-auto mb-6">
                      Looking for a cake baker, a venue in Maitama, or a DJ? Describe what you need, and our AI will search the web to find the best local options for you.
                  </p>
                  
                  <form onSubmit={handleVendorSearch} className="max-w-xl mx-auto relative flex flex-col md:block gap-3">
                      <input 
                          type="text"
                          value={vendorQuery}
                          onChange={(e) => setVendorQuery(e.target.value)}
                          placeholder="e.g. Wedding halls in Abuja for 300 guests..."
                          className="w-full rounded-2xl md:rounded-full border border-slate-200 px-5 md:pl-6 md:pr-32 py-4 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-slate-700 text-sm md:text-base"
                      />
                      <button 
                          type="submit"
                          disabled={isSearchingVendors || !vendorQuery}
                          className="w-full md:w-auto md:absolute md:right-2 md:top-2 md:bottom-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 md:py-0 rounded-2xl md:rounded-full font-bold transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 active:scale-95"
                      >
                          {isSearchingVendors ? (
                             <>Searching...</>
                          ) : (
                             <>
                                <Search className="h-4 w-4" /> Find
                             </>
                          )}
                      </button>
                  </form>
              </div>

              {vendors.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                      {(vendors || []).map((vendor) => (
                          <div key={vendor.id} className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative">
                              <div className="flex justify-between items-start mb-3">
                                  <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase">{vendor.category}</span>
                                  {vendor.rating !== 'N/A' && (
                                      <span className="flex items-center gap-1 text-amber-500 font-bold text-sm">
                                          <Star className="h-4 w-4 fill-current" /> {vendor.rating}
                                      </span>
                                  )}
                              </div>
                              <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-1">{vendor.name}</h3>
                              <p className="text-sm text-slate-500 mb-4 line-clamp-2 md:line-clamp-none">{vendor.description}</p>
                              
                              <div className="space-y-2 text-sm text-slate-600 mb-6">
                                  <div className="flex items-start gap-2">
                                      <MapPin className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                      <span>{vendor.location}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                      <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                      <span className="font-mono text-slate-700">{vendor.contact}</span>
                                  </div>
                              </div>

                              {/* Add to Event Action */}
                              <div className="mt-4 pt-4 border-t border-slate-100">
                                  {addingVendorId === vendor.id ? (
                                      <div className="animate-in fade-in zoom-in-95 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                          <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide px-1">Select Event to Add:</p>
                                          <div className="space-y-1">
                                              {activeEvents.length === 0 ? (
                                                  <p className="text-xs text-red-500">No active events found.</p>
                                              ) : (
                                                  (activeEvents || []).map(ev => (
                                                      <button 
                                                          key={ev.id}
                                                          onClick={() => {
                                                              onAddVendorToEvent(ev.id, vendor);
                                                              setAddingVendorId(null);
                                                          }}
                                                          className="w-full text-left text-[13px] px-3 py-2.5 bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-100 rounded-xl text-slate-700 truncate font-medium border border-slate-200 transition-colors"
                                                      >
                                                          {ev.title}
                                                      </button>
                                                  ))
                                              )}
                                              <button 
                                                  onClick={() => setAddingVendorId(null)}
                                                  className="w-full text-center text-[13px] text-slate-500 py-2 mt-1 hover:text-slate-800 font-medium"
                                              >
                                                  Cancel
                                              </button>
                                          </div>
                                      </div>
                                  ) : (
                                      <button 
                                          onClick={() => setAddingVendorId(vendor.id)}
                                          className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-3 rounded-xl text-sm font-bold hover:bg-slate-800 transition active:scale-95"
                                      >
                                          <Plus className="h-4 w-4" /> Add to Event
                                      </button>
                                  )}
                              </div>
                          </div>
                      ))}
                  </div>
              )}
              
              {!isSearchingVendors && vendors.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                      Results will appear here.
                  </div>
              )}
          </div>
      )}

      {/* REQUESTS TAB */}
      {activeTab === 'Requests' && (
          <div className="animate-in slide-in-from-right-4 md:slide-in-from-bottom-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                {requests.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
                        <div className="bg-slate-100 p-6 rounded-full mb-4">
                            <ClipboardList className="h-8 w-8 text-slate-300" />
                        </div>
                        <p>No pending requests.</p>
                    </div>
                ) : (
                    (requests || []).map(req => {
                        const isRejected = req.status === 'rejected';
                        return (
                        <div key={req.id} className={`bg-white rounded-[2rem] p-5 md:p-6 shadow-sm border border-slate-200 flex flex-col justify-between ${isRejected ? 'opacity-75 bg-slate-50' : ''}`}>
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[11px] md:text-xs font-bold uppercase tracking-wider">{req.eventType}</span>
                                    <div className="flex flex-col items-end">
                                      <span className="text-[11px] md:text-xs text-slate-400">Req: {new Date(req.timestamp).toLocaleDateString()}</span>
                                      {isRejected && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold mt-1 uppercase">Rejected</span>}
                                    </div>
                                </div>
                                <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-1 leading-tight">{req.clientName}</h3>
                                <p className="text-slate-500 text-xs md:text-sm mb-4 leading-relaxed">{req.email} • {req.phone}</p>
                                
                                <div className="flex items-center gap-2 mb-4 text-xs md:text-sm text-emerald-700 bg-emerald-50 px-3 py-2.5 rounded-xl">
                                    <Calendar className="h-4 w-4 shrink-0" />
                                    <span className="font-semibold truncate">Target Date: {req.date ? new Date(req.date).toLocaleDateString() : 'TBD'}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <div className="bg-slate-50 p-3 md:p-4 rounded-2xl border border-slate-100">
                                        <div className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-wide mb-1">Budget</div>
                                        <div className="font-black text-slate-800 text-sm md:text-base truncate">₦{req.budget.toLocaleString()}</div>
                                    </div>
                                    <div className="bg-slate-50 p-3 md:p-4 rounded-2xl border border-slate-100">
                                        <div className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-wide mb-1">Guests</div>
                                        <div className="font-black text-slate-800 text-sm md:text-base">{req.guestCount}</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex gap-2.5">
                                {isRejected ? (
                                    <button 
                                      onClick={() => onDeleteRequest(req.id)}
                                      className="w-full py-3.5 text-red-600 font-bold hover:bg-red-50 rounded-xl transition-colors border-2 border-red-100 flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        <Trash2 className="h-4 w-4" /> Delete Request
                                    </button>
                                ) : (
                                    <>
                                      <button 
                                          onClick={() => onRejectRequest(req.id)}
                                          className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 hover:text-slate-800 rounded-xl transition-colors border-2 border-slate-200 flex items-center justify-center gap-2 active:scale-95"
                                      >
                                          <Ban className="h-4 w-4" /> Reject
                                      </button>
                                      <button 
                                          onClick={() => onApproveRequest(req)}
                                          className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 active:scale-95"
                                      >
                                          <Check className="h-4 w-4" /> Create
                                      </button>
                                    </>
                                )}
                            </div>
                        </div>
                    )})
                )}
            </div>
          </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-[100] pb-safe px-2 pt-2">
         <div className="flex justify-around items-center h-16">
            {(['Events', 'Requests', 'Vendors'] as MainTab[]).map(tab => (
               <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex flex-col items-center justify-center w-full h-full space-y-1 relative transition-colors ${
                     activeTab === tab ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
               >
                  <div className={`p-1.5 rounded-full transition-all ${activeTab === tab ? 'bg-emerald-100' : ''}`}>
                     {tab === 'Events' && <LayoutList className="w-5 h-5" />}
                     {tab === 'Requests' && <Bell className="w-5 h-5" />}
                     {tab === 'Vendors' && <Store className="w-5 h-5" />}
                  </div>
                  <span className={`text-[10px] font-bold ${activeTab === tab ? 'text-emerald-700' : 'text-slate-500'}`}>{tab}</span>
                  
                  {/* Badge */}
                  {tab === 'Requests' && pendingRequestsCount > 0 && (
                     <span className={`absolute top-1 right-1/4 h-4 w-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold border-2 border-white`}>
                        {pendingRequestsCount}
                     </span>
                  )}
               </button>
            ))}
         </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @supports (padding-bottom: env(safe-area-inset-bottom)) {
          .pb-safe {
            padding-bottom: env(safe-area-inset-bottom);
          }
        }
      `}} />
    </div>
  );
};

export default Dashboard;
