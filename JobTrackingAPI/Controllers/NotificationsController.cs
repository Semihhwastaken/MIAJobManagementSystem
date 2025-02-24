using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using JobTrackingAPI.Models;
using Microsoft.AspNetCore.Authorization;
using JobTrackingAPI.Hubs;
using Microsoft.AspNetCore.SignalR;
using JobTrackingAPI.Enums;

namespace JobTrackingAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class NotificationsController : ControllerBase
    {
        private readonly IMongoCollection<Notification> _notifications;
        private readonly IHubContext<NotificationHub> _hubContext;

        public NotificationsController(IMongoDatabase database, IHubContext<NotificationHub> hubContext)
        {
            _notifications = database.GetCollection<Notification>("Notifications");
            _hubContext = hubContext;
        }

        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<Notification>>> GetUserNotifications(string userId)
        {
            try
            {
                var notifications = await _notifications.Find(n => n.UserId == userId)
                                                      .SortByDescending(n => n.CreatedDate)
                                                      .ToListAsync();
                return Ok(notifications);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Bildirim getirme hatası: {ex.Message}");
                return StatusCode(500, new { message = "Bildirimler getirilirken bir hata oluştu." });
            }
        }

        [HttpGet("user/{userId}/unread")]
        public async Task<ActionResult<IEnumerable<Notification>>> GetUnreadNotifications(string userId)
        {
            var notifications = await _notifications.Find(n => n.UserId == userId && !n.IsRead)
                                                  .SortByDescending(n => n.CreatedDate)
                                                  .ToListAsync();
            return Ok(notifications);
        }

        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkAsRead(string id)
        {
            var update = Builders<Notification>.Update.Set(n => n.IsRead, true);
            var result = await _notifications.UpdateOneAsync(n => n.Id == id, update);

            if (result.ModifiedCount == 0)
                return NotFound();

            return NoContent();
        }

        [HttpPut("user/{userId}/read-all")]
        public async Task<IActionResult> MarkAllAsRead(string userId)
        {
            var update = Builders<Notification>.Update.Set(n => n.IsRead, true);
            var result = await _notifications.UpdateManyAsync(
                n => n.UserId == userId && !n.IsRead,
                update
            );

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteNotification(string id)
        {
            var result = await _notifications.DeleteOneAsync(n => n.Id == id);

            if (result.DeletedCount == 0)
                return NotFound();

            return NoContent();
        }

        /// <summary>
        /// Test amaçlı bildirim gönderir
        /// </summary>
        /// <param name="userId">Bildirimin gönderileceği kullanıcı ID'si</param>
        /// <returns>Bildirim gönderme durumu</returns>
        [Authorize]
        [HttpPost("test")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> SendTestNotification([FromQuery] string userId)
        {
            try
            {
                // Yeni test bildirimi oluştur
                var notification = new Notification(
                    userId: userId,
                    title: "Test Bildirimi",
                    message: "Bu bir test bildirimidir.",
                    type: NotificationType.Message,
                    relatedJobId: null
                );

                // Bildirimi veritabanına kaydet
                await _notifications.InsertOneAsync(notification);

                // SignalR ile gerçek zamanlı bildirim gönder
                await _hubContext.Clients.User(userId).SendAsync("ReceiveNotification", notification);
                
                return Ok(new { message = "Test bildirimi başarıyla gönderildi", notification });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }
}
