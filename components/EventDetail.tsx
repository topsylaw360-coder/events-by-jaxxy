import React, { useState } from 'react';
import { 
  ArrowLeft, CheckSquare, Users, DollarSign, Sparkles, 
  Trash2, PlusCircle, Check, X, Clock, Utensils, QrCode, 
  Download, Edit2, Pencil, FileText, Calendar as CalendarIcon,
  Armchair, UserPlus, Grid, Image as ImageIcon, Palette, Bell, Mail, AlertTriangle,
  Store, MapPin, Phone, Star
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EventPlan, Task, Guest, BudgetItem, AIPlanSuggestion, MenuItem, Vendor, Notification } from '../types';
import { generateEventSuggestions, findVendors } from '../services/geminiService';
import FlyerGenerator from './FlyerGenerator';
import QRScanner from './QRScanner';
import FloorPlanEditor from './FloorPlanEditor';

interface EventDetailProps {
  event: EventPlan;
  onBack: () => void;
  onUpdateEvent: (updatedEvent: EventPlan) => void;
  onDeleteEvent: (id: string) => void;
}

const EventDetail: React.FC<EventDetailProps> = ({ event, onBack, onUpdateEvent, onDeleteEvent }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'inbox' | 'tasks' | 'guests' | 'budget' | 'menu' | 'seating' | 'design' | 'vendors'>('overview');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // -- Modal States --
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  
  // -- Guest Editing State --
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [guestForm, setGuestForm] = useState({ name: '', code: '', email: '', plusOne: true });

  // -- Budget Editing State --
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [budgetForm, setBudgetForm] = useState({ name: '', qty: '', cost: '', paid: '' });

  // -- Menu Editing State --
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [menuForm, setMenuForm] = useState({ name: '', description: '', category: '' });

  // -- Task & Budget Editing State --
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState({ 
    title: '', description: '', timeline: '', category: '',
    estimatedCost: '', actualCost: '', paidAmount: '', stepsTaken: '' 
  });

  // -- Vendor Editing State --
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [vendorForm, setVendorForm] = useState({ name: '', category: '', contact: '', location: '', description: '' });
  
  // -- Smart Vendor Search (Inside Vendor Tab) --
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');
  const [isSearchingVendors, setIsSearchingVendors] = useState(false);
  const [foundVendors, setFoundVendors] = useState<Vendor[]>([]);

  // -- Derived Stats --
  const completedTasks = (event.tasks || []).filter(t => t.completed).length;
  const totalTasks = (event.tasks || []).length;
  const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  
  const confirmedGuests = (event.guests || []).filter(g => g.status === 'Confirmed').length;
  const unreadNotifications = (event.notifications || []).filter(n => !n.isRead).length;
  
  const totalBudget = event.tasks.reduce((acc, item) => acc + (item.estimatedCost || item.actualCost || 0), 0);
  const totalPaid = event.tasks.reduce((acc, item) => acc + (item.paidAmount || 0), 0);
  const formattedDate = new Date(event.date).toLocaleDateString('en-GB').replace(/\//g, '-');

  // --- Handlers: Notifications ---
  const markAllRead = () => {
    const updatedNotifications = (event.notifications || []).map(n => ({...n, isRead: true}));
    onUpdateEvent({...event, notifications: updatedNotifications});
  };

  const deleteNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigating when deleting
    const updatedNotifications = (event.notifications || []).filter(n => n.id !== id);
    onUpdateEvent({...event, notifications: updatedNotifications});
  };

  const handleNotificationClick = (n: Notification) => {
      // Mark as read immediately
      if (!n.isRead) {
          const updatedNotifications = (event.notifications || []).map(notif => 
              notif.id === n.id ? { ...notif, isRead: true } : notif
          );
          onUpdateEvent({ ...event, notifications: updatedNotifications });
      }

      // Smart Navigation Logic
      const msg = n.message.toLowerCase();
      
      if (n.type === 'rsvp' || msg.includes('rsvp') || msg.includes('guest') || msg.includes('confirmed') || msg.includes('declined') || msg.includes('attendance')) {
          setActiveTab('guests');
      } else if (msg.includes('budget') || msg.includes('payment') || msg.includes('cost') || msg.includes('deposit') || msg.includes('invoice')) {
          setActiveTab('budget');
      } else if (msg.includes('task') || msg.includes('checklist') || msg.includes('reminder')) {
          setActiveTab('tasks');
      } else if (msg.includes('menu') || msg.includes('food') || msg.includes('dietary') || msg.includes('meal')) {
          setActiveTab('menu');
      } else if (msg.includes('vendor') || msg.includes('catering') || msg.includes('photo') || msg.includes('dj')) {
          setActiveTab('vendors');
      }
  };

  // --- Handlers: Tasks ---
  const toggleTask = (taskId: string) => {
    const updatedTasks = (event.tasks || []).map(t => 
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    onUpdateEvent({ ...event, tasks: updatedTasks });
  };

  const openAddTask = () => {
      setEditingTask(null);
      setTaskForm({ title: '', description: '', timeline: '', category: 'General', estimatedCost: '', actualCost: '', paidAmount: '', stepsTaken: '' });
      setShowTaskModal(true);
  };

  const openEditTask = (task: Task) => {
      setEditingTask(task);
      setTaskForm({ 
          title: task.title, 
          description: task.description || '', 
          timeline: task.timeline || '', 
          category: task.category || 'General',
          estimatedCost: task.estimatedCost ? task.estimatedCost.toString() : '',
          actualCost: task.actualCost ? task.actualCost.toString() : '',
          paidAmount: task.paidAmount ? task.paidAmount.toString() : '',
          stepsTaken: task.stepsTaken || ''
      });
      setShowTaskModal(true);
  };

  const handleDeleteTask = (taskId: string) => {
      if (confirm('Delete this task?')) {
          const updatedTasks = (event.tasks || []).filter(t => t.id !== taskId);
          onUpdateEvent({ ...event, tasks: updatedTasks });
      }
  };

  const handleTaskSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(!taskForm.title) return;

      const newTaskData = {
          title: taskForm.title,
          description: taskForm.description,
          timeline: taskForm.timeline,
          category: taskForm.category,
          estimatedCost: taskForm.estimatedCost ? parseFloat(taskForm.estimatedCost) : undefined,
          actualCost: taskForm.actualCost ? parseFloat(taskForm.actualCost) : undefined,
          paidAmount: taskForm.paidAmount ? parseFloat(taskForm.paidAmount) : undefined,
          stepsTaken: taskForm.stepsTaken
      };

      if(editingTask) {
          const updatedTasks = (event.tasks || []).map(t => 
            t.id === editingTask.id ? { ...t, ...newTaskData } : t
          );
          onUpdateEvent({ ...event, tasks: updatedTasks });
      } else {
          const newTask: Task = {
              id: Date.now().toString(),
              completed: false,
              ...newTaskData
          };
          onUpdateEvent({ ...event, tasks: [...event.tasks, newTask] });
      }
      setShowTaskModal(false);
  };

  // --- Handlers: Guest Management ---
  const openAddGuest = () => {
    setEditingGuest(null);
    setGuestForm({ name: '', code: '', email: '', plusOne: true });
    setShowGuestModal(true);
  };

  const openEditGuest = (guest: Guest) => {
    setEditingGuest(guest);
    setGuestForm({ 
        name: guest.name, 
        code: guest.accessCode, 
        email: guest.email,
        plusOne: guest.plusOneAllowed 
    });
    setShowGuestModal(true);
  };

  const handleDeleteGuest = (guestId: string) => {
    if (confirm('Are you sure you want to remove this guest?')) {
        const updatedGuests = (event.guests || []).filter(g => g.id !== guestId);
        
        // Also remove from any floor elements
        const updatedElements = (event.floorElements || []).map(el => ({
             ...el,
             guestIds: (el.guestIds || []).filter(gid => gid !== guestId)
        }));

        onUpdateEvent({ ...event, guests: updatedGuests, floorElements: updatedElements });
    }
  };

  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestForm.name || !guestForm.code) return;

    if (editingGuest) {
        // Update existing
        const updatedGuests = (event.guests || []).map(g => 
            g.id === editingGuest.id ? { 
                ...g, 
                name: guestForm.name, 
                accessCode: guestForm.code, 
                email: guestForm.email,
                plusOneAllowed: guestForm.plusOne 
            } : g
        );
        onUpdateEvent({ ...event, guests: updatedGuests });
    } else {
        // Create new
        const newGuest: Guest = { 
            id: Date.now().toString(), 
            name: guestForm.name,
            accessCode: guestForm.code, 
            email: guestForm.email, 
            status: 'Invited',
            plusOneAllowed: guestForm.plusOne 
        };
        onUpdateEvent({ ...event, guests: [...event.guests, newGuest] });
    }
    setShowGuestModal(false);
  };

  const downloadTicket = (guest: Guest) => {
      // Replicates the ticket generation logic from GuestPortal with synced format
      const qrDetails = [
          `JAXY TICKET`,
          `Code: ${guest.accessCode}`,
          `Event: ${event.title}`,
          `Guest: ${guest.name}`,
          guest.plusOneAllowed ? `Plus One: ${guest.plusOneName || 'Yes (Name Pending)'}` : 'Plus One: No',
          `Meal: ${guest.mealChoice || 'Not Selected'}`
      ].join('\n');

      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrDetails)}`;

      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a5' });

      // Background
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, 148, 210, 'F');
      
      // Header Bar
      doc.setFillColor(5, 150, 105);
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

  // --- Handlers: Menu Management ---
  const openAddMenuItem = () => {
    setEditingMenuItem(null);
    setMenuForm({ name: '', description: '', category: 'Main Meal' });
    setShowMenuModal(true);
  };

  const openEditMenuItem = (item: MenuItem) => {
    setEditingMenuItem(item);
    setMenuForm({
        name: item.name,
        description: item.description || '',
        category: item.category || 'Main Meal'
    });
    setShowMenuModal(true);
  };

  const handleDeleteMenuItem = (itemId: string) => {
      if(confirm('Remove this item from the menu?')) {
          const updatedMenu = (event.menuItems || []).filter(m => m.id !== itemId);
          onUpdateEvent({ ...event, menuItems: updatedMenu });
      }
  };

  const handleMenuSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(!menuForm.name) return;

      const itemData = {
          name: menuForm.name,
          description: menuForm.description,
          category: menuForm.category
      };

      if(editingMenuItem) {
          const updatedMenu = (event.menuItems || []).map(m => 
            m.id === editingMenuItem.id ? { ...m, ...itemData } : m
          );
          onUpdateEvent({ ...event, menuItems: updatedMenu });
      } else {
          const newItem: MenuItem = {
              id: Date.now().toString(),
              ...itemData
          };
          onUpdateEvent({ ...event, menuItems: [...(event.menuItems || []), newItem] });
      }
      setShowMenuModal(false);
  };

  // --- Handlers: Vendor Management ---
  const openAddVendor = () => {
      setEditingVendor(null);
      setVendorForm({ name: '', category: 'Catering', contact: '', location: '', description: '' });
      setShowVendorModal(true);
  };

  const openEditVendor = (v: Vendor) => {
      setEditingVendor(v);
      setVendorForm({
          name: v.name,
          category: v.category,
          contact: v.contact,
          location: v.location,
          description: v.description
      });
      setShowVendorModal(true);
  };

  const handleDeleteVendor = (id: string) => {
      if(confirm('Remove this vendor from the event?')) {
          const updatedVendors = (event.vendors || []).filter(v => v.id !== id);
          onUpdateEvent({ ...event, vendors: updatedVendors });
      }
  };

  const handleVendorSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(!vendorForm.name) return;

      const vendorData = { ...vendorForm, rating: editingVendor?.rating || 'N/A' };

      if(editingVendor) {
          const updatedVendors = (event.vendors || []).map(v => 
              v.id === editingVendor.id ? { ...v, ...vendorData } : v
          );
          onUpdateEvent({ ...event, vendors: updatedVendors });
      } else {
          const newVendor: Vendor = {
              id: `v-${Date.now()}`,
              ...vendorData,
              rating: 'N/A'
          };
          onUpdateEvent({ ...event, vendors: [...(event.vendors || []), newVendor] });
      }
      setShowVendorModal(false);
  };

  const handleSmartVendorSearch = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!vendorSearchQuery) return;
      setIsSearchingVendors(true);
      setFoundVendors([]);
      const results = await findVendors(vendorSearchQuery);
      setFoundVendors(results);
      setIsSearchingVendors(false);
  };

  const addSmartVendor = (v: Vendor) => {
      const newVendor = { ...v, id: `v-${Date.now()}-${Math.random()}` };
      onUpdateEvent({ ...event, vendors: [...(event.vendors || []), newVendor] });
      alert(`${v.name} added to your vendor list!`);
  };
  
  // PDF Exports
  const generateGuestListPDF = () => {
    const doc = new jsPDF();
    
    // Professional Header
    doc.setFillColor(6, 78, 59); // Emerald 900
    doc.rect(0, 0, 210, 40, 'F');
    
    // Logo/Brand Text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Events By Jaxy", 14, 20);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Official Guest List", 14, 28);
    
    // Event Details Section
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(event.title, 14, 55);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${formattedDate}`, 14, 62);
    doc.text(`Location: ${event.location}`, 14, 67);
    doc.text(`Total Guests: ${event.guests.length}`, 14, 72);

    // Helper to find seat
    const findSeat = (guestId: string) => {
        if (!event.floorElements) return "";
        const table = event.floorElements.find(el => el.guestIds && el.guestIds.includes(guestId));
        return table ? table.label : "";
    };

    const tableData = (event.guests || []).map(g => {
        const seat = findSeat(g.id);
        const meal = g.mealChoice || "";
        
        return [
            g.name,
            g.status.toUpperCase(),
            seat, // Shows label if seated, empty if not
            meal, // Shows meal if selected, empty if not
            g.plusOneAllowed ? (g.plusOneName || "Yes (+1)") : "No",
            g.dietaryNotes || ""
        ];
    });

    autoTable(doc, {
        head: [['Guest Name', 'Status', 'Seating', 'Meal Choice', 'Plus One', 'Notes']],
        body: tableData,
        startY: 80,
        theme: 'grid',
        headStyles: { fillColor: [6, 78, 59], textColor: 255 }, // Match header emerald
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
            0: { fontStyle: 'bold' }, // Name
            5: { fontStyle: 'italic', textColor: 100 } // Notes
        }
    });
    
    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount}`, 196, 285, { align: 'right' });
        doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 285);
    }
    
    doc.save(`guest_list_${(event.title || "").replace(/\s+/g, '_')}.pdf`);
  };

  const generateBudgetExport = (mode: 'invoice' | 'draft') => {
    const doc = new jsPDF();
    
    if (mode === 'invoice') {
        // Header
        doc.setFillColor(5, 150, 105); // Emerald 600
        doc.rect(0, 0, 210, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.text("Events By Jaxy", 14, 20);
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text("Official Budget Invoice", 14, 28);

        doc.setTextColor(50, 50, 50);
        doc.setFontSize(14);
        doc.text(`Event: ${event.title}`, 14, 55);
    } else {
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(14);
        doc.text(`Draft Sheet - ${event.title}`, 14, 20);
    }
    
    const startY = mode === 'invoice' ? 62 : 30;

    doc.setFontSize(10);
    doc.text(`Date: ${formattedDate}`, 14, startY);
    doc.text(`Total Budget: ${totalBudget.toLocaleString()}`, 14, startY + 6);
    doc.text(`Paid to Date: ${totalPaid.toLocaleString()}`, 14, startY + 12);

    // Table
    const tableData = event.tasks
        .filter(t => (t.estimatedCost || 0) > 0 || (t.actualCost || 0) > 0 || (t.paidAmount || 0) > 0)
        .map(item => [
            item.title,
            (item.estimatedCost || 0).toLocaleString(),
            (item.actualCost || 0).toLocaleString(),
            (item.paidAmount || 0).toLocaleString(),
            ((item.actualCost || item.estimatedCost || 0) - (item.paidAmount || 0)).toLocaleString()
        ]);

    autoTable(doc, {
        head: [['Task/Item', 'Estimated', 'Actual', 'Paid', 'Balance']],
        body: tableData,
        startY: startY + 20,
        theme: mode === 'invoice' ? 'grid' : 'plain',
        headStyles: mode === 'invoice' ? { fillColor: [5, 150, 105] } : undefined,
        styles: { fontSize: 10 },
        foot: [['Total', '', '', totalPaid.toLocaleString(), (totalBudget - totalPaid).toLocaleString()]]
    });

    if (mode === 'invoice') {
        // Stamp
        const finalY = (doc as any).lastAutoTable.finalY + 30;
        doc.setDrawColor(5, 150, 105);
        doc.setLineWidth(1);
        doc.circle(170, finalY, 15);
        doc.setFontSize(8);
        doc.setTextColor(5, 150, 105);
        doc.text("APPROVED", 162, finalY);
        doc.text("EVENTS BY JAXY", 158, finalY + 4);
        doc.save(`Invoice_${(event.title || "").replace(/\s+/g, '_')}.pdf`);
    } else {
        doc.save(`DraftSheet_${(event.title || "").replace(/\s+/g, '_')}.pdf`);
    }
  };

  // --- Handlers: AI ---
  const [aiError, setAiError] = useState<string | null>(null);

  const handleAiPlan = async () => {
    try {
        setIsGenerating(true);
        setAiError(null);
        const suggestion = await generateEventSuggestions(
            event.type,
            event.description || "A standard event",
            event.guests.length > 0 ? event.guests.length : 50,
            totalBudget > 0 ? totalBudget : 500000
        );

        if (suggestion) {
            const newTasks: Task[] = (suggestion.tasks || []).map((t, i) => ({
                id: `ai-task-${Date.now()}-${i}`,
                title: t,
                completed: false,
                category: 'AI Generated'
            }));
            
            const newBudgetTasks: Task[] = (suggestion.budgetAdvice || []).map((b, i) => ({
                id: `ai-budget-${Date.now()}-${i}`,
                title: b.category,
                estimatedCost: b.amount,
                paidAmount: 0,
                completed: false,
                category: 'Budget Allocation'
            }));

            onUpdateEvent({
                ...event,
                description: `${event.description}\n\nTheme Idea: ${suggestion.theme}`,
                tasks: [...(event.tasks || []), ...newTasks, ...newBudgetTasks]
            });
        } else {
            setAiError("Failed to generate plan. Please try again.");
        }
    } catch (e) {
        setAiError(e instanceof Error ? e.message : String(e));
    } finally {
        setIsGenerating(false);
    }
  };

  const handleScanSuccess = (guest: Guest) => {
      // Mark as arrived? 
      const updatedGuests = (event.guests || []).map(g => g.id === guest.id ? { ...g, hasArrived: true } : g);
      onUpdateEvent({ ...event, guests: updatedGuests });
      alert(`Guest Check-in Successful: ${guest.name}`);
  };

  const TabButton = ({ id, label, icon: Icon, badge }: any) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-all border-b-2 whitespace-nowrap relative ${
        activeTab === id 
          ? 'border-emerald-600 text-emerald-800' 
          : 'border-transparent text-slate-500 hover:text-emerald-600 hover:bg-emerald-50/50'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
      {badge > 0 && (
          <span className="absolute top-1 right-2 h-4 w-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full">
              {badge}
          </span>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 animate-in fade-in zoom-in-95 duration-300 relative">
      
      {/* Header Image & Actions */}
      <div className="relative h-64 md:h-80 w-full overflow-hidden">
        <img 
          src={event.imageUrl} 
          alt={event.title} 
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-emerald-950/60" />
        <div className="absolute inset-0 flex flex-col justify-between p-6 md:p-10 text-white">
          <div className="flex justify-between items-start">
             <button 
                onClick={onBack}
                className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur-md transition hover:bg-white/20"
             >
                <ArrowLeft className="h-4 w-4" /> Back
             </button>
             <div className="flex gap-2">
                 <button 
                    onClick={() => setShowScanner(true)}
                    className="flex items-center gap-2 rounded-full bg-white text-emerald-900 px-4 py-2 font-bold hover:bg-emerald-50 backdrop-blur-md shadow-lg"
                 >
                    <QrCode className="h-4 w-4" /> Scan Guests
                 </button>
                 <button 
                    onClick={() => onDeleteEvent(event.id)}
                    className="rounded-full bg-red-500/80 p-2 text-white hover:bg-red-600 backdrop-blur-md"
                 >
                    <Trash2 className="h-5 w-5" />
                 </button>
             </div>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2">
                <span className="bg-emerald-500 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{event.type}</span>
                <span className="flex items-center gap-1 text-emerald-200 text-sm"><Clock className="h-3 w-3" /> {formattedDate}</span>
                {event.isArchived && <span className="bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-bold">ARCHIVED</span>}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold">{event.title}</h1>
            <p className="mt-2 max-w-2xl text-emerald-100 opacity-90">{event.description || "No description provided."}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-30 bg-white shadow-sm border-b border-slate-200">
         <div className="flex overflow-x-auto no-scrollbar max-w-6xl mx-auto px-4">
            <TabButton id="overview" label="Overview" icon={Sparkles} />
            <TabButton id="inbox" label="Inbox" icon={Bell} badge={unreadNotifications} />
            <TabButton id="tasks" label="Checklist & Budget" icon={CheckSquare} />
            <TabButton id="guests" label="Guest List" icon={Users} />
            <TabButton id="vendors" label="Vendors" icon={Store} />
            {event.hasMenu && <TabButton id="menu" label="Menu" icon={Utensils} />}
            {event.hasSeating && <TabButton id="seating" label="Floor Plan" icon={Armchair} />}
            <TabButton id="design" label="Design Flyer" icon={Palette} />
         </div>
      </div>

      {/* Content Area */}
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* AI Assistant Card */}
            <div className="col-span-full bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
               <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="h-6 w-6 text-yellow-300" /> Gemini Planner</h2>
                  <p className="mt-2 text-emerald-100 max-w-lg">
                    Need help? Let our AI analyze your event details to generate a complete schedule, budget, and checklist.
                  </p>
                  {aiError && (
                      <p className="mt-4 text-red-200 text-sm font-medium p-3 bg-red-900/30 rounded-xl inline-block border border-red-500/30 w-full">
                          <AlertTriangle className="inline h-4 w-4 mr-2 mb-0.5" />
                          {aiError}
                      </p>
                  )}
               </div>
               <button 
                 onClick={handleAiPlan}
                 disabled={isGenerating}
                 className="whitespace-nowrap rounded-full bg-white text-emerald-700 px-6 py-3 font-bold hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-70"
               >
                 {isGenerating ? "Thinking..." : "Auto-Plan Event"}
               </button>
            </div>

            {/* Stats Cards */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-2">Checklist</h3>
                <div className="flex items-end gap-2">
                    <span className="text-4xl font-bold text-slate-900">{progress}%</span>
                    <span className="text-slate-400 mb-1">complete</span>
                </div>
                <div className="mt-4 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-2">Confirmed Guests</h3>
                <div className="flex items-end gap-2">
                    <span className="text-4xl font-bold text-slate-900">{confirmedGuests}</span>
                    <span className="text-slate-400 mb-1">/ {event.guests.length}</span>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-2">Total Budget</h3>
                <div className="flex items-end gap-2">
                    <span className="text-4xl font-bold text-slate-900">₦{totalBudget.toLocaleString()}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                    Outstanding: ₦{(totalBudget - totalPaid).toLocaleString()}
                </p>
            </div>
          </div>
        )}

        {/* INBOX TAB */}
        {activeTab === 'inbox' && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Mail className="h-5 w-5 text-emerald-600" /> Event Inbox
                    </h2>
                    {unreadNotifications > 0 && (
                        <button 
                            onClick={markAllRead} 
                            className="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition"
                        >
                            Mark all as read
                        </button>
                    )}
                </div>
                <div className="divide-y divide-slate-100">
                    {(event.notifications || []).length === 0 ? (
                         <div className="p-16 text-center text-slate-400 flex flex-col items-center">
                             <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                <Bell className="h-8 w-8 text-slate-300" />
                             </div>
                             <p>No updates yet.</p>
                         </div>
                    ) : (
                        (event.notifications || []).map(n => (
                            <div 
                                key={n.id} 
                                onClick={() => handleNotificationClick(n)}
                                className={`p-6 flex items-start gap-4 hover:bg-slate-50 transition-colors cursor-pointer group ${!n.isRead ? 'bg-emerald-50/30' : ''}`}
                            >
                                <div className={`h-2 w-2 mt-2 rounded-full flex-shrink-0 ${!n.isRead ? 'bg-emerald-500' : 'bg-transparent'}`} />
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <p className={`text-sm ${!n.isRead ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
                                            {n.message}
                                        </p>
                                        <span className="text-xs text-slate-400 whitespace-nowrap ml-4">
                                            {new Date(n.timestamp).toLocaleDateString()} {new Date(n.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                    </div>
                                    <div className="mt-2">
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                            n.type === 'rsvp' ? 'bg-blue-100 text-blue-700' :
                                            n.type === 'alert' ? 'bg-red-100 text-red-700' :
                                            'bg-slate-100 text-slate-600'
                                        }`}>
                                            {n.type}
                                        </span>
                                    </div>
                                </div>
                                <button 
                                    onClick={(e) => deleteNotification(n.id, e)}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        )}

        {/* VENDORS TAB */}
        {activeTab === 'vendors' && (
            <div className="space-y-8">
                {/* My Vendors List */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Hired Vendors</h2>
                            <p className="text-sm text-slate-500">Manage the professionals for your big day.</p>
                        </div>
                        <button 
                            onClick={openAddVendor}
                            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-full text-sm hover:bg-emerald-700 transition"
                        >
                            <PlusCircle className="h-4 w-4" /> Add Vendor
                        </button>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {(!event.vendors || event.vendors.length === 0) ? (
                            <div className="p-10 text-center text-slate-400">No vendors added yet.</div>
                        ) : (
                            (event.vendors || []).map(vendor => (
                                <div key={vendor.id} className="p-6 flex flex-col sm:flex-row gap-4 items-start hover:bg-slate-50 transition group">
                                    <div className="h-12 w-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-lg">
                                        {vendor.name.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-slate-800 text-lg">{vendor.name}</h3>
                                                <span className="text-xs uppercase font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{vendor.category}</span>
                                            </div>
                                            {vendor.rating !== 'N/A' && (
                                                <span className="flex items-center gap-1 text-amber-500 text-sm font-bold bg-amber-50 px-2 py-1 rounded-full">
                                                    <Star className="h-3.5 w-3.5 fill-current" /> {vendor.rating}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-500 mt-2">{vendor.description}</p>
                                        <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-600">
                                            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full">
                                                <MapPin className="h-3.5 w-3.5 text-slate-400" /> {vendor.location}
                                            </div>
                                            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full">
                                                <Phone className="h-3.5 w-3.5 text-slate-400" /> {vendor.contact}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => openEditVendor(vendor)}
                                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteVendor(vendor.id)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Smart Finder Section */}
                <div className="bg-indigo-50 rounded-3xl p-8 border border-indigo-100">
                    <div className="max-w-3xl mx-auto">
                        <div className="text-center mb-6">
                            <h3 className="text-2xl font-bold text-indigo-900 mb-2 flex items-center justify-center gap-2">
                                <Sparkles className="h-6 w-6 text-indigo-500" />
                                Smart Vendor Finder
                            </h3>
                            <p className="text-indigo-700/70">
                                Need to find a vendor? Describe what you need and our AI will search for real local businesses for you.
                            </p>
                        </div>

                        <form onSubmit={handleSmartVendorSearch} className="relative mb-8">
                            <input 
                                type="text"
                                value={vendorSearchQuery}
                                onChange={(e) => setVendorSearchQuery(e.target.value)}
                                placeholder="e.g. Affordable DJ in Lagos for a wedding..."
                                className="w-full pl-6 pr-32 py-4 rounded-2xl border-2 border-indigo-200 focus:border-indigo-500 focus:outline-none shadow-sm"
                            />
                            <button 
                                type="submit"
                                disabled={isSearchingVendors || !vendorSearchQuery}
                                className="absolute right-2 top-2 bottom-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 rounded-xl font-bold transition-all disabled:opacity-70 flex items-center gap-2"
                            >
                                {isSearchingVendors ? "Searching..." : "Find"}
                            </button>
                        </form>

                        {foundVendors.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {foundVendors.map((v, idx) => (
                                    <div key={idx} className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm hover:shadow-md transition">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-slate-800">{v.name}</h4>
                                            <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-bold">{v.category}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mb-3 line-clamp-2">{v.description}</p>
                                        <div className="text-xs text-slate-600 space-y-1 mb-4">
                                            <div className="flex items-center gap-1"><MapPin className="h-3 w-3"/> {v.location}</div>
                                            <div className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-500"/> {v.rating}</div>
                                        </div>
                                        <button 
                                            onClick={() => addSmartVendor(v)}
                                            className="w-full py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition flex items-center justify-center gap-1"
                                        >
                                            <PlusCircle className="h-3 w-3" /> Add to Event
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* TASKS & BUDGET TAB */}
        {activeTab === 'tasks' && (
           <div className="space-y-6">
              {/* Summary Header */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Estimated</span>
                      <span className="text-2xl font-bold text-slate-800">₦{totalBudget.toLocaleString()}</span>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Paid</span>
                      <span className="text-2xl font-bold text-emerald-600">₦{totalPaid.toLocaleString()}</span>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Balance</span>
                      <span className="text-2xl font-bold text-amber-500">₦{(totalBudget - totalPaid).toLocaleString()}</span>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Task Progress</span>
                      <span className="text-2xl font-bold text-slate-800">{progress}%</span>
                  </div>
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                   <h2 className="text-xl font-bold text-slate-800">Checklist & Budget</h2>
                   <div className="flex flex-wrap gap-2">
                       <button 
                         onClick={() => generateBudgetExport('invoice')}
                         className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2 rounded-full text-sm hover:bg-slate-200 transition font-medium"
                       >
                         <FileText className="h-4 w-4" /> Invoice PDF
                       </button>
                       <button 
                         onClick={() => generateBudgetExport('draft')}
                         className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2 rounded-full text-sm hover:bg-slate-200 transition font-medium"
                       >
                         <Download className="h-4 w-4" /> Draft Sheet
                       </button>
                       <button 
                         onClick={openAddTask}
                         className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-full text-sm hover:bg-emerald-700 transition"
                       >
                          <PlusCircle className="h-4 w-4" /> Add Item
                       </button>
                   </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                                <th className="p-4 font-semibold w-12 text-center">Done</th>
                                <th className="p-4 font-semibold">Task/Item</th>
                                <th className="p-4 font-semibold">Timeline/Category</th>
                                <th className="p-4 font-semibold text-right">Estimated</th>
                                <th className="p-4 font-semibold text-right">Paid</th>
                                <th className="p-4 font-semibold text-right">Balance</th>
                                <th className="p-4 font-semibold text-center w-24">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {(event.tasks || []).length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-10 text-center text-slate-400">No items recorded. Use Gemini Planner!</td>
                                </tr>
                            ) : (
                                (event.tasks || []).map(task => {
                                    const cost = task.estimatedCost || task.actualCost || 0;
                                    const paid = task.paidAmount || 0;
                                    const balance = cost - paid;
                                    return (
                                        <tr key={task.id} className="hover:bg-slate-50 group transition-colors">
                                            <td className="p-4 text-center">
                                                <button 
                                                    onClick={() => toggleTask(task.id)}
                                                    className={`mx-auto h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                                        task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'
                                                    }`}
                                                >
                                                    {task.completed && <Check className="h-4 w-4 text-white" />}
                                                </button>
                                            </td>
                                            <td className="p-4">
                                                <h4 className={`font-medium ${task.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                                                    {task.title}
                                                </h4>
                                                {task.description && (
                                                    <p className={`text-xs mt-1 ${task.completed ? 'text-slate-300' : 'text-slate-500'}`}>
                                                        {task.description}
                                                    </p>
                                                )}
                                                {task.stepsTaken && (
                                                    <p className="text-xs mt-1 text-emerald-600 bg-emerald-50 p-1 rounded inline-block border border-emerald-100">
                                                        <span className="font-bold">Steps:</span> {task.stepsTaken}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="p-4 text-xs">
                                                {task.timeline && (
                                                    <div className="flex items-center gap-1 text-slate-500 mb-1">
                                                        <CalendarIcon className="h-3 w-3" />
                                                        {new Date(task.timeline).toLocaleDateString()}
                                                    </div>
                                                )}
                                                {task.category && (
                                                    <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                                                        {task.category}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right font-mono text-slate-700">
                                                {cost > 0 ? `₦${cost.toLocaleString()}` : '-'}
                                            </td>
                                            <td className="p-4 text-right font-mono text-emerald-600">
                                                {paid > 0 ? `₦${paid.toLocaleString()}` : '-'}
                                            </td>
                                            <td className="p-4 text-right font-mono text-amber-600">
                                                {balance > 0 ? `₦${balance.toLocaleString()}` : '-'}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={() => openEditTask(task)}
                                                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded border border-slate-200"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteTask(task.id)}
                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded border border-slate-200"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
              </div>
           </div>
        )}

        {/* MENU TAB */}
        {activeTab === 'menu' && event.hasMenu && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Menu Management</h2>
                        <p className="text-sm text-slate-500">Create a detailed menu for your guests to choose from.</p>
                    </div>
                    <button 
                        onClick={openAddMenuItem}
                        className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-full text-sm hover:bg-emerald-700 transition"
                    >
                        <PlusCircle className="h-4 w-4" /> Add Item
                    </button>
                </div>
                <div className="divide-y divide-slate-100">
                    {(!event.menuItems || (event.menuItems || []).length === 0) ? (
                         <div className="p-10 text-center text-slate-400">No menu items yet. Start adding delicious food!</div>
                    ) : (
                        (event.menuItems || []).map(item => (
                            <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50 gap-4 group">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-slate-900">{item.name}</p>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                                            {item.category}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500 mt-1">{item.description || "No description."}</p>
                                </div>
                                <div className="flex items-center gap-2 border-l border-slate-200 pl-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => openEditMenuItem(item)}
                                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                        title="Edit Item"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteMenuItem(item.id)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                        title="Delete Item"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        )}

        {/* SEATING CHART TAB */}
        {activeTab === 'seating' && event.hasSeating && (
           <div className="animate-in fade-in duration-300">
               <FloorPlanEditor 
                  event={event}
                  onUpdateEvent={onUpdateEvent}
               />
           </div>
        )}

        {/* FLYER GENERATOR TAB */}
        {activeTab === 'design' && (
            <div className="animate-in fade-in duration-300">
                <FlyerGenerator 
                    initialTitle={event.title} 
                    initialDate={event.date}
                    initialLocation={event.location}
                />
            </div>
        )}
        
        {/* GUESTS TAB */}
        {activeTab === 'guests' && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Guest List</h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Share this link for guests to RSVP: <br className="sm:hidden" />
                            <button 
                                onClick={() => {
                                    const link = `${window.location.origin}${window.location.pathname}?rsvp=${event.id}`;
                                    navigator.clipboard.writeText(link);
                                    alert('RSVP Link Copied to Clipboard!');
                                }}
                                className="text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded ml-1 sm:ml-2 font-mono text-xs transition"
                            >
                                Copy RSVP Link
                            </button>
                        </p>
                    </div>
                    <div className="flex gap-2">
                         <button 
                            onClick={generateGuestListPDF}
                            className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2 rounded-full text-sm hover:bg-slate-200 transition font-medium"
                         >
                            <FileText className="h-4 w-4" /> Export List
                         </button>
                        <button 
                            onClick={openAddGuest}
                            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-full text-sm hover:bg-emerald-700 transition"
                        >
                            <PlusCircle className="h-4 w-4" /> Add Guest
                        </button>
                    </div>
                </div>
                <div className="divide-y divide-slate-100">
                    {event.guests.length === 0 ? (
                         <div className="p-10 text-center text-slate-400">List is empty.</div>
                    ) : (
                        (event.guests || []).map(guest => (
                            <div key={guest.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50 gap-4 group">
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0">
                                        {guest.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-900">{guest.name}</p>
                                        <div className="flex flex-wrap gap-2 text-xs text-slate-500 mt-0.5">
                                            <span className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono">
                                                <QrCode className="h-3 w-3" /> {guest.accessCode}
                                            </span>
                                            {guest.plusOneName && (
                                                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                                                    <Users className="h-3 w-3" /> +1: {guest.plusOneName}
                                                </span>
                                            )}
                                             {guest.hasArrived && (
                                                <span className="flex items-center gap-1 bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-bold border border-green-200">
                                                    <Check className="h-3 w-3" /> Arrived
                                                </span>
                                            )}
                                        </div>
                                        {guest.dietaryNotes && (
                                            <div className="mt-1 flex items-start gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded w-fit">
                                                <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                                <span>Note: {guest.dietaryNotes}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                     {guest.mealChoice && (
                                         <div className="hidden sm:flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                             <Utensils className="h-3 w-3" /> {guest.mealChoice}
                                         </div>
                                     )}
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                        guest.status === 'Confirmed' ? 'bg-green-100 text-green-700' :
                                        guest.status === 'Declined' ? 'bg-red-100 text-red-700' :
                                        'bg-amber-100 text-amber-700'
                                    }`}>
                                        {guest.status}
                                    </span>
                                    
                                    <div className="flex items-center gap-2 border-l border-slate-200 pl-4 ml-2">
                                        <button 
                                            onClick={() => downloadTicket(guest)}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                            title="Download Ticket"
                                        >
                                            <Download className="h-4 w-4" />
                                        </button>
                                        <button 
                                            onClick={() => openEditGuest(guest)}
                                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                            title="Edit Guest"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteGuest(guest.id)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                            title="Delete Guest"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        )}

      </div>

      {/* VENDOR MODAL */}
      {showVendorModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-emerald-950/40 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-sm shadow-2xl p-6 animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-slate-800">{editingVendor ? 'Edit Vendor' : 'Add Vendor'}</h3>
                      <button onClick={() => setShowVendorModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5"/></button>
                  </div>
                  <form onSubmit={handleVendorSubmit} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Business Name</label>
                          <input 
                            required
                            type="text" 
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-emerald-500 focus:outline-none"
                            value={vendorForm.name}
                            onChange={e => setVendorForm({...vendorForm, name: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                          <input 
                            required
                            type="text" 
                            list="vendorCats"
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-emerald-500 focus:outline-none"
                            value={vendorForm.category}
                            onChange={e => setVendorForm({...vendorForm, category: e.target.value})}
                          />
                          <datalist id="vendorCats">
                              <option value="Venue" />
                              <option value="Catering" />
                              <option value="Photography" />
                              <option value="Music/DJ" />
                              <option value="Decor" />
                          </datalist>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Contact</label>
                              <input 
                                type="text" 
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-emerald-500 focus:outline-none"
                                value={vendorForm.contact}
                                onChange={e => setVendorForm({...vendorForm, contact: e.target.value})}
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                              <input 
                                type="text" 
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-emerald-500 focus:outline-none"
                                value={vendorForm.location}
                                onChange={e => setVendorForm({...vendorForm, location: e.target.value})}
                              />
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                          <textarea 
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-emerald-500 focus:outline-none min-h-[80px]"
                            value={vendorForm.description}
                            onChange={e => setVendorForm({...vendorForm, description: e.target.value})}
                          />
                      </div>
                      <button 
                        type="submit"
                        className="w-full rounded-xl bg-emerald-600 py-3 text-white font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/20"
                      >
                        {editingVendor ? 'Update Vendor' : 'Add Vendor'}
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* Other Modals (Task, Budget, etc.) remain the same... */}
      {showTaskModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-emerald-950/40 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg mx-auto shadow-2xl p-6 animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-slate-800">{editingTask ? 'Edit Action Item' : 'Add Action Item'}</h3>
                      <button onClick={() => setShowTaskModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5"/></button>
                  </div>
                  <form onSubmit={handleTaskSubmit} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                          <input 
                            required
                            type="text" 
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-emerald-500 focus:outline-none"
                            placeholder="e.g. Book Photographer"
                            value={taskForm.title}
                            onChange={e => setTaskForm({...taskForm, title: e.target.value})}
                          />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Timeline / Date</label>
                              <input 
                                type="date" 
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-emerald-500 focus:outline-none"
                                value={taskForm.timeline}
                                onChange={e => setTaskForm({...taskForm, timeline: e.target.value})}
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                              <input 
                                type="text" 
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-emerald-500 focus:outline-none"
                                placeholder="e.g. Venue"
                                value={taskForm.category}
                                onChange={e => setTaskForm({...taskForm, category: e.target.value})}
                                list="taskCategories"
                              />
                          </div>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                              <DollarSign className="h-4 w-4" /> Budget Details
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                  <label className="block text-xs font-medium text-slate-500 mb-1">Estimated Cost (₦)</label>
                                  <input 
                                    type="number" 
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                                    value={taskForm.estimatedCost}
                                    onChange={e => setTaskForm({...taskForm, estimatedCost: e.target.value})}
                                  />
                              </div>
                              <div>
                                  <label className="block text-xs font-medium text-slate-500 mb-1">Actual Cost (₦)</label>
                                  <input 
                                    type="number" 
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                                    value={taskForm.actualCost}
                                    onChange={e => setTaskForm({...taskForm, actualCost: e.target.value})}
                                  />
                              </div>
                              <div>
                                  <label className="block text-xs font-medium text-slate-500 mb-1">Paid Amount (₦)</label>
                                  <input 
                                    type="number" 
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                                    value={taskForm.paidAmount}
                                    onChange={e => setTaskForm({...taskForm, paidAmount: e.target.value})}
                                  />
                              </div>
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                          <textarea 
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-emerald-500 focus:outline-none min-h-[60px]"
                            placeholder="General details..."
                            value={taskForm.description}
                            onChange={e => setTaskForm({...taskForm, description: e.target.value})}
                          />
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Steps Taken so far</label>
                          <textarea 
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-emerald-500 focus:outline-none min-h-[60px]"
                            placeholder="e.g. Contacted DJ, paid 50% deposit, next step is song list."
                            value={taskForm.stepsTaken}
                            onChange={e => setTaskForm({...taskForm, stepsTaken: e.target.value})}
                          />
                      </div>

                      <button 
                        type="submit"
                        className="w-full rounded-xl bg-emerald-600 py-3 text-white font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/20"
                      >
                        {editingTask ? 'Update Item' : 'Add Item'}
                      </button>
                  </form>
              </div>
          </div>
      )}

      {showGuestModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-emerald-950/40 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-sm shadow-2xl p-6 animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-slate-800">{editingGuest ? 'Edit Guest' : 'Add New Guest'}</h3>
                      <button onClick={() => setShowGuestModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5"/></button>
                  </div>
                  <form onSubmit={handleGuestSubmit} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Guest Name</label>
                          <input 
                            required
                            type="text" 
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-emerald-500 focus:outline-none"
                            placeholder="e.g. John Doe"
                            value={guestForm.name}
                            onChange={e => setGuestForm({...guestForm, name: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Access Code</label>
                          <div className="relative">
                            <QrCode className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                            <input 
                                required
                                type="text" 
                                className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-3 focus:border-emerald-500 focus:outline-none uppercase"
                                placeholder="e.g. JOHN-001"
                                value={guestForm.code}
                                onChange={e => setGuestForm({...guestForm, code: e.target.value})}
                            />
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Email (Optional)</label>
                          <input 
                            type="email" 
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-emerald-500 focus:outline-none"
                            placeholder="john@example.com"
                            value={guestForm.email}
                            onChange={e => setGuestForm({...guestForm, email: e.target.value})}
                          />
                      </div>
                      <div className="flex items-center gap-3 py-2">
                           <input 
                              type="checkbox" 
                              id="plusOne"
                              className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                              checked={guestForm.plusOne}
                              onChange={e => setGuestForm({...guestForm, plusOne: e.target.checked})}
                           />
                           <label htmlFor="plusOne" className="text-sm font-medium text-slate-700">Allow Plus One (+1)</label>
                      </div>
                      <button 
                        type="submit"
                        className="w-full rounded-xl bg-emerald-600 py-3 text-white font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/20"
                      >
                        {editingGuest ? 'Update Guest' : 'Add Guest'}
                      </button>
                  </form>
              </div>
          </div>
      )}

      {showMenuModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-emerald-950/40 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-sm shadow-2xl p-6 animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-slate-800">{editingMenuItem ? 'Edit Menu Item' : 'Add Menu Item'}</h3>
                      <button onClick={() => setShowMenuModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5"/></button>
                  </div>
                  <form onSubmit={handleMenuSubmit} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Dish Name</label>
                          <input 
                            required
                            type="text" 
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-emerald-500 focus:outline-none"
                            placeholder="e.g. Grilled Salmon"
                            value={menuForm.name}
                            onChange={e => setMenuForm({...menuForm, name: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                          <input 
                            required
                            type="text" 
                            list="menuCategories"
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-emerald-500 focus:outline-none"
                            placeholder="e.g. Main Meal"
                            value={menuForm.category}
                            onChange={e => setMenuForm({...menuForm, category: e.target.value})}
                          />
                          <datalist id="menuCategories">
                              <option value="Starter" />
                              <option value="Main Meal" />
                              <option value="Dessert" />
                              <option value="Drinks" />
                              <option value="Dietary" />
                          </datalist>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
                          <textarea 
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-emerald-500 focus:outline-none min-h-[80px]"
                            placeholder="Ingredients, preparation method..."
                            value={menuForm.description}
                            onChange={e => setMenuForm({...menuForm, description: e.target.value})}
                          />
                      </div>
                      
                      <button 
                        type="submit"
                        className="w-full rounded-xl bg-emerald-600 py-3 text-white font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/20"
                      >
                        {editingMenuItem ? 'Update Menu Item' : 'Add to Menu'}
                      </button>
                  </form>
              </div>
          </div>
      )}

      {showScanner && (
          <QRScanner 
            event={event} 
            onClose={() => setShowScanner(false)} 
            onScanSuccess={handleScanSuccess} 
          />
      )}

    </div>
  );
};

export default EventDetail;