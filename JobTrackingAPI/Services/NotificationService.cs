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
            _notificationApiBaseUrl = configuration["NotificationApiSettings:BaseUrl"] ?? "https://miajobmanagementsystem-1-15so.onrender.com";
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

        public async Task<bool> SendFeedbackResponseNotificationAsync(string userId, string feedbackContent, string response)
        {
            var notification = new NotificationDto
            {
                UserId = userId,
                Title = "Geri Bildiriminize Yanıt",
                Message = $"'{feedbackContent.Substring(0, Math.Min(50, feedbackContent.Length))}...' için yanıt: {response}",
                Type = NotificationType.FeedbackResponse,
            };
            _logger.LogInformation("Sending feedback response notification to {UserId}. Content: {Content}, Response: {Response}", userId, feedbackContent, response);

            return await SendNotificationAsync(notification);
        }
    }
}
