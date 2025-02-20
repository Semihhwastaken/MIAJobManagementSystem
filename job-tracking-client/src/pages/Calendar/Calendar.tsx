import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '../../context/ThemeContext';
import CreateEventModal from '../../components/Calendar/CreateEventModal';
import { calendarService } from '../../services/calendarService';
import {
  addEvent,
  updateEvent,
  deleteEvent,
  setLoading,
  setError,
  setSelectedDate,
  type CalendarEvent
} from '../../redux/features/calendarSlice';
import type { RootState } from '../../redux/store';

type EventFormData = Omit<CalendarEvent, 'id'>;

/**
 * Calendar component for managing and displaying events
 * Supports week view, event creation, editing, and deletion
 */
const Calendar = () => {
  const dispatch = useDispatch();
  const { isDarkMode } = useTheme();
  const [viewMode, setViewMode] = useState<'Month' | 'Week' | 'Day'>('Week');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; eventId: string | null }>({
    isOpen: false,
    eventId: null
  });

  const events = useSelector((state: RootState) => state.calendar.events);
  const loading = useSelector((state: RootState) => state.calendar.loading);
  const error = useSelector((state: RootState) => state.calendar.error);
  const selectedDate = useSelector((state: RootState) => state.calendar.selectedDate);

  // Calculate current week dates
  const currentDate = new Date(selectedDate);
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 1);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 4);

  const currentWeek = `${startOfWeek.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { day: 'numeric', year: 'numeric' })}`;

  /**
   * Fetch events for the current week
   */
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        dispatch(setLoading(true));
        const startDate = startOfWeek.toISOString().split('T')[0];
        const endDate = endOfWeek.toISOString().split('T')[0];
        const fetchedEvents = await calendarService.getEvents(startDate, endDate);
        fetchedEvents.forEach(event => dispatch(addEvent(event)));
      } catch (err) {
        dispatch(setError(err instanceof Error ? err.message : 'Failed to fetch events'));
      } finally {
        dispatch(setLoading(false));
      }
    };

    fetchEvents();
  }, [dispatch, selectedDate]);

  /**
   * Handle creation of a new event
   * @param eventData - The event data without an ID
   */
  const handleCreateEvent = async (eventData: EventFormData) => {
    try {
      dispatch(setLoading(true));
      const newEvent = await calendarService.createEvent(eventData);
      dispatch(addEvent(newEvent));
      setIsCreateModalOpen(false);
    } catch (err) {
      dispatch(setError(err instanceof Error ? err.message : 'Failed to create event'));
    } finally {
      dispatch(setLoading(false));
    }
  };

  /**
   * Handle updating an existing event
   * @param eventData - The form data for the event
   */
  const handleUpdateEvent = async (eventData: EventFormData) => {
    if (!selectedEvent) return;
    
    try {
      dispatch(setLoading(true));
      const updatedEvent = await calendarService.updateEvent({
        ...eventData,
        id: selectedEvent.id
      });
      dispatch(updateEvent(updatedEvent));
      setIsEditModalOpen(false);
      setSelectedEvent(null);
    } catch (err) {
      dispatch(setError(err instanceof Error ? err.message : 'Failed to update event'));
    } finally {
      dispatch(setLoading(false));
    }
  };

  /**
   * Handle deletion of an event
   * @param eventId - The ID of the event to delete
   */
  const handleDeleteEvent = async (eventId: string) => {
    try {
      dispatch(setLoading(true));
      await calendarService.deleteEvent(eventId);
      dispatch(deleteEvent(eventId));
      setDeleteConfirmation({ isOpen: false, eventId: null });
    } catch (err) {
      dispatch(setError(err instanceof Error ? err.message : 'Failed to delete event'));
    } finally {
      dispatch(setLoading(false));
    }
  };

  /**
   * Navigate to the previous or next week
   * @param direction - The direction to navigate ('prev' or 'next')
   */
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    dispatch(setSelectedDate(newDate.toISOString().split('T')[0]));
  };

  const timeSlots = Array.from({ length: 9 }, (_, i) => {
    const hour = 8 + i;
    return `${hour}:00 ${hour < 12 ? 'AM' : 'PM'}`;
  });

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const dates = [20, 21, 22, 23, 24];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className={`text-center p-6 rounded-lg ${isDarkMode ? 'bg-red-900/50 text-red-200' : 'bg-red-100 text-red-600'}`}>
          <p className="text-lg font-medium">{error}</p>
          <button
            onClick={() => dispatch(setError(null))}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`h-full p-6 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}
    >
      {/* Delete Confirmation Dialog */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`p-6 rounded-lg shadow-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className="text-lg font-medium mb-4">Delete Event</h3>
            <p className="mb-6">Are you sure you want to delete this event?</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirmation({ isOpen: false, eventId: null })}
                className={`px-4 py-2 rounded-lg ${
                  isDarkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => deleteConfirmation.eventId && handleDeleteEvent(deleteConfirmation.eventId)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-semibold">Calendar</h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigateWeek('prev')}
                className={`p-2 rounded-lg ${
                  isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-lg">{currentWeek}</span>
              <button
                onClick={() => navigateWeek('next')}
                className={`p-2 rounded-lg ${
                  isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* View Controls */}
          <div className="flex items-center space-x-4">
            <div className="flex bg-gray-200 rounded-lg p-1">
              {['Month', 'Week', 'Day'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as 'Month' | 'Week' | 'Day')}
                  className={`px-4 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === mode
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-indigo-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>New Event</span>
            </button>
          </div>
        </div>

        {/* Calendar Navigation */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <button className="p-2 hover:bg-gray-200 rounded-full">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-lg font-medium">{currentWeek}</span>
            <button className="p-2 hover:bg-gray-200 rounded-full">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button className="text-indigo-600 font-medium hover:text-indigo-700">Today</button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className={`rounded-lg shadow-lg overflow-hidden ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          {/* Days Header */}
          <div className="grid grid-cols-6 border-b">
            <div className={`py-2 px-4 text-sm font-medium ${
              isDarkMode ? 'text-gray-400 border-gray-700' : 'text-gray-500 border-gray-200'
            }`}></div>
            {days.map((day, index) => (
              <div
                key={day}
                className={`py-2 px-4 text-center border-l ${
                  isDarkMode ? 'border-gray-700' : 'border-gray-200'
                }`}
              >
                <div className="text-sm font-medium">{day}</div>
                <div className={`text-2xl font-semibold ${
                  isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>{dates[index]}</div>
              </div>
            ))}
          </div>

          {/* Time Slots */}
          <div className="grid grid-cols-6">
            {/* Time Labels */}
            <div className="space-y-4">
              {timeSlots.map((time) => (
                <div
                  key={time}
                  className={`px-4 py-8 text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  {time}
                </div>
              ))}
            </div>

            {/* Calendar Cells */}
            {Array.from({ length: 5 }).map((_, dayIndex) => (
              <div
                key={dayIndex}
                className={`border-l relative ${
                  isDarkMode ? 'border-gray-700' : 'border-gray-200'
                }`}
              >
                {timeSlots.map((_, timeIndex) => (
                  <div
                    key={timeIndex}
                    className={`h-20 border-b ${
                      isDarkMode ? 'border-gray-700' : 'border-gray-200'
                    }`}
                  ></div>
                ))}

                {/* Events */}
                {events.map((event) => (
                  <div
                    key={event.id}
                    className={`absolute w-full p-2 rounded-lg shadow-sm ${
                      event.priority === 'High'
                        ? 'bg-red-100 border-l-4 border-red-500'
                        : event.priority === 'Medium'
                        ? 'bg-green-100 border-l-4 border-green-500'
                        : 'bg-blue-100 border-l-4 border-blue-500'
                    }`}
                    style={{
                      top: `${(parseInt(event.startTime.split(':')[0]) - 8) * 5}rem`,
                      height: `${(parseInt(event.endTime.split(':')[0]) - parseInt(event.startTime.split(':')[0])) * 5}rem`
                    }}
                  >
                    <div 
                      onClick={() => {
                        setSelectedEvent(event);
                        setIsEditModalOpen(true);
                      }}
                      className="flex justify-between items-start cursor-pointer"
                    >
                      <div>
                        <h3 className="font-medium text-gray-900">{event.title}</h3>
                        <p className="text-sm text-gray-600">{event.description}</p>
                        <p className="text-xs text-gray-500">
                          {event.startTime} - {event.endTime}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {event.priority === 'High' && (
                          <span className="px-2 py-1 text-xs font-medium bg-red-200 text-red-800 rounded-full">
                            High Priority
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmation({ isOpen: true, eventId: event.id });
                          }}
                          className={`p-1 rounded-full hover:bg-gray-200 transition-colors
                            ${isDarkMode ? 'text-gray-400 hover:text-gray-600' : 'text-gray-600 hover:text-gray-800'}`}
                          title="Delete Event"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                    {event.participants && event.participants.length > 0 && (
                      <div className="flex -space-x-2 mt-2">
                        {event.participants.map((participant, index) => (
                          <div
                            key={index}
                            className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs text-gray-600"
                            title={participant}
                          >
                            {participant.charAt(0).toUpperCase()}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateEvent}
      />

      {/* Edit Event Modal */}
      {selectedEvent && (
        <CreateEventModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedEvent(null);
          }}
          onSubmit={handleUpdateEvent}
          initialData={selectedEvent}
        />
      )}
    </motion.div>
  );
};

export default Calendar;
