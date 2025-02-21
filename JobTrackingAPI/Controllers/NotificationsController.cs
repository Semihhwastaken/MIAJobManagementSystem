using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using JobTrackingAPI.Models;

namespace JobTrackingAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class NotificationsController : ControllerBase
    {
        private readonly IMongoCollection<Notification> _notifications;

        public NotificationsController(IMongoDatabase database)
        {
            _notifications = database.GetCollection<Notification>("Notifications");
        }

        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<Notification>>> GetUserNotifications(string userId)
        {
            var notifications = await _notifications.Find(n => n.UserId == userId)
                                                  .SortByDescending(n => n.CreatedDate)
                                                  .ToListAsync();
            return Ok(notifications);
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
    }
}
