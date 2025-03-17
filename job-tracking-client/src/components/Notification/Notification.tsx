import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoCheckmarkCircle, IoWarning, IoInformationCircle, IoClose } from 'react-icons/io5';
import { useNotificationStore, NotificationType } from '../../store/useNotificationStore';
import { useTheme } from '@mui/material/styles';

const notificationIcons: Record<NotificationType, React.ReactNode> = {
  success: <IoCheckmarkCircle className="w-6 h-6 text-green-500" />,
  error: <IoClose className="w-6 h-6 text-red-500" />,
  warning: <IoWarning className="w-6 h-6 text-yellow-500" />,
  info: <IoInformationCircle className="w-6 h-6 text-blue-500" />,
};

export const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotificationStore();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const notificationColors = {
    success: isDarkMode 
      ? 'bg-green-900/30 border-green-800/50 text-green-300' 
      : 'bg-green-50 border-green-200 text-green-800',
    error: isDarkMode 
      ? 'bg-red-900/30 border-red-800/50 text-red-300' 
      : 'bg-red-50 border-red-200 text-red-800',
    warning: isDarkMode 
      ? 'bg-yellow-900/30 border-yellow-800/50 text-yellow-300' 
      : 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: isDarkMode 
      ? 'bg-blue-900/30 border-blue-800/50 text-blue-300' 
      : 'bg-blue-50 border-blue-200 text-blue-800',
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 min-w-[320px] max-w-[400px]">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`flex items-start p-4 rounded-lg border shadow-lg ${
              notificationColors[notification.type]
            }`}
          >
            <div className="flex-shrink-0">
              {notificationIcons[notification.type]}
            </div>
            <div className="ml-3 w-full">
              {notification.title && (
                <h3 className={`text-sm font-medium ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {notification.title}
                </h3>
              )}
              <div className={`mt-1 text-sm ${
                isDarkMode ? 'text-gray-300' : 'text-gray-500'
              }`}>
                {notification.message}
              </div>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className={`ml-4 flex-shrink-0 focus:outline-none ${
                isDarkMode ? 'text-gray-300 hover:text-gray-100' : 'text-gray-400 hover:text-gray-500'
              }`}
            >
              <IoClose className="w-5 h-5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// Fix: Export the useNotification hook so it can be imported elsewhere
export const useNotification = () => {
  const { addNotification } = useNotificationStore();

  const showNotification = (
    message: string,
    type: NotificationType = 'info',
    title?: string,
    duration = 5000,
  ) => {
    const notification = {
      message,
      type,
      title,
      duration,
    };

    addNotification(notification);
  };

  return {
    showSuccess: (message: string, title?: string) =>
      showNotification(message, 'success', title),
    showError: (message: string, title?: string) =>
      showNotification(message, 'error', title),
    showWarning: (message: string, title?: string) =>
      showNotification(message, 'warning', title),
    showInfo: (message: string, title?: string) =>
      showNotification(message, 'info', title),
  };
};
