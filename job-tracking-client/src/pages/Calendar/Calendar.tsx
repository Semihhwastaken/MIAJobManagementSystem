import { motion } from 'framer-motion';
import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

interface Event {
  id: string;
  title: string;
  start: string;
  end: string;
  priority: 'High' | 'Medium' | 'Low';
  participants?: { id: string; avatar: string }[];
}

const Calendar = () => {
  const { isDarkMode } = useTheme();
  const [viewMode, setViewMode] = useState<'Month' | 'Week' | 'Day'>('Week');
  const [currentWeek] = useState('February 20 - 26, 2025');

  // Example events
  const events: Event[] = [
    {
      id: '1',
      title: 'Product Strategy Meeting',
      start: '9:00',
      end: '10:30',
      priority: 'High',
      participants: [
        { id: '1', avatar: '/avatars/user1.jpg' },
        { id: '2', avatar: '/avatars/user2.jpg' }
      ]
    },
    {
      id: '2',
      title: 'UI/UX Design Review',
      start: '11:00',
      end: '12:30',
      priority: 'Medium'
    },
    {
      id: '3',
      title: 'Team Coordination',
      start: '15:00',
      end: '16:00',
      priority: 'High'
    }
  ];

  const timeSlots = Array.from({ length: 9 }, (_, i) => {
    const hour = 8 + i;
    return `${hour}:00 ${hour < 12 ? 'AM' : 'PM'}`;
  });

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const dates = [20, 21, 22, 23, 24];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`min-h-screen p-6 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'}`}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Calendar</h1>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Manage your schedule and team meetings
            </p>
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
            <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-indigo-700 transition-colors">
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
                    className={`absolute left-0 right-0 mx-2 p-2 rounded-lg ${
                      event.priority === 'High'
                        ? 'bg-red-100 border-l-4 border-red-500'
                        : event.priority === 'Medium'
                        ? 'bg-green-100 border-l-4 border-green-500'
                        : 'bg-blue-100 border-l-4 border-blue-500'
                    }`}
                    style={{
                      top: `${(parseInt(event.start.split(':')[0]) - 8) * 5}rem`,
                      height: '5rem'
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{event.title}</p>
                        <p className="text-xs text-gray-600">{`${event.start} - ${event.end}`}</p>
                      </div>
                      {event.priority === 'High' && (
                        <span className="px-2 py-1 text-xs font-medium bg-red-200 text-red-800 rounded-full">
                          High
                        </span>
                      )}
                    </div>
                    {event.participants && (
                      <div className="flex -space-x-2 mt-2">
                        {event.participants.map((participant) => (
                          <div
                            key={participant.id}
                            className="w-6 h-6 rounded-full bg-gray-300"
                          ></div>
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
    </motion.div>
  );
};

export default Calendar;
