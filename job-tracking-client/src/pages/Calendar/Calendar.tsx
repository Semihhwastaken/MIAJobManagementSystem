import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '../../context/ThemeContext';
import CreateEventModal from '../../components/Calendar/CreateEventModal';
import Footer from "../../components/Footer/Footer";
import { calendarService } from '../../services/calendarService';
import {
  addEvent,
  updateEvent,
  deleteEvent,
  setLoading,
  setError,
  setSelectedDate,
  setEvents,
  type CalendarEvent
} from '../../redux/features/calendarSlice';
import type { RootState } from '../../redux/store';

type EventFormData = Omit<CalendarEvent, 'id'>;

const Calendar = () => {
  const dispatch = useDispatch();
  const { isDarkMode } = useTheme();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; eventId: string | null }>({
    isOpen: false,
    eventId: null
  });

  const events = useSelector((state: RootState) => state.calendar.events);
  const loading = useSelector((state: RootState) => state.calendar.loading);
  const selectedDate = useSelector((state: RootState) => state.calendar.selectedDate);

  // Calculate current week dates
  const currentDate = new Date(selectedDate);
  const startOfWeek = new Date(currentDate);
  const currentDay = startOfWeek.getDay();
  
  // Adjust the start date to show the correct weekday
  if (currentDay === 0) {
    startOfWeek.setDate(currentDate.getDate() + 1);
  } else if (currentDay === 6) {
    startOfWeek.setDate(currentDate.getDate() + 2);
  }

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 4);

  const currentWeek = `${startOfWeek.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { day: 'numeric', year: 'numeric' })}`;

  // Get the actual weekday names for the current view
  const days = Array.from({ length: 5 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  });

  // Get the dates for the current view
  const dates = Array.from({ length: 5 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return date.getDate();
  });

  const timeSlots = Array.from({ length: 9 }, (_, i) => {
    const hour = 8 + i;
    return `${hour}:00 ${hour < 12 ? 'AM' : 'PM'}`;
  });

  const goToToday = () => {
    dispatch(setSelectedDate(new Date().toISOString()));
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    dispatch(setSelectedDate(newDate.toISOString()));
  };

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        dispatch(setLoading(true));
        const startDate = startOfWeek.toISOString().split('T')[0];
        const endDate = endOfWeek.toISOString().split('T')[0];
        const response = await calendarService.getEvents(startDate, endDate);
        dispatch(setEvents(response));
      } catch (error) {
        dispatch(setError('Failed to fetch events'));
      } finally {
        dispatch(setLoading(false));
      }
    };

    fetchEvents();
  }, [dispatch, selectedDate]);

  const handleCreateEvent = async (eventData: EventFormData) => {
    try {
      dispatch(setLoading(true));
      const newEvent = await calendarService.createEvent(eventData);
      dispatch(addEvent(newEvent));
      setIsCreateModalOpen(false);
    } catch (error) {
      dispatch(setError('Failed to create event'));
    } finally {
      dispatch(setLoading(false));
    }
  };

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
    } catch (error) {
      dispatch(setError('Failed to update event'));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      dispatch(setLoading(true));
      await calendarService.deleteEvent(eventId);
      dispatch(deleteEvent(eventId));
    } catch (error) {
      dispatch(setError('Failed to delete event'));
    } finally {
      dispatch(setLoading(false));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className={`h-full p-6 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`p-6 rounded-lg shadow-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Delete Event
            </h2>
            <p className={`mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Are you sure you want to delete this event? This action cannot be undone.
            </p>
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
                onClick={() => {
                  if (deleteConfirmation.eventId) {
                    handleDeleteEvent(deleteConfirmation.eventId);
                  }
                  setDeleteConfirmation({ isOpen: false, eventId: null });
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Calendar
            </h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigateWeek('prev')}
                className={`p-2 rounded-full hover:bg-gray-100 ${isDarkMode ? 'hover:bg-gray-800' : ''}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {currentWeek}
              </span>
              <button
                onClick={() => navigateWeek('next')}
                className={`p-2 rounded-full hover:bg-gray-100 ${isDarkMode ? 'hover:bg-gray-800' : ''}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <button
              onClick={goToToday}
              className={`px-4 py-2 rounded-lg ${
                isDarkMode
                  ? 'bg-gray-800 text-white hover:bg-gray-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Today
            </button>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Create Event
          </button>
        </div>

        <div className={`rounded-lg shadow-lg overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
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

          <div className="grid grid-cols-6">
            <div className="space-y-0">
              {timeSlots.map((time) => (
                <div
                  key={time}
                  className={`h-28 flex items-start relative border-b ${
                    isDarkMode ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'
                  }`}
                >
                  <span className="absolute -top-3 right-4 text-sm">
                    {time}
                  </span>
                </div>
              ))}
            </div>

            {Array.from({ length: 5 }).map((_, dayIndex) => (
              <div
                key={dayIndex}
                className={`border-l relative ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}
              >
                {timeSlots.map((_, timeIndex) => (
                  <div
                    key={timeIndex}
                    className={`h-28 border-b ${
                      isDarkMode ? 'border-gray-700' : 'border-gray-200'
                    }`}
                  ></div>
                ))}

                {(() => {
                  const eventsByStartTime = events
                    .filter(event => {
                      const eventDate = new Date(event.startDate);
                      const currentDate = new Date(startOfWeek);
                      currentDate.setDate(startOfWeek.getDate() + dayIndex);
                      
                      return (
                        eventDate.getFullYear() === currentDate.getFullYear() &&
                        eventDate.getMonth() === currentDate.getMonth() &&
                        eventDate.getDate() === currentDate.getDate()
                      );
                    })
                    .reduce((acc, event) => {
                      const startTime = event.startTime;
                      if (!acc[startTime]) {
                        acc[startTime] = [];
                      }
                      acc[startTime].push(event);
                      return acc;
                    }, {} as Record<string, CalendarEvent[]>);

                  return Object.entries(eventsByStartTime).map(([_, overlappingEvents]) => {
                    const eventWidth = `${90 / overlappingEvents.length}%`;
                    
                    return overlappingEvents.map((event, eventIndex) => {
                      const eventEndDateTime = new Date(`${event.endDate}T${event.endTime}`);
                      const now = new Date();
                      const isPastEvent = eventEndDateTime < now;

                      return (
                        <div
                          key={event.id}
                          className={`absolute p-2 rounded-lg shadow-sm cursor-pointer transition-all hover:shadow-md ${
                            isPastEvent
                              ? 'bg-gray-100 border-l-4 border-gray-500 text-gray-600 opacity-75'
                              : event.priority === 'High'
                              ? 'bg-red-100 border-l-4 border-red-500 text-red-900'
                              : event.priority === 'Medium'
                              ? 'bg-yellow-100 border-l-4 border-yellow-500 text-yellow-900'
                              : 'bg-blue-100 border-l-4 border-blue-500 text-blue-900'
                          }`}
                          style={{
                            top: `${((parseInt(event.startTime.split(':')[0]) - 8) * 7) + (parseInt(event.startTime.split(':')[1]) / 60 * 7)}rem`,
                            height: `${
                              ((parseInt(event.endTime.split(':')[0]) - parseInt(event.startTime.split(':')[0])) * 7) +
                              ((parseInt(event.endTime.split(':')[1]) - parseInt(event.startTime.split(':')[1])) / 60 * 7)
                            }rem`,
                            left: `${(eventIndex * (90 / overlappingEvents.length))}%`,
                            width: eventWidth,
                            zIndex: 10
                          }}
                          onClick={() => {
                            setSelectedEvent(event);
                            setIsEditModalOpen(true);
                          }}
                        >
                          <div className="flex flex-col h-full">
                            <div className="flex justify-between items-start mb-1">
                              <div className="flex-1">
                                <h3 className="font-medium truncate text-sm">{event.title}</h3>
                                {isPastEvent && (
                                  <span className="text-xs text-gray-500 font-medium">
                                    Zamanı Geçmiş
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirmation({ isOpen: true, eventId: event.id });
                                }}
                                className={`p-1 rounded-full hover:bg-gray-200 transition-colors -mr-1 ml-1
                                  ${isDarkMode ? 'text-gray-400 hover:text-gray-600' : 'text-gray-600 hover:text-gray-800'}`}
                                title="Delete Event"
                              >
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>
                            </div>
                            <p className="text-xs truncate">{event.description}</p>
                            <div className="mt-auto">
                              <p className="text-xs opacity-75">
                                {event.startTime} - {event.endTime}
                              </p>
                              {event.participants && event.participants.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {event.participants.map((participant, index) => (
                                    <span
                                      key={index}
                                      className={`text-xs px-1.5 py-0.5 rounded-full opacity-75 max-w-[80px] truncate ${
                                        isPastEvent
                                          ? 'bg-gray-200 text-gray-700'
                                          : event.priority === 'High'
                                          ? 'bg-red-200 text-red-800'
                                          : event.priority === 'Medium'
                                          ? 'bg-yellow-200 text-yellow-800'
                                          : 'bg-blue-200 text-blue-800'
                                      }`}
                                      title={participant}
                                    >
                                      {participant}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    });
                  });
                })()}
              </div>
            ))}
          </div>
        </div>
      </div>

      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateEvent}
      />

      <CreateEventModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedEvent(null);
        }}
        onSubmit={handleUpdateEvent}
        initialData={selectedEvent || undefined}
      />
      <Footer />
    </div>
  );
};

export default Calendar;
