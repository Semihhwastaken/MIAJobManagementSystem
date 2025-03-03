using Microsoft.AspNetCore.Mvc;
using JobTrackingAPI.Models;
using JobTrackingAPI.Services;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using JobTrackingAPI.DTOs;
using MongoDB.Driver;
using JobTrackingAPI.Enums;

namespace JobTrackingAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CommentController : ControllerBase
    {
        private readonly IMongoCollection<Comment> _comments;
        private readonly IMongoCollection<NotificationDto> _notifications;
        private readonly IMongoCollection<User> _users;
        private readonly IMongoCollection<TaskItem> _tasksCollection;
        private readonly INotificationService _notificationService;

        public CommentController(
            IMongoDatabase database, 
            INotificationService notificationService)
        {
            _comments = database.GetCollection<Comment>("Comments");
            _notifications = database.GetCollection<NotificationDto>("Notifications");
            _users = database.GetCollection<User>("Users");
            _tasksCollection = database.GetCollection<TaskItem>("Tasks");
            _notificationService = notificationService;
        }

        // TaskId'ye göre yorumları getirir
        [HttpGet("task/{taskId}")]
        public async Task<ActionResult<IEnumerable<Comment>>> GetCommentsByTask(string taskId)
        {
            var comments = await _comments.Find(c => c.TaskId == taskId)
                                          .SortByDescending(c => c.CreatedDate)
                                          .ToListAsync();
            return Ok(comments);
        }

        // Yeni yorum oluşturur ve mention varsa bildirim ekler
        [HttpPost]
        public async Task<ActionResult<Comment>> CreateComment([FromBody] Comment comment)
        {
            // @ ile başlayan kullanıcı adlarını Regex ile tespit et
            var mentions = System.Text.RegularExpressions.Regex.Matches(comment.Content, @"@(\w+)")
                                .Select(m => m.Groups[1].Value)
                                .ToList();

            // Kullanıcıların varlığını kontrol et
            var mentionedUsers = await _users.Find(u => mentions.Contains(u.Username))
                                             .ToListAsync();
            comment.Mentions = mentionedUsers.Select(u => u.Id).ToList();
            await _comments.InsertOneAsync(comment);

            // Bildirim gönderimi
            foreach (var user in mentionedUsers)
            {
                var notification = new NotificationDto
                {
                    UserId = user.Id,
                    Title = "Yeni Mention",
                    Message = $"Bir yorumda {comment.UserId} tarafından etiketlendiniz.",
                    Type = NotificationType.Comment,
                    RelatedJobId = comment.TaskId
                };
                
                // Notification API'ye bildirim gönder
                await _notificationService.SendNotificationAsync(notification);
            }
            return CreatedAtAction(nameof(GetCommentsByTask), new { taskId = comment.TaskId }, comment);
        }

        // Yorum siler
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteComment(string id)
        {
            var result = await _comments.DeleteOneAsync(c => c.Id == id);
            if (result.DeletedCount == 0)
                return NotFound();
            return NoContent();
        }

        // Yorum ekine attachment ekler
        [HttpPost("{commentId}/attachments")]
        public async Task<IActionResult> AddAttachment(string commentId, [FromBody] Attachment attachment)
        {
            var update = Builders<Comment>.Update.Push(c => c.Attachments, attachment);
            var result = await _comments.UpdateOneAsync(c => c.Id == commentId, update);
            if (result.ModifiedCount == 0)
                return NotFound();
            return Ok(attachment);
        }

        // Yeni endpoint: Kullanıcının atanmış görevine yorum ekler
        [HttpPost("user-task-comment")]
        [Authorize]
        public async Task<ActionResult<Comment>> CreateUserTaskComment([FromBody] UserTaskCommentRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            // Görevin mevcut olduğunu ve kullanıcıya atandığını doğrula
            var task = await _tasksCollection.Find(t => t.Id == request.TaskId && t.AssignedUsers.Any(u => u.Id == userId)).FirstOrDefaultAsync();
            if (task == null)
            {
                return BadRequest(new { error = "Görev bulunamadı veya kullanıcıya atanmadı." });
            }

            // Yorumu oluştur
            var comment = new Comment(request.TaskId, userId, request.Content);
            await _comments.InsertOneAsync(comment);

            // Kullanıcı için bildirim oluştur
            var notification = new NotificationDto
            {
                UserId = userId,
                Title = "Yeni Yorum",
                Message = "Görevinizle ilgili yeni yorum eklendi.",
                Type = NotificationType.Comment,
                RelatedJobId = request.TaskId
            };
            
            // Notification API'ye bildirim gönder
            await _notificationService.SendNotificationAsync(notification);

            return Ok(comment);
        }
    }

    // Göreve yorum eklemek için DTO
    public class UserTaskCommentRequest
    {
        public string TaskId { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
    }
}
