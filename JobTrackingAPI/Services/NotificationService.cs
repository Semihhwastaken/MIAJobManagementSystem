using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using JobTrackingAPI.DTOs;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using JobTrackingAPI.Enums;

namespace JobTrackingAPI.Services
{
    /// <summary>
    /// Bildirim servislerini yöneten sınıf
    /// </summary>
    public class NotificationService : INotificationService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<NotificationService> _logger;
        private readonly string _notificationApiBaseUrl;

        /// <summary>
        /// NotificationService sınıfının yapıcı metodu
        /// </summary>
        /// <param name="httpClient">HTTP istemcisi</param>
        /// <param name="configuration">Uygulama yapılandırması</param>
        /// <param name="logger">Loglama servisi</param>
        public NotificationService(
            HttpClient httpClient,
            IConfiguration configuration,
            ILogger<NotificationService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
            _notificationApiBaseUrl = configuration["NotificationApiSettings:BaseUrl"] ?? "http://localhost:8080";
        }

        /// <summary>
        /// Bildirim gönderir
        /// </summary>
        /// <param name="notification">Bildirim nesnesi</param>
        /// <returns>İşlem başarılı ise true, değilse false</returns>
        public async Task<bool> SendNotificationAsync(NotificationDto notification)
        {
            try
            {
                _logger.LogInformation("Sending notification to {BaseUrl}/api/Notifications. UserId: {UserId}, Title: {Title}, Type: {Type}, RelatedJobId: {RelatedJobId}, Message: {Message}", 
                    _notificationApiBaseUrl, notification.UserId, notification.Title, notification.Type, notification.RelatedJobId, notification.Message);
                
                var response = await _httpClient.PostAsJsonAsync(
                    $"{_notificationApiBaseUrl}/api/Notifications", 
                    notification);

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("Notification sent successfully. UserId: {UserId}, Title: {Title}", 
                        notification.UserId, notification.Title);
                    return true;
                }
                else
                {
                    var content = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning("Notification sending failed. StatusCode: {StatusCode}, Response: {Response}, UserId: {UserId}", 
                        response.StatusCode, content, notification.UserId);
                    
                    // Try sending a test notification to check if the API is accessible
                    await SendTestNotificationAsync(notification.UserId);
                    
                    return false;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending notification. UserId: {UserId}", notification.UserId);
                return false;
            }
        }

        /// <summary>
        /// Kullanıcıya bildirim gönderir
        /// </summary>
        /// <param name="userId">Kullanıcı ID'si</param>
        /// <param name="title">Bildirim başlığı</param>
        /// <param name="message">Bildirim mesajı</param>
        /// <param name="notificationType">Bildirim tipi</param>
        /// <param name="relatedJobId">İlgili iş ID'si (opsiyonel)</param>
        /// <returns>İşlem başarılı ise true, değilse false</returns>
        public async Task<bool> SendNotificationAsync(
            string userId, 
            string title, 
            string message, 
            NotificationType notificationType, 
            string? relatedJobId = null)
        {
            try
            {
                var notification = new NotificationDto
                {
                    UserId = userId,
                    Title = title,
                    Message = message,
                    Type = notificationType,
                    RelatedJobId = relatedJobId
                };

                return await SendNotificationAsync(notification);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating notification. UserId: {UserId}", userId);
                return false;
            }
        }

        /// <summary>
        /// İş atama bildirimi gönderir
        /// </summary>
        /// <param name="userId">Kullanıcı ID'si</param>
        /// <param name="jobId">İş ID'si</param>
        /// <param name="jobTitle">İş başlığı</param>
        /// <returns>İşlem başarılı ise true, değilse false</returns>
        public async Task<bool> SendJobAssignmentNotificationAsync(string userId, string jobId, string jobTitle)
        {
            var title = "Yeni İş Atandı";
            var message = $"Size \"{jobTitle}\" başlıklı yeni bir iş atandı.";
            return await SendNotificationAsync(userId, title, message, NotificationType.TaskAssigned, jobId);
        }

        /// <summary>
        /// İş durumu değişikliği bildirimi gönderir
        /// </summary>
        /// <param name="userId">Kullanıcı ID'si</param>
        /// <param name="jobId">İş ID'si</param>
        /// <param name="jobTitle">İş başlığı</param>
        /// <param name="newStatus">Yeni durum</param>
        /// <returns>İşlem başarılı ise true, değilse false</returns>
        public async Task<bool> SendJobStatusChangeNotificationAsync(
            string userId, 
            string jobId, 
            string jobTitle, 
            string newStatus)
        {
            var title = "İş Durumu Değişti";
            var message = $"\"{jobTitle}\" başlıklı işin durumu \"{newStatus}\" olarak güncellendi.";
            return await SendNotificationAsync(userId, title, message, NotificationType.TaskUpdated, jobId);
        }

        /// <summary>
        /// Yorum bildirimi gönderir
        /// </summary>
        /// <param name="userId">Kullanıcı ID'si</param>
        /// <param name="jobId">İş ID'si</param>
        /// <param name="jobTitle">İş başlığı</param>
        /// <param name="commenterName">Yorum yapan kişinin adı</param>
        /// <returns>İşlem başarılı ise true, değilse false</returns>
        public async Task<bool> SendCommentNotificationAsync(
            string userId, 
            string jobId, 
            string jobTitle, 
            string commenterName)
        {
            var title = "Yeni Yorum";
            var message = $"\"{jobTitle}\" başlıklı işe {commenterName} tarafından yeni bir yorum eklendi.";
            return await SendNotificationAsync(userId, title, message, NotificationType.Comment, jobId);
        }

        /// <summary>
        /// Test bildirimi gönderir
        /// </summary>
        /// <param name="userId">Kullanıcı ID'si</param>
        /// <returns>İşlem başarılı ise true, değilse false</returns>
        public async Task<bool> SendTestNotificationAsync(string userId)
        {
            try
            {
                _logger.LogInformation("Sending test notification to check API connectivity");
                
                var testNotification = new NotificationDto
                {
                    UserId = userId,
                    Title = "Test Bildirimi",
                    Message = "Bu bir test bildirimidir. API bağlantısını kontrol etmek için gönderilmiştir.",
                    Type = NotificationType.Message,
                };

                var json = JsonSerializer.Serialize(testNotification);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync(
                    $"{_notificationApiBaseUrl}/api/Notifications/test", 
                    content);

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("Test notification sent successfully");
                    return true;
                }
                else
                {
                    var responseContent = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning("Test notification failed. StatusCode: {StatusCode}, Response: {Response}", 
                        response.StatusCode, responseContent);
                    return false;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending test notification");
                return false;
            }
        }
    }
}
