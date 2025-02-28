using Microsoft.AspNetCore.Mvc;
using NotificationAPI.Models;
using NotificationAPI.Services;
using NotificationAPI.Hubs;
using Microsoft.AspNetCore.SignalR;
using NotificationAPI.Settings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Caching.Memory;

namespace NotificationAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class NotificationsController : ControllerBase
    {
        private readonly INotificationService _notificationService;
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly ILogger<NotificationsController> _logger;
        private readonly IMemoryCache _cache;

        public NotificationsController(
            INotificationService notificationService, 
            IHubContext<NotificationHub> hubContext,
            ILogger<NotificationsController> logger,
            IMemoryCache cache)
        {
            _notificationService = notificationService;
            _hubContext = hubContext;
            _logger = logger;
            _cache = cache;
        }

        [HttpGet("user/{userId}")]
        [ResponseCache(Duration = 30)] // 30 saniyelik cache
        public async Task<ActionResult<IEnumerable<Notification>>> GetUserNotifications(string userId)
        {
            var cacheKey = $"notifications-{userId}";
            
            if (_cache.TryGetValue(cacheKey, out IEnumerable<Notification> cachedNotifications))
            {
                return Ok(cachedNotifications);
            }

            var notifications = await _notificationService.GetUserNotificationsAsync(userId);
            
            var cacheEntryOptions = new MemoryCacheEntryOptions()
                .SetSlidingExpiration(TimeSpan.FromSeconds(30))
                .SetAbsoluteExpiration(TimeSpan.FromMinutes(10));
                
            _cache.Set(cacheKey, notifications, cacheEntryOptions);
            
            return Ok(notifications);
        }

        [HttpGet("user/{userId}/unread")]
        public async Task<ActionResult<IEnumerable<Notification>>> GetUnreadNotifications(string userId)
        {
            try
            {
                var notifications = await _notificationService.GetUnreadNotificationsAsync(userId);
                return Ok(notifications);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Okunmamış bildirimleri getirme hatası: {Message}", ex.Message);
                return StatusCode(500, new { message = "Okunmamış bildirimler getirilirken bir hata oluştu." });
            }
        }

        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkAsRead(string id)
        {
            try
            {
                var success = await _notificationService.MarkAsReadAsync(id);
                if (!success)
                    return NotFound();

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Bildirimi okundu olarak işaretleme hatası: {Message}", ex.Message);
                return StatusCode(500, new { message = "Bildirim okundu olarak işaretlenirken bir hata oluştu." });
            }
        }

        [HttpPut("user/{userId}/read-all")]
        public async Task<IActionResult> MarkAllAsRead(string userId)
        {
            try
            {
                var success = await _notificationService.MarkAllAsReadAsync(userId);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Tüm bildirimleri okundu olarak işaretleme hatası: {Message}", ex.Message);
                return StatusCode(500, new { message = "Bildirimler okundu olarak işaretlenirken bir hata oluştu." });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteNotification(string id)
        {
            try
            {
                var success = await _notificationService.DeleteNotificationAsync(id);
                if (!success)
                    return NotFound();

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Bildirim silme hatası: {Message}", ex.Message);
                return StatusCode(500, new { message = "Bildirim silinirken bir hata oluştu." });
            }
        }

        /// <summary>
        /// JobTrackingAPI'den gelen bildirimleri alır ve işler
        /// </summary>
        /// <param name="notification">Bildirim nesnesi</param>
        /// <returns>Oluşturulan bildirim</returns>
        [HttpPost]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<Notification>> CreateNotification([FromBody] Notification notification)
        {
            try
            {
                _logger.LogInformation("Bildirim alındı. UserId: {UserId}, Title: {Title}, Type: {Type}", 
                    notification.UserId, notification.Title, notification.Type);
                
                if (string.IsNullOrEmpty(notification.UserId) || string.IsNullOrEmpty(notification.Title))
                {
                    return BadRequest(new { message = "UserId ve Title alanları zorunludur." });
                }
                
                var createdNotification = await _notificationService.CreateNotificationAsync(notification);
                
                _logger.LogInformation("Bildirim başarıyla oluşturuldu. Id: {Id}", createdNotification.Id);
                
                return CreatedAtAction(nameof(GetUserNotifications), 
                    new { userId = notification.UserId }, createdNotification);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Bildirim oluşturma hatası: {Message}", ex.Message);
                return StatusCode(500, new { message = "Bildirim oluşturulurken bir hata oluştu." });
            }
        }

        /// <summary>
        /// Test amaçlı bildirim gönderir
        /// </summary>
        /// <param name="userId">Bildirimin gönderileceği kullanıcı ID'si</param>
        /// <returns>Bildirim gönderme durumu</returns>
        // [Authorize] - Test için geçici olarak kaldırıldı
        [HttpPost("test")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<Notification>> SendTestNotification([FromQuery] string userId)
        {
            try
            {
                _logger.LogInformation("Test bildirimi isteği alındı. UserId: {UserId}", userId);
                
                var notification = await _notificationService.SendTestNotificationAsync(userId);
                
                _logger.LogInformation("Test bildirimi başarıyla gönderildi. Id: {Id}", notification.Id);
                
                return Ok(new { message = "Test bildirimi başarıyla gönderildi", notification });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Test bildirimi gönderme hatası: {Message}", ex.Message);
                return StatusCode(500, $"Test bildirimi gönderme hatası: {ex.Message}");
            }
        }
    }
}
