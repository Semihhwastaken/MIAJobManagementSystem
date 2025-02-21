using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using JobTrackingAPI.Models;
using System.Text.RegularExpressions;

namespace JobTrackingAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CommentsController : ControllerBase
    {
        private readonly IMongoCollection<Comment> _comments;
        private readonly IMongoCollection<Notification> _notifications;
        private readonly IMongoCollection<User> _users;

        public CommentsController(IMongoDatabase database)
        {
            _comments = database.GetCollection<Comment>("Comments");
            _notifications = database.GetCollection<Notification>("Notifications");
            _users = database.GetCollection<User>("Users");
        }

        [HttpGet("job/{jobId}")]
        public async Task<ActionResult<IEnumerable<Comment>>> GetJobComments(string jobId)
        {
            var comments = await _comments.Find(c => c.JobId == jobId)
                                        .SortByDescending(c => c.CreatedDate)
                                        .ToListAsync();
            return Ok(comments);
        }

        [HttpPost]
        public async Task<ActionResult<Comment>> CreateComment([FromBody] Comment comment)
        {
            // Extract mentions from content using regex
            var mentions = Regex.Matches(comment.Content, @"@(\w+)")
                              .Select(m => m.Groups[1].Value)
                              .ToList();

            // Validate mentioned users exist
            var mentionedUsers = await _users.Find(u => mentions.Contains(u.Username))
                                           .ToListAsync();

            comment.Mentions = mentionedUsers.Select(u => u.Id).ToList();
            await _comments.InsertOneAsync(comment);

            // Create notifications for mentioned users
            foreach (var user in mentionedUsers)
            {
                var notification = new Notification(
                    userId: user.Id,
                    title: "New Mention",
                    message: $"You were mentioned in a comment by {comment.UserId}",
                    type: NotificationType.Mention,
                    relatedJobId: comment.JobId
                );
                await _notifications.InsertOneAsync(notification);
            }

            return CreatedAtAction(nameof(GetJobComments), new { jobId = comment.JobId }, comment);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteComment(string id)
        {
            var result = await _comments.DeleteOneAsync(c => c.Id == id);
            
            if (result.DeletedCount == 0)
                return NotFound();

            return NoContent();
        }

        [HttpPost("{commentId}/attachments")]
        public async Task<IActionResult> AddAttachment(string commentId, [FromBody] Attachment attachment)
        {
            var update = Builders<Comment>.Update.Push(c => c.Attachments, attachment);
            var result = await _comments.UpdateOneAsync(c => c.Id == commentId, update);

            if (result.ModifiedCount == 0)
                return NotFound();

            return Ok(attachment);
        }
    }
}
