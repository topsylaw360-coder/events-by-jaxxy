import React from 'react';
import { Calendar, MapPin, Users, Trash2 } from 'lucide-react';
import { EventPlan } from '../types';

interface EventCardProps {
  event: EventPlan;
  onClick: (event: EventPlan) => void;
  onDelete?: (id: string) => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, onClick, onDelete }) => {
  const formattedDate = new Date(event.date).toLocaleDateString('en-GB').replace(/\//g, '-');

  return (
    <div 
      onClick={() => onClick(event)}
      className="group relative overflow-hidden rounded-3xl bg-white shadow-lg transition-all hover:shadow-2xl hover:-translate-y-1 cursor-pointer border border-emerald-100/50"
    >
      <div className="h-48 w-full overflow-hidden relative">
        <img 
          src={event.imageUrl} 
          alt={event.title} 
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
        
        {onDelete && (
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(event.id);
                }}
                className="absolute top-4 right-4 p-2.5 bg-white/20 backdrop-blur-md hover:bg-red-500 text-white rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 z-20 hover:shadow-lg"
                title="Delete Event"
            >
                <Trash2 className="h-4 w-4" />
            </button>
        )}
      </div>
      
      <div className="absolute bottom-0 left-0 w-full p-6 text-white">
        <span className="inline-block rounded-full bg-emerald-500/90 px-3 py-1 text-xs font-semibold backdrop-blur-md mb-2">
          {event.type}
        </span>
        <h3 className="text-2xl font-bold leading-tight mb-1">{event.title}</h3>
        <div className="flex items-center space-x-4 text-sm font-medium text-emerald-50">
          <div className="flex items-center">
            <Calendar className="mr-1.5 h-4 w-4" />
            {formattedDate}
          </div>
        </div>
      </div>
      
      <div className="p-4 bg-white">
         <div className="flex justify-between items-center text-slate-500 text-xs sm:text-sm">
            <div className="flex items-center truncate pr-2">
                <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 flex-shrink-0" /> <span className="truncate">{event.location}</span>
            </div>
            <div className="flex items-center flex-shrink-0">
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" /> {event.guests.length} Guests
            </div>
         </div>
      </div>
    </div>
  );
};

export default EventCard;