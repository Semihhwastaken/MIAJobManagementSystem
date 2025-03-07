/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '../../context/ThemeContext';
import CreateEventModal from '../../components/Calendar/CreateEventModal';
import Footer from "../../components/Footer/Footer";
import { calendarService } from '../../services/calendarService';
import teamService from '../../services/teamService';
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
import { Team, TeamMember } from '../../types/team';

type EventFormData = Omit<CalendarEvent, 'id'>;

// TeamFilter tipi için enum oluşturalım
type TeamFilter = 'all' | string;

// Tarih sınırlarını saat kısmı olmadan karşılaştırmak için yardımcı fonksiyon
const compareDate = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const Calendar: React.FC = () => {
  const dispatch = useDispatch();
  const { isDarkMode } = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<TeamFilter>('all');
  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const events = useSelector((state: RootState) => state.calendar.events);
  const loading = useSelector((state: RootState) => state.calendar.loading);
  const selectedDate = useSelector((state: RootState) => state.calendar.selectedDate);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [filteredEvents, setFilteredEvents] = useState<CalendarEvent[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);

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

  // Kullanıcının takımlarını getirme
  useEffect(() => {
    const fetchUserTeams = async () => {
      try {
        setLoadingTeams(true);
        const teams = await teamService.getMyTeams();
        setUserTeams(teams);
      } catch (error) {
        console.error('Takım bilgileri alınamadı:', error);
        enqueueSnackbar('Takım bilgileri alınamadı!', { variant: 'error' });
      } finally {
        setLoadingTeams(false);
      }
    };

    fetchUserTeams();
  }, [enqueueSnackbar]);

  // Takvim etkinliklerini getirme
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        dispatch(setLoading(true));
        const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
          .toISOString().split('T')[0];
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
          .toISOString().split('T')[0];
        
        let response;
        
        if (selectedTeamFilter !== 'all') {
          // Eğer belirli bir takım seçiliyse, takımın etkinliklerini getir
          response = await calendarService.getTeamEvents(selectedTeamFilter, startDate, endDate);
        } else {
          // Tüm etkinlikleri getir
          response = await calendarService.getEvents(startDate, endDate);
        }
        
        // API'den gelen yanıtı kontrol et
        console.log('API response:', response);
        
        dispatch(setEvents(response));
      } catch (error) {
        console.error('Etkinlikler alınamadı:', error);
        dispatch(setError('Etkinlikler alınamadı'));
        enqueueSnackbar('Etkinlikler alınamadı!', { variant: 'error' });
      } finally {
        dispatch(setLoading(false));
      }
    };

    fetchEvents();
  }, [dispatch, currentDate, enqueueSnackbar, selectedTeamFilter]);

  // Etkinlikleri seçili takıma göre filtreleme
  useEffect(() => {
    console.log('Filtreleme çalıştı. Tüm etkinlikler:', events);
    console.log('Seçili takım filtresi:', selectedTeamFilter);
    console.log('Mevcut kullanıcı:', currentUser);
    
    if (selectedTeamFilter === 'all') {
      // Tüm etkinlikleri göster (kullanıcıya atanmış olanlar)
      const userEvents = events.filter(event => 
        event.createdBy === currentUser?.id || 
        (event.participants && event.participants.includes(currentUser?.email || ''))
      );
      
      console.log('Filtrelenmiş kullanıcı etkinlikleri:', userEvents);
      setFilteredEvents(userEvents);
    } else {
      // Belirli bir takımın etkinliklerini teamId'ye göre filtrele
      const teamEvents = events.filter(event => 
        event.teamId === selectedTeamFilter || 
        event.createdBy === currentUser?.id
      );
      
      console.log('Filtrelenmiş takım etkinlikleri:', teamEvents);
      setFilteredEvents(teamEvents);
    }
  }, [selectedTeamFilter, events, currentUser]);

  const handleCreateEvent = async (eventData: EventFormData) => {
    try {
      dispatch(setLoading(true));
      const newEvent = await calendarService.createEvent(eventData);
      
      console.log('Oluşturulan yeni etkinlik:', newEvent);
      
      // Redux store'a yeni etkinliği ekle
      dispatch(addEvent(newEvent));
      
      // Etkinlik oluşturulduğunda filtrelemeyi tekrar çalıştırmak için
      // Eğer filtredeki etkinlikleri direkt güncellemek istersek:
      if (selectedTeamFilter === 'all' || 
          (newEvent.participants && newEvent.participants.includes(currentUser?.email || ''))) {
        setFilteredEvents(prevEvents => [...prevEvents, newEvent]);
      }
      
      setShowEventModal(false);
      enqueueSnackbar('Etkinlik başarıyla oluşturuldu!', { variant: 'success' });
    } catch (error) {
      console.error('Etkinlik oluşturulurken hata:', error);
      dispatch(setError('Etkinlik oluşturulamadı'));
      enqueueSnackbar('Etkinlik oluşturulamadı!', { variant: 'error' });
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
      enqueueSnackbar('Etkinlik başarıyla güncellendi', { variant: 'success' });
    } catch (error: any) {
      dispatch(setError('Etkinlik güncellenemedi'));
      if (error.response?.status === 403) {
        enqueueSnackbar('Bu etkinliği güncellemek için izniniz yok!', { variant: 'error' });
      } else {
        enqueueSnackbar('Etkinlik güncellenemedi!', { variant: 'error' });
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
      enqueueSnackbar('Etkinlik başarıyla silindi', { variant: 'success' });
    } catch (error) {
      console.error('Etkinlik silinirken hata:', error);
      dispatch(setError('Etkinlik silinemedi'));
      enqueueSnackbar('Etkinlik silinemedi!', { variant: 'error' });
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

  if (loading || loadingTeams) {
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
        <div className="flex items-center justify-between mb-4">
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
              {currentDate.toLocaleString("tr-TR", {
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
              Bugün
            </button>
          </div>
          <div className="flex space-x-3">
            <div className="flex items-center space-x-2">
              <select
                value={selectedTeamFilter}
                onChange={(e) => setSelectedTeamFilter(e.target.value)}
                className={`px-4 py-2 rounded-md cursor-pointer !rounded-button ${
                  isDarkMode 
                    ? 'bg-gray-700 text-gray-200 border-gray-600' 
                    : 'bg-white text-gray-700 border-gray-300'
                } border`}
              >
                <option value="all">Tümünü Gör</option>
                {userTeams.length > 0 && (
                  <>
                    <optgroup label="Sahip Olduğunuz Ekipler">
                      {userTeams
                        .filter(team => team.createdById === currentUser?.id)
                        .map(team => (
                          <option key={team.id} value={team.id}>
                            {team.name}
                          </option>
                        ))
                      }
                    </optgroup>
                    <optgroup label="Üye Olduğunuz Ekipler">
                      {userTeams
                        .filter(team => team.createdById !== currentUser?.id)
                        .map(team => (
                          <option key={team.id} value={team.id}>
                            {team.name}
                          </option>
                        ))
                      }
                    </optgroup>
                  </>
                )}
              </select>
            </div>
            <button
              onClick={() => setShowEventModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2 cursor-pointer !rounded-button"
            >
              <i className="fas fa-plus"></i>
              <span>Yeni Etkinlik</span>
            </button>
          </div>
        </div>

        <div className="flex space-x-6">
          {/* Calendar Grid */}
          <div className={`flex-1 ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          } rounded-lg shadow-md p-6`}>
            <div className="grid grid-cols-7 gap-4 mb-4">
              {["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"].map((day) => (
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
                      <div className="flex flex-col gap-1">
                        {filteredEvents
                          .filter(event => {
                            // Başlangıç ve bitiş tarihleri arasındaki tüm günleri kontrol et
                            const eventStartDate = new Date(event.startDate);
                            const eventEndDate = new Date(event.endDate);
                            const currentMonthDate = new Date(
                              currentDate.getFullYear(),
                              currentDate.getMonth(),
                              day || 1
                            );
                            
                            // Tarih sınırlarını saat kısmı olmadan karşılaştırmak için
                            const dayDate = compareDate(currentMonthDate);
                            const startDay = compareDate(eventStartDate);
                            const endDay = compareDate(eventEndDate);
                            
                            // Eğer currentMonthDate, startDate ve endDate arasındaysa göster
                            return dayDate >= startDay && dayDate <= endDay;
                          })
                          .slice(0, 3)
                          .map(event => (
                            <div
                              key={event.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvent(event);
                                setIsEditModalOpen(true);
                              }}
                              className={`p-1 px-2 rounded text-xs ${getEventColor(event.priority as 'High' | 'Medium' | 'Low')} text-white truncate flex items-center`}
                            >
                              {new Date(event.startDate).getDate() !== day && (
                                <span className="mr-1">◀</span>
                              )}
                              {event.title}
                              {new Date(event.endDate).getDate() !== day && (
                                <span className="ml-1">▶</span>
                              )}
                            </div>
                          ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Selected Date Events */}
          <div className={`w-1/3 ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          } rounded-lg shadow-md p-6`}>
            <h3 className={`text-xl font-semibold mb-6 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {new Date(selectedDate).toLocaleDateString('tr-TR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
              })}
            </h3>
            <div className="space-y-4">
              {filteredEvents.filter(event => {
                const selectedDateObj = new Date(selectedDate);
                const eventStartDate = new Date(event.startDate);
                const eventEndDate = new Date(event.endDate);
                
                // Tarih sınırlarını saat kısmı olmadan karşılaştırmak için
                const dayDate = compareDate(selectedDateObj);
                const startDay = compareDate(eventStartDate);
                const endDay = compareDate(eventEndDate);
                
                // Eğer selectedDate, startDate ve endDate arasındaysa göster
                return dayDate >= startDay && dayDate <= endDay;
              }).length === 0 ? (
                <p className={`text-center py-4 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Bu tarihte etkinlik bulunmuyor
                </p>
              ) : (
                filteredEvents
                  .filter(event => {
                    const selectedDateObj = new Date(selectedDate);
                    const eventStartDate = new Date(event.startDate);
                    const eventEndDate = new Date(event.endDate);
                    
                    // Tarih sınırlarını saat kısmı olmadan karşılaştırmak için
                    const dayDate = compareDate(selectedDateObj);
                    const startDay = compareDate(eventStartDate);
                    const endDay = compareDate(eventEndDate);
                    
                    // Eğer selectedDate, startDate ve endDate arasındaysa göster
                    return dayDate >= startDay && dayDate <= endDay;
                  })
                  .map(event => (
                    <div
                      key={event.id}
                      className={`p-4 rounded-lg ${
                        isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                      } relative`}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className={`font-semibold ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {event.title}
                        </h4>
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => {
                              setSelectedEvent(event);
                              setIsEditModalOpen(true);
                            }}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button 
                            onClick={() => {
                              if (window.confirm('Bu etkinliği silmek istediğinizden emin misiniz?')) {
                                handleDeleteEvent(event.id);
                              }
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </div>
                      </div>
                      <div className={`mt-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        <p className="flex items-center">
                          <i className="far fa-clock mr-2"></i>
                          {event.startTime} - {event.endTime}
                        </p>
                        <p className="flex items-center mt-1">
                          <i className="far fa-calendar mr-2"></i>
                          {new Date(event.startDate).toLocaleDateString('tr-TR')} 
                          {event.startDate !== event.endDate && (
                            <> - {new Date(event.endDate).toLocaleDateString('tr-TR')}</>
                          )}
                        </p>
                        <p className="mt-1">{event.description}</p>
                        <div className="flex items-center mt-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${getEventColor(event.priority as 'High' | 'Medium' | 'Low')}`}>
                            {event.priority}
                          </span>
                          <span className="ml-2 text-xs px-2 py-1 bg-gray-200 text-gray-800 rounded-full">
                            {event.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

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
      </div>
      <Footer />
    </div>
  );
};

export default Calendar;
