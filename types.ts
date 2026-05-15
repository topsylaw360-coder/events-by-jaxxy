
export type EventType = 'Wedding' | 'Party' | 'Seminar' | 'Other';

export interface Task {
  id: string;
  title: string;
  description?: string; 
  timeline?: string;    
  completed: boolean;
  category?: string;
  // Merged budget fields
  estimatedCost?: number;
  actualCost?: number;
  paidAmount?: number;
  stepsTaken?: string;
}

export interface Guest {
  id: string;
  name: string;
  accessCode: string; 
  email: string;
  status: 'Invited' | 'Confirmed' | 'Declined';
  plusOneAllowed: boolean;
  plusOneName?: string;
  mealChoice?: string;
  dietaryNotes?: string;
  hasArrived?: boolean;
  isLocked?: boolean; 
}

export interface BudgetItem {
  id: string;
  name: string;
  quantity?: number;
  totalCost?: number;
  paidAmount?: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  category: string; 
}

export type FloorElementType = 'table-round' | 'table-rect' | 'theatre-row' | 'stage' | 'bar' | 'dancefloor' | 'wall' | 'plant' | 'entrance';

export interface FloorElement {
  id: string;
  type: FloorElementType;
  label: string;
  x: number; // position on canvas (pixels)
  y: number; // position on canvas (pixels)
  width: number; // dimensions
  height: number;
  rotation: number; // degrees
  capacity?: number; // Only for tables/seating
  guestIds: string[]; // Only for tables
}

export interface Notification {
  id: string;
  message: string;
  timestamp: string;
  type: 'rsvp' | 'alert' | 'info';
  isRead: boolean;
}

export interface Vendor {
  id: string;
  name: string;
  description: string;
  location: string;
  rating: string;
  contact: string;
  category: string;
  priceEstimate?: number; // Optional cost field
}

export interface EventPlan {
  id: string;
  title: string;
  type: EventType;
  date: string;
  location: string;
  description: string;
  tasks: Task[];
  guests: Guest[];
  vendors: Vendor[];
  imageUrl: string;
  hasMenu: boolean; 
  menuItems: MenuItem[]; 
  hasSeating: boolean; 
  floorDimensions: { width: number; length: number; shape: 'rectangle' | 'oval' | 'square' | 'round' }; 
  floorElements: FloorElement[]; 
  notifications: Notification[]; 
  isArchived?: boolean; 
  tables?: any[]; 
}

export interface EventRequest {
  id: string;
  clientName: string;
  phone: string;
  email: string;
  eventType: EventType;
  budget: number;
  guestCount: number;
  date: string;
  timestamp: string;
  hasMenu?: boolean;
  hasSeating?: boolean;
  status: 'pending' | 'approved' | 'rejected';
}

export interface AIPlanSuggestion {
  theme: string;
  schedule: string[];
  tasks: string[];
  budgetAdvice: { category: string; amount: number }[];
}
