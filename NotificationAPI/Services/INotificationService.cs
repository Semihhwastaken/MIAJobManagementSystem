using NotificationAPI.Models;
using System.Collections.Generic;

namespace NotificationAPI.Services
{
    public interface INotificationService
    {
        Task<IEnumerable<Notification>> GetUserNotificationsAsync(string userId);
        Task<IEnumerable<Notification>> GetUnreadNotificationsAsync(string userId);
        Task<bool> MarkAsReadAsync(string notificationId);
        Task<bool> MarkAllAsReadAsync(string userId);
        Task<bool> DeleteNotificationAsync(string notificationId);
        Task SendBulkNotificationsAsync(List<Notification> notifications);
        Task<Notification> SendTestNotificationAsync(string userId);
        Task<Notification> CreateNotificationAsync(Notification notification);
    }
}
