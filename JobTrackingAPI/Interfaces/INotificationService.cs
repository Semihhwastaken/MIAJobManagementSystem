using JobTrackingAPI.DTOs;
using JobTrackingAPI.Enums;
using System.Threading.Tasks;

namespace JobTrackingAPI.Services
{
    /// <summary>
    /// Bildirim servislerini tanımlayan arayüz
    /// </summary>
    public interface INotificationService
    {
        /// <summary>
        /// Bildirim gönderir
        /// </summary>
        /// <param name="notification">Bildirim nesnesi</param>
        /// <returns>İşlem başarılı ise true, değilse false</returns>
        Task<bool> SendNotificationAsync(NotificationDto notification);

        /// <summary>
        /// Kullanıcıya bildirim gönderir
        /// </summary>
        /// <param name="userId">Kullanıcı ID'si</param>
        /// <param name="title">Bildirim başlığı</param>
        /// <param name="message">Bildirim mesajı</param>
        /// <param name="notificationType">Bildirim tipi</param>
        /// <param name="relatedJobId">İlgili iş ID'si (opsiyonel)</param>
        /// <returns>İşlem başarılı ise true, değilse false</returns>
        Task<bool> SendNotificationAsync(
            string userId, 
            string title, 
            string message, 
            NotificationType notificationType, 
            string? relatedJobId = null);

        Task<bool> SendFeedbackResponseNotificationAsync(
            string userId,
            string feedbackContent,
            string response);
    }
}
