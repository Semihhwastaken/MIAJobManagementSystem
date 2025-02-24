import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../../redux/hooks';
import axiosInstance from '../../services/axiosInstance';
import SignalRService from '../../services/signalRService';
import { Transition } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Notification } from '../../types/notification';

export const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, isAuthenticated, token } = useAppSelector(state => state.auth);
  const signalRService = SignalRService.getInstance();

  useEffect(() => {
    // Check if we have all required auth data
    if (!user?.id || !isAuthenticated || !token) {
      console.warn('Waiting for authentication data...', {
        userId: user?.id,
        isAuthenticated,
        hasToken: !!token
      });
      return;
    }

    console.log('Authentication data loaded:', {
      userId: user.id,
      username: user.username,
      isAuthenticated
    });

    fetchNotifications();
    initializeSignalR();
  }, [user?.id, isAuthenticated, token]);

  const initializeSignalR = async () => {
    try {
      if (user?.id) {
        await signalRService.startConnection(user.id);
        signalRService.onReceiveNotification((notification: Notification) => {
          setNotifications(prev => [notification, ...prev]);
          setUnreadCount(prev => prev + 1);
          showNotificationToast(notification);
        });
      }
    } catch (error) {
      console.error('SignalR connection error:', error);
    }
  };

  const showNotificationToast = (notification: Notification) => {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 mb-4 transition-all duration-500 transform translate-y-0 z-50';
    toast.innerHTML = `
      <div class="flex items-center">
        <div class="flex-shrink-0">
          ${getNotificationIcon(notification.type)}
        </div>
        <div class="ml-3">
          <p class="text-sm font-medium text-gray-900">${notification.title}</p>
          <p class="text-sm text-gray-500">${notification.message}</p>
        </div>
      </div>
    `;

    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 500);
    }, 5000);
  };

  const fetchNotifications = async () => {
    if (!user?.id) {
      console.warn('Cannot fetch notifications: User ID not found');
      return;
    }

    try {
      const url = `/Notifications/user/${user.id}`;
      console.log('Fetching notifications from:', url, {
        userId: user.id,
        token: token?.substring(0, 10) + '...' // Only log first 10 chars of token for security
      });

      const response = await axiosInstance.get(url);

      if (Array.isArray(response.data)) {
        console.log('Notifications fetched successfully:', response.data.length);
        setNotifications(response.data);
        const unreadNotifications = response.data.filter((n: Notification) => !n.isRead);
        setUnreadCount(unreadNotifications.length);
      } else {
        console.error('Invalid API response format:', response.data);
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await axiosInstance.put(`/Notifications/${id}/read`);
      setNotifications(notifications.map(n =>
        n.id === id ? { ...n, isRead: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;

    try {
      await axiosInstance.put(`/Notifications/user/${user.id}/read-all`);
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'Comment':
        return '💬';
      case 'Mention':
        return '@';
      case 'TaskAssigned':
        return '📋';
      case 'TaskUpdated':
        return '🔄';
      case 'TaskCompleted':
        return '✅';
      case 'Reminder':
        return '⏰';
      case 'Message':
        return '✉️';
      default:
        return '📢';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="relative">
      {/* Notification Bell Icon */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 11 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
        </svg>
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full"
            >
              {unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Notification Panel */}
      <Transition
        show={isOpen}
        enter="transition ease-out duration-200"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-150"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg py-1 z-50">
          <div className="px-4 py-2 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Bildirimler</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Tümünü Okundu İşaretle
                </button>
              )}
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <AnimatePresence>
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                    className={`px-4 py-3 hover:bg-gray-50 cursor-pointer ${!notification.isRead ? 'bg-blue-50' : ''
                      }`}
                    onClick={() => notification.id && handleMarkAsRead(notification.id)}
                  >
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">
                          {notification.title}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDate(notification.createdDate)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="px-4 py-6 text-center text-gray-500">
                  Henüz bildirim yok
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </Transition>
    </div>
  );
};
