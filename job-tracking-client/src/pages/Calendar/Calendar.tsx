/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '../../context/ThemeContext';
import CreateEventModal from '../../components/Calendar/CreateEventModal';
import Footer from "../../components/Footer/Footer";
import { calendarService } from '../../services/calendarService';
import { useSnackbar } from 'notistack';
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

const Calendar: React.FC = () => {
  const dispatch = useDispatch();
  const { isDarkMode } = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; eventId: string | null }>({isOpen: false, eventId: null});
  const events = useSelector((state: RootState) => state.calendar.events);
  const loading = useSelector((state: RootState) => state.calendar.loading);
  const selectedDate = useSelector((state: RootState) => state.calendar.selectedDate);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const daysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const firstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const generateCalendarDays = () => {
    const days = [];
    const totalDays = daysInMonth(currentDate);
    const firstDay = firstDayOfMonth(currentDate);

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= totalDays; i++) {
      days.push(i);
    }

    return days;
  };

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        dispatch(setLoading(true));
        const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
          .toISOString().split('T')[0];
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
          .toISOString().split('T')[0];
        const response = await calendarService.getEvents(startDate, endDate);
        dispatch(setEvents(response));
      } catch {
        dispatch(setError('Failed to fetch events'));
      } finally {
        dispatch(setLoading(false));
      }
    };

    fetchEvents();
  }, [dispatch, currentDate]);

  const handleCreateEvent = async (eventData: EventFormData) => {
    try {
      dispatch(setLoading(true));
      const newEvent = await calendarService.createEvent(eventData);
      dispatch(addEvent(newEvent));
      setShowEventModal(false);
    } catch {
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
      enqueueSnackbar('Event updated successfully', { variant: 'success' });
    } catch (error: any) {
      dispatch(setError('Failed to update event'));
      if (error.response?.status === 403) {
        enqueueSnackbar('Bunu güncellemek için izniniz yok!!', { variant: 'error' });
      } else {
        enqueueSnackbar('Olay güncellemesi başarısız!!', { variant: 'error' });
      }
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      dispatch(setLoading(true));
      await calendarService.deleteEvent(eventId);
      dispatch(deleteEvent(eventId));
    } catch {
      dispatch(setError('Failed to delete event'));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleDateClick = (day: number | null) => {
    if (day) {
      const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      dispatch(setSelectedDate(newDate.toISOString()));
    }
  };

  const getEventColor = (priority: 'High' | 'Medium' | 'Low'): string => {
    switch (priority) {
      case 'High': return 'bg-red-500';
      case 'Medium': return 'bg-yellow-500';
      case 'Low': return 'bg-green-500';
      default: return 'bg-blue-500';
    }
  };

  const isOverdue = (eventDate: Date) => {
    const today = new Date();
    return eventDate < today && eventDate.toDateString() !== today.toDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Calendar Controls */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
              className={`p-2 ${
                isDarkMode ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
              } rounded-full cursor-pointer !rounded-button`}
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {currentDate.toLocaleString("default", {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
              className={`p-2 ${
                isDarkMode ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
              } rounded-full cursor-pointer !rounded-button`}
            >
              <i className="fas fa-chevron-right"></i>
            </button>
            <button
              onClick={() => {
                setCurrentDate(new Date());
                dispatch(setSelectedDate(new Date().toISOString()));
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer !rounded-button"
            >
              Today
            </button>
          </div>
          <button
            onClick={() => setShowEventModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2 cursor-pointer !rounded-button"
          >
            <i className="fas fa-plus"></i>
            <span>New Event</span>
          </button>
        </div>

        <div className="flex space-x-6">
          {/* Calendar Grid */}
          <div className={`flex-1 ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          } rounded-lg shadow-md p-6`}>
            <div className="grid grid-cols-7 gap-4 mb-4">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className={`text-center font-semibold ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-4">
              {generateCalendarDays().map((day, index) => (
                <div
                  key={index}
                  onClick={() => handleDateClick(day)}
                  className={`
                    min-h-[100px] p-2 border rounded-lg cursor-pointer
                    ${day === null 
                      ? isDarkMode ? 'bg-gray-900' : 'bg-gray-50' 
                      : isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}
                    ${day === new Date(selectedDate).getDate() &&
                    currentDate.getMonth() === new Date(selectedDate).getMonth()
                      ? 'border-blue-500'
                      : isDarkMode ? 'border-gray-700' : 'border-gray-200'}
                  `}
                >
                  {day && (
                    <>
                      <div className="text-right mb-2">
                        <span className={`text-sm ${
                          [0, 6].includes(index % 7) 
                            ? 'text-red-500' 
                            : isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          {day}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {events.filter(event => {
                          const eventDate = new Date(event.startDate);
                          const calendarDate = new Date(
                            currentDate.getFullYear(),
                            currentDate.getMonth(),
                            day
                          );
                          return (
                            eventDate.getDate() === calendarDate.getDate() &&
                            eventDate.getMonth() === calendarDate.getMonth() &&
                            eventDate.getFullYear() === calendarDate.getFullYear()
                          );
                        }).map((event) => (
                          <div
                            key={event.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (event.createdBy === currentUser?.id) {
                                setSelectedEvent(event);
                                setIsEditModalOpen(true);
                              } else {
                                enqueueSnackbar('Bu eylemi gerçekleştirmek için izniniz yok !!', { variant: 'error',autoHideDuration: 2400 });
                              }
                            }}
                            className={`${getEventColor(event.priority)} text-white text-xs p-1 rounded truncate`}
                          >
                            {event.startTime} - {event.title}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Daily Agenda */}
          <div className={`w-96 ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          } rounded-lg shadow-md p-6`}>
            <h3 className={`text-lg font-semibold mb-4 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {new Date(selectedDate).toLocaleDateString("default", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </h3>
            <div className="space-y-4">
              {events.filter(event => {
                const selectedDateObj = new Date(selectedDate);
                const eventDate = new Date(event.startDate);
                return (
                  eventDate.getDate() === selectedDateObj.getDate() &&
                  eventDate.getMonth() === selectedDateObj.getMonth() &&
                  eventDate.getFullYear() === selectedDateObj.getFullYear()
                );
              }).length === 0 ? (
                <p className={`text-center py-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  No events scheduled for today
                </p>
              ) : (
                events
                  .filter(event => {
                    const selectedDateObj = new Date(selectedDate);
                    const eventDate = new Date(event.startDate);
                    return (
                      eventDate.getDate() === selectedDateObj.getDate() &&
                      eventDate.getMonth() === selectedDateObj.getMonth() &&
                      eventDate.getFullYear() === selectedDateObj.getFullYear()
                    );
                  })
                  .map((event) => (
                    <div key={event.id} className={`border rounded-lg p-4 hover:shadow-md transition-shadow relative ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} ${isOverdue(new Date(event.startDate)) ? 'border-red-500 opacity-70' : ''}`}>
                      {isOverdue(new Date(event.startDate)) && (
                        <div className="absolute bottom-0 right-0 bg-red-500 text-white text-xs px-2 py-1 rounded-tr-lg rounded-bl-lg">
                          Süresi Dolmuş
                        </div>
                      )}
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">{event.startTime} - {event.endTime}</span>
                        <div className="flex items-center space-x-2">
                          <span className={`${getEventColor(event.priority)} text-white text-xs px-2 py-1 rounded`}>
                            {event.category}
                          </span>
                          {event.createdBy === currentUser?.id && (
                            <button
                              onClick={() => setDeleteConfirmation({ isOpen: true, eventId: event.id })}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <i className="fas fa-trash-alt"></i>
                            </button>
                          )}
                        </div>
                      </div>
                      <h4 className="font-medium mb-2">{event.title}</h4>
                      <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {event.participants.map((participant, index) => (
                          <span
                            key={index}
                            className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                          >
                            {participant}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Event Creation Modal */}
      {showEventModal && (
        <CreateEventModal
          isOpen={showEventModal}
          onClose={() => setShowEventModal(false)}
          onSubmit={handleCreateEvent}
        />
      )}

      {isEditModalOpen && selectedEvent && (
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

      {/* Delete Confirmation Modal */}
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

      <Footer />
    </div>
  );
};

export default Calendar;