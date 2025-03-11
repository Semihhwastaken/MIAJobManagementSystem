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

        /// <summary>
        /// İş atama bildirimi gönderir
        /// </summary>
        /// <param name="userId">Kullanıcı ID'si</param>
        /// <param name="jobId">İş ID'si</param>
        /// <param name="jobTitle">İş başlığı</param>
        /// <returns>İşlem başarılı ise true, değilse false</returns>
        Task<bool> SendJobAssignmentNotificationAsync(string userId, string jobId, string jobTitle);

        /// <summary>
        /// İş durumu değişikliği bildirimi gönderir
        /// </summary>
        /// <param name="userId">Kullanıcı ID'si</param>
        /// <param name="jobId">İş ID'si</param>
        /// <param name="jobTitle">İş başlığı</param>
        /// <param name="newStatus">Yeni durum</param>
        /// <returns>İşlem başarılı ise true, değilse false</returns>
        Task<bool> SendJobStatusChangeNotificationAsync(
            string userId, 
            string jobId, 
            string jobTitle, 
            string newStatus);

        /// <summary>
        /// Yorum bildirimi gönderir
        /// </summary>
        /// <param name="userId">Kullanıcı ID'si</param>
        /// <param name="jobId">İş ID'si</param>
        /// <param name="jobTitle">İş başlığı</param>
        /// <param name="commenterName">Yorum yapan kişinin adı</param>
        /// <returns>İşlem başarılı ise true, değilse false</returns>
        Task<bool> SendCommentNotificationAsync(
            string userId, 
            string jobId, 
            string jobTitle, 
            string commenterName);

        /// <summary>
        /// Test bildirimi gönderir
        /// </summary>
        /// <param name="userId">Kullanıcı ID'si</param>
        /// <returns>İşlem başarılı ise true, değilse false</returns>
        Task<bool> SendTestNotificationAsync(string userId);

        /// <summary>
        /// Geri bildirim yanıt bildirimi gönderir
        /// </summary>
        /// <param name="userId">Kullanıcı ID'si</param>
        /// <param name="feedbackContent">Geri bildirim içeriği</param>
        /// <param name="response">Admin yanıtı</param>
        /// <returns>İşlem başarılı ise true, değilse false</returns>
        Task<bool> SendFeedbackResponseNotificationAsync(
            string userId,
            string feedbackContent,
            string response);
    }
}
