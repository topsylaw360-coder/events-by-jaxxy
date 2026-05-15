import React, { useState, useEffect } from 'react';
import { Flower2, AlertTriangle } from 'lucide-react';
import Dashboard from './components/Dashboard';
import EventDetail from './components/EventDetail';
import NewEventModal from './components/NewEventModal';
import AuthLanding from './components/AuthLanding';
import GuestPortal from './components/GuestPortal';
import PublicRSVP from './components/PublicRSVP';
import { EventPlan, Guest, Notification, EventRequest, Vendor } from './types';
import { supabase } from './supabaseClient';

// Mock Data
const INITIAL_EVENTS: EventPlan[] = [
  {
    id: '1',
    title: 'Smith & Jones Wedding',
    type: 'Wedding',
    date: '2024-06-15',
    location: 'Emerald Gardens, Napa Valley',
    description: 'A botanical themed outdoor wedding with elegance and charm.',
    imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=2070',
    hasMenu: true,
    menuItems: [
        { id: '1', category: 'Main Meal', name: 'Jollof Rice & Chicken', description: 'Classic smoky party jollof with grilled chicken.' },
        { id: '2', category: 'Main Meal', name: 'Pounded Yam & Egusi', description: 'Soft pounded yam served with rich egusi soup.' },
        { id: '3', category: 'Main Meal', name: 'Fried Rice & Fish', description: 'Savory fried rice paired with spicy croaker fish.' },
        { id: '4', category: 'Starter', name: 'Small Chops Platter', description: 'Puff puff, samosa, and spring rolls.' }
    ],
    hasSeating: true,
    floorDimensions: { width: 50, length: 40, shape: 'rectangle' },
    floorElements: [
        { id: 't1', type: 'table-rect', label: 'Head Table', x: 450, y: 100, width: 200, height: 60, rotation: 0, capacity: 10, guestIds: ['1', '2'] },
        { id: 't2', type: 'table-round', label: 'Family', x: 200, y: 300, width: 80, height: 80, rotation: 0, capacity: 8, guestIds: [] },
        { id: 't3', type: 'table-round', label: 'Friends', x: 700, y: 300, width: 80, height: 80, rotation: 0, capacity: 8, guestIds: [] },
        { id: 's1', type: 'stage', label: 'Band Stage', x: 400, y: 50, width: 250, height: 80, rotation: 0, capacity: 0, guestIds: [] }
    ],
    tables: [],
    tasks: [
      { 
        id: '1', 
        title: 'Book Venue (Emerald Gardens)', 
        description: 'Finalize deposit for Emerald Gardens and sign contract.', 
        timeline: '2024-01-15', 
        completed: true, 
        category: 'Venue',
        estimatedCost: 500000,
        actualCost: 500000,
        paidAmount: 250000,
        stepsTaken: 'Contacted venue, agreed on dates, paid 50% deposit.'
      },
      { 
        id: '2', 
        title: 'Send Invitations', 
        description: 'Mail out physical invites and send digital save-the-dates.', 
        timeline: '2024-03-01', 
        completed: false, 
        category: 'Guests',
        estimatedCost: 50000,
        paidAmount: 0
      },
      { 
        id: '3', 
        title: 'Select Catering Services', 
        description: 'Tasting session with caterer to finalize the buffet options.', 
        timeline: '2024-04-10', 
        completed: false, 
        category: 'Catering',
        estimatedCost: 750000,
        paidAmount: 0
      },
      {
        id: '4',
        title: 'Photography',
        description: 'Hire photographer',
        timeline: '2024-02-01',
        completed: true,
        category: 'Photography',
        estimatedCost: 200000,
        actualCost: 200000,
        paidAmount: 200000,
        stepsTaken: 'Contract signed, full payment made.'
      }
    ],
    guests: [
      { id: '1', name: 'Alice Smith', accessCode: 'AS-2024', email: 'alice@example.com', status: 'Confirmed', plusOneAllowed: true, plusOneName: 'Tom Smith', mealChoice: 'Jollof Rice & Chicken' },
      { id: '2', name: 'Bob Jones', accessCode: 'BJ-999', email: 'bob@example.com', status: 'Invited', plusOneAllowed: false },
    ],
    vendors: [
        { id: 'v1', name: 'Emerald Catering', category: 'Catering', contact: '08012345678', location: 'Lagos Island', rating: '4.8', description: 'Premium local and continental dishes.' },
        { id: 'v2', name: 'Capture Moments', category: 'Photography', contact: '09087654321', location: 'Ikeja', rating: '4.9', description: 'Award winning wedding photography.' }
    ],
    notifications: [
        { id: 'n1', message: 'Alice Smith confirmed attendance.', timestamp: '2024-02-10T10:00:00Z', type: 'rsvp', isRead: false },
        { id: 'n2', message: 'Venue deposit payment reminder.', timestamp: '2024-02-05T09:00:00Z', type: 'alert', isRead: true }
    ],
    isArchived: false
  },
  {
    id: '2',
    title: 'Tech Innovations Seminar',
    type: 'Seminar',
    date: '2024-09-10',
    location: 'Silicon Valley Convention Center',
    description: 'Annual gathering of tech leaders discussing AI futures.',
    imageUrl: 'https://images.unsplash.com/photo-1544531696-60c35eb84300?auto=format&fit=crop&q=80&w=2070',
    hasMenu: false,
    menuItems: [],
    hasSeating: false,
    floorDimensions: { width: 60, length: 50, shape: 'rectangle' },
    floorElements: [],
    tables: [],
    tasks: [
      { 
        id: '1', 
        title: 'Secure Keynote Speaker', 
        description: 'Reach out to top industry leaders for keynote slots.', 
        timeline: '2024-05-20', 
        completed: true, 
        category: 'Program',
        estimatedCost: 100000,
        paidAmount: 100000 
      },
      { 
        id: '2', 
        title: 'Marketing Blast', 
        description: 'Launch social media ad campaign.', 
        timeline: '2024-07-01', 
        completed: false, 
        category: 'Marketing',
        estimatedCost: 50000,
        paidAmount: 0 
      },
      {
        id: '3',
        title: 'Conference Hall Rental',
        description: 'Book Silicon Valley Convention Center',
        timeline: '2024-03-01',
        completed: true,
        category: 'Venue',
        estimatedCost: 1000000,
        actualCost: 1000000,
        paidAmount: 0
      },
      {
        id: '4',
        title: 'AV Equipment',
        description: 'Rent projectors, mics, and lighting',
        timeline: '2024-04-15',
        completed: false,
        category: 'Equipment',
        estimatedCost: 500000,
        paidAmount: 100000
      }
    ],
    guests: [],
    vendors: [],
    notifications: [],
    isArchived: false
  }
];

const INITIAL_REQUESTS: EventRequest[] = [
    {
        id: 'req1',
        clientName: 'Sarah Johnson',
        phone: '555-0123',
        email: 'sarah.j@example.com',
        eventType: 'Wedding',
        budget: 1500000,
        guestCount: 200,
        date: '2025-06-12',
        timestamp: new Date().toISOString(),
        hasMenu: true,
        hasSeating: true,
        status: 'pending'
    }
];

const App: React.FC = () => {
  // Global State
  const [events, setEvents] = useState<EventPlan[]>([]);
  const [eventRequests, setEventRequests] = useState<EventRequest[]>([]);
  const [isSupabaseLoading, setIsSupabaseLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [{ data: eventsData }, { data: reqData }] = await Promise.all([
          supabase.from('app_state').select('value').eq('key', 'jaxy_events').single(),
          supabase.from('app_state').select('value').eq('key', 'jaxy_requests').single()
        ]);
        
        setEvents(eventsData ? eventsData.value : INITIAL_EVENTS);
        setEventRequests(reqData ? reqData.value : INITIAL_REQUESTS);
      } catch (err) {
        console.error("Supabase load error:", err);
        setEvents(INITIAL_EVENTS);
        setEventRequests(INITIAL_REQUESTS);
      } finally {
        setIsSupabaseLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (isSupabaseLoading) return;
    const save = async () => {
      await supabase.from('app_state').upsert({ key: 'jaxy_events', value: events });
    };
    save();
  }, [events, isSupabaseLoading]);

  useEffect(() => {
    if (isSupabaseLoading) return;
    const save = async () => {
      await supabase.from('app_state').upsert({ key: 'jaxy_requests', value: eventRequests });
    };
    save();
  }, [eventRequests, isSupabaseLoading]);

  const [userRole, setUserRole] = useState<'admin' | 'guest' | null>(null);

  // Admin State
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Confirmation Modal State
  const [confirmDialog, setConfirmDialog] = useState<{
      isOpen: boolean;
      title: string;
      message: string;
      actionType: 'reject' | 'delete' | 'archive' | 'default';
      onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', actionType: 'default', onConfirm: () => {} });

  // Guest State
  const [currentGuestId, setCurrentGuestId] = useState<string | null>(null);
  const [guestEventId, setGuestEventId] = useState<string | null>(null);

  // --- Public RSVP Handle ---
  const queryParams = new URLSearchParams(window.location.search);
  const rsvpEventId = queryParams.get('rsvp');

  const handlePublicRsvpSubmit = (eventId: string, guestData: any) => {
      setEvents((events || []).map(e => {
          if (e.id === eventId) {
              const newGuest: Guest = {
                  id: `guest-${Date.now()}`,
                  name: guestData.name,
                  accessCode: guestData.accessCode,
                  email: guestData.email,
                  status: guestData.status,
                  mealChoice: guestData.mealChoice,
                  plusOneAllowed: guestData.plusOneAllowed,
                  plusOneName: guestData.plusOneName
              };
              
              const newNotification: Notification = {
                  id: `notif-${Date.now()}`,
                  message: `${guestData.name} RSVP'd via public link.`,
                  timestamp: new Date().toISOString(),
                  type: 'rsvp',
                  isRead: false
              };

              return {
                  ...e,
                  guests: [...e.guests, newGuest],
                  notifications: [newNotification, ...e.notifications]
              };
          }
          return e;
      }));
  };

  if (rsvpEventId) {
      let publicEvent = (events || []).find(e => e.id === rsvpEventId);
      
      // Fallback if the user opened this in a new tab/browser without localStorage data
      // Because this applet is stateless without a database, we show a preview event.
      if (!publicEvent) {
          publicEvent = {
              id: rsvpEventId,
              title: "Demo Event (Preview Mode)",
              type: "Party",
              date: new Date(Date.now() + 86400000 * 7).toISOString(), 
              location: "The Grand Hall (Preview)",
              description: "This is a preview of the RSVP page. Because this app does not have a backend database yet, events are only saved in your local browser tab. This is how the real RSVP page will look for your guests!",
              imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=2070",
              hasMenu: true,
              menuItems: [
                  { id: '1', category: 'Main Course', name: 'Jollof Rice & Chicken', description: 'Classic party food.' },
                  { id: '2', category: 'Main Course', name: 'Vegetarian Pasta', description: 'Creamy vegan pasta.' }
              ],
              hasSeating: false,
              tables: [],
              tasks: [],
              guests: [],
              budget: [],
              notifications: [],
              isArchived: false,
          };
      }

      if (publicEvent) {
          return <PublicRSVP event={publicEvent} onRsvpSubmit={handlePublicRsvpSubmit} />;
      }
  }

  // --- Handlers ---

  const handleAdminLogin = () => {
    setUserRole('admin');
  };

  const handleGuestLogin = (guest: Guest, eventId: string) => {
    setCurrentGuestId(guest.id);
    setGuestEventId(eventId);
    setUserRole('guest');
  };

  const handleLogout = () => {
    setUserRole(null);
    setSelectedEventId(null);
    setCurrentGuestId(null);
    setGuestEventId(null);
  };

  // --- Confirmation Logic ---
  const triggerConfirm = (title: string, message: string, actionType: 'reject' | 'delete' | 'archive' | 'default', onConfirm: () => void) => {
      setConfirmDialog({
          isOpen: true,
          title,
          message,
          actionType,
          onConfirm
      });
  };

  const closeConfirm = () => {
      setConfirmDialog({ ...confirmDialog, isOpen: false });
  };

  const handleConfirmAction = () => {
      confirmDialog.onConfirm();
      closeConfirm();
  };

  // --- Request Management ---

  const handlePlanRequest = (req: EventRequest) => {
      setEventRequests([req, ...eventRequests]);
  };

  const handleApproveRequest = (req: EventRequest) => {
      // Create new event from request
      const newEvent: EventPlan = {
          id: Date.now().toString(),
          title: `${req.clientName}'s ${req.eventType}`,
          type: req.eventType,
          date: req.date || new Date().toISOString().split('T')[0],
          location: 'TBD',
          description: `Planned for ${req.clientName}.\nContact: ${req.phone}, ${req.email}\nBudget: ₦${req.budget.toLocaleString()}`,
          tasks: [],
          guests: [],
          vendors: [],
          imageUrl: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&q=80&w=2070', // Generic placeholder
          hasMenu: req.hasMenu || false,
          menuItems: [],
          hasSeating: req.hasSeating || false,
          floorDimensions: { width: 50, length: 40, shape: 'rectangle' },
          floorElements: [],
          notifications: [],
          isArchived: false,
          tables: []
      };

      setEvents([newEvent, ...events]);
      // Remove approved request from pending list
      setEventRequests((eventRequests || []).filter(r => r.id !== req.id));
      alert(`Event created for ${req.clientName}!`);
  };

  const handleRejectRequest = (id: string) => {
      triggerConfirm(
          "Reject Request?",
          "Are you sure you want to reject this event request? It will be marked as rejected and removed from pending notifications.",
          "reject",
          () => {
              setEventRequests((eventRequests || []).map(r => r.id === id ? { ...r, status: 'rejected' } : r));
          }
      );
  };

  const handleDeleteRequest = (id: string) => {
      triggerConfirm(
          "Delete Request?",
          "This will permanently delete the request record. This action cannot be undone.",
          "delete",
          () => {
              setEventRequests((eventRequests || []).filter(r => r.id !== id));
          }
      );
  };

  // --- Admin Actions ---

  const handleCreateEvent = (newEvent: EventPlan) => {
    setEvents([newEvent, ...events]);
    setIsModalOpen(false);
  };

  const handleUpdateEvent = (updatedEvent: EventPlan) => {
    setEvents((events || []).map(e => e.id === updatedEvent.id ? updatedEvent : e));
  };

  const handleDeleteEvent = (id: string) => {
      triggerConfirm(
          "Delete Event?",
          "Are you sure you want to permanently delete this event? All data including guests, budget, and tasks will be lost.",
          "delete",
          () => {
              setEvents((events || []).filter(e => e.id !== id));
              setSelectedEventId(null);
          }
      );
  };

  const handleArchiveEvent = (id: string) => {
      setEvents((events || []).map(e => e.id === id ? { ...e, isArchived: true } : e));
  };

  const handleAddVendorToEvent = (eventId: string, vendor: Vendor) => {
      // Ensure vendor has ID if coming from AI result
      const newVendor = { ...vendor, id: vendor.id || `v-${Date.now()}` };
      
      setEvents((events || []).map(e => {
          if (e.id === eventId) {
              return { ...e, vendors: [...(e.vendors || []), newVendor] };
          }
          return e;
      }));
      alert(`Added ${vendor.name} to event!`);
  };

  // --- Guest Actions ---

  const handleUpdateGuest = (updatedGuest: Guest) => {
    if (!guestEventId) return;

    setEvents((events || []).map(event => {
      if (event.id === guestEventId) {
        // Find previous guest state to compare
        const oldGuest = event.guests.find(g => g.id === updatedGuest.id);
        
        let newNotification: Notification | null = null;
        
        if (oldGuest) {
            if (oldGuest.status !== updatedGuest.status) {
                newNotification = {
                    id: Date.now().toString(),
                    message: `${updatedGuest.name} updated RSVP to ${updatedGuest.status}`,
                    timestamp: new Date().toISOString(),
                    type: 'rsvp',
                    isRead: false
                };
            } else if (oldGuest.mealChoice !== updatedGuest.mealChoice) {
                newNotification = {
                    id: Date.now().toString(),
                    message: `${updatedGuest.name} changed meal to ${updatedGuest.mealChoice}`,
                    timestamp: new Date().toISOString(),
                    type: 'info',
                    isRead: false
                };
            } else if (oldGuest.dietaryNotes !== updatedGuest.dietaryNotes && updatedGuest.dietaryNotes) {
                newNotification = {
                    id: Date.now().toString(),
                    message: `${updatedGuest.name} added dietary note: "${updatedGuest.dietaryNotes}"`,
                    timestamp: new Date().toISOString(),
                    type: 'alert',
                    isRead: false
                };
            }
        }

        const newNotifications = newNotification 
            ? [newNotification, ...event.notifications] 
            : event.notifications;

        return {
          ...event,
          guests: (event.guests || []).map(g => g.id === updatedGuest.id ? updatedGuest : g),
          notifications: newNotifications
        };
      }
      return event;
    }));
  };

  // --- RENDER LOGIC ---

  if (isSupabaseLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <Flower2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
          <p className="text-gray-600 font-medium">Connecting to Supabase...</p>
        </div>
      </div>
    );
  }

  // 1. Unauthenticated -> Login Screen
  if (!userRole) {
    return (
      <AuthLanding 
        events={events} 
        onAdminLogin={handleAdminLogin}
        onGuestLogin={handleGuestLogin}
        onPlanRequest={handlePlanRequest}
      />
    );
  }

  // 2. Guest View
  if (userRole === 'guest' && guestEventId && currentGuestId) {
    const event = (events || []).find(e => e.id === guestEventId);
    const guest = event?.guests.find(g => g.id === currentGuestId);

    if (event && guest) {
        return (
            <GuestPortal 
                event={event} 
                guest={guest} 
                onUpdateGuest={handleUpdateGuest}
                onLogout={handleLogout}
            />
        );
    } else {
        // Fallback if data sync issue
        handleLogout();
        return null;
    }
  }

  // 3. Admin View (Dashboard / Detail)
  if (userRole === 'admin') {
    const activeEvent = (events || []).find(e => e.id === selectedEventId);

    return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-emerald-200 relative">
        
        {activeEvent ? (
          <EventDetail 
            event={activeEvent} 
            onBack={() => setSelectedEventId(null)}
            onUpdateEvent={handleUpdateEvent}
            onDeleteEvent={handleDeleteEvent}
          />
        ) : (
          <main className="max-w-7xl mx-auto p-4 md:p-8">
             {/* Top Navigation Bar */}
             <div className="flex items-center justify-between mb-8 sticky top-0 z-20 bg-slate-50/80 backdrop-blur-md py-4">
                <div className="flex items-center gap-3">
                   {/* Logo Graphic Small */}
                   <div className="relative h-10 w-8 flex items-center justify-center text-emerald-600">
                      <div className="absolute inset-x-1 top-0 bottom-0 border border-current rounded-full"></div>
                      <div className="absolute inset-x-0 top-1/2 border-t border-current"></div>
                      <div className="absolute inset-y-0 left-1/2 border-l border-current"></div>
                      <div className="relative z-10 bg-slate-50 p-0.5">
                          <Flower2 className="h-4 w-4" />
                      </div>
                   </div>
                   <span className="text-2xl font-cursive font-bold text-slate-800">Events By Jaxy</span>
                </div>
                <div className="flex items-center gap-4">
                   <div className="hidden md:flex items-center gap-2 text-sm font-medium text-emerald-800 bg-emerald-100/50 px-3 py-1 rounded-full">
                      <span>Admin Mode</span>
                   </div>
                   <button onClick={handleLogout} className="text-sm font-medium text-slate-500 hover:text-red-500">
                      Logout
                   </button>
                   <div className="h-8 w-8 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm">
                      <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" />
                   </div>
                </div>
             </div>
  
             <Dashboard 
                events={events}
                requests={eventRequests} 
                onSelectEvent={(e) => setSelectedEventId(e.id)} 
                onNewEvent={() => setIsModalOpen(true)}
                onArchiveEvent={handleArchiveEvent}
                onDeleteEvent={handleDeleteEvent}
                onApproveRequest={handleApproveRequest}
                onRejectRequest={handleRejectRequest}
                onDeleteRequest={handleDeleteRequest}
                onAddVendorToEvent={handleAddVendorToEvent}
             />
          </main>
        )}
  
        {isModalOpen && (
          <NewEventModal 
            onClose={() => setIsModalOpen(false)} 
            onCreate={handleCreateEvent} 
          />
        )}

        {/* Global Confirmation Modal */}
        {confirmDialog.isOpen && (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200 pb-safe">
                    <div className={`h-14 w-14 rounded-full flex items-center justify-center mb-4 mx-auto ${confirmDialog.actionType === 'delete' || confirmDialog.actionType === 'reject' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                        <AlertTriangle className="h-7 w-7" />
                    </div>
                    <h3 className="text-xl font-bold text-center text-slate-900 mb-2">{confirmDialog.title}</h3>
                    <p className="text-sm text-slate-500 text-center mb-6 leading-relaxed">
                        {confirmDialog.message}
                    </p>
                    <div className="flex gap-3">
                        <button 
                            onClick={closeConfirm}
                            className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleConfirmAction}
                            className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg transition-colors ${
                                confirmDialog.actionType === 'delete' || confirmDialog.actionType === 'reject'
                                ? 'bg-red-600 hover:bg-red-700 shadow-red-200' 
                                : 'bg-slate-800 hover:bg-slate-900'
                            }`}
                        >
                            Yes, {confirmDialog.actionType === 'reject' ? 'Reject' : 'Delete'}
                        </button>
                    </div>
                </div>
            </div>
        )}
  
      </div>
    );
  }

  return null;
};

export default App;