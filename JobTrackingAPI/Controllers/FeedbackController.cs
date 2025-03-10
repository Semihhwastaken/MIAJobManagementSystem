using Microsoft.AspNetCore.Mvc;
using JobTrackingAPI.Models;
using JobTrackingAPI.Services;
using MongoDB.Driver;
using Microsoft.AspNetCore.Authorization;

namespace JobTrackingAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FeedbackController : ControllerBase
    {
        private readonly IMongoCollection<Feedback> _feedback;
        private readonly INotificationService _notificationService;

        public FeedbackController(IMongoDatabase database, INotificationService notificationService)
        {
            _feedback = database.GetCollection<Feedback>("Feedbacks");
            _notificationService = notificationService;
        }

        [HttpGet("public")]
        public async Task<ActionResult<IEnumerable<Feedback>>> GetPublicFeedbacks()
        {
            var feedbacks = await _feedback
                .Find(f => f.IsPublic)
                .SortByDescending(f => f.CreatedAt)
                .Limit(10)
                .ToListAsync();
            return Ok(feedbacks);
        }

        [Authorize]
        [HttpPost]
        public async Task<ActionResult<Feedback>> CreateFeedback([FromBody] Feedback feedback)
        {
            await _feedback.InsertOneAsync(feedback);
        

            return CreatedAtAction(nameof(GetPublicFeedbacks), new { id = feedback.Id }, feedback);
        }

        [Authorize(Roles = "Admin")]
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Feedback>>> GetAllFeedbacks([FromQuery] string? status)
        {
            var filter = Builders<Feedback>.Filter.Empty;
            if (!string.IsNullOrEmpty(status) && Enum.TryParse<FeedbackStatus>(status, out var feedbackStatus))
            {
                filter = Builders<Feedback>.Filter.Eq(f => f.Status, feedbackStatus);
            }

            var feedbacks = await _feedback
                .Find(filter)
                .SortByDescending(f => f.CreatedAt)
                .ToListAsync();
            return Ok(feedbacks);
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("{id}/status")]
        public async Task<ActionResult> UpdateFeedbackStatus(string id, [FromBody] FeedbackStatusUpdate update)
        {
            var feedback = await _feedback.FindOneAndUpdateAsync(
                f => f.Id == id,
                Builders<Feedback>.Update
                    .Set(f => f.Status, update.Status)
                    .Set(f => f.AdminResponse, update.Response)
                    .Set(f => f.RespondedAt, update.Status == FeedbackStatus.Responded ? DateTime.UtcNow : (DateTime?)null)
            );

            if (feedback == null)
                return NotFound();

            if (update.Status == FeedbackStatus.Responded && update.Response != null)
            {
                await _notificationService.SendFeedbackResponseNotificationAsync(
                    feedback.UserId,
                    feedback.Content,
                    update.Response
                );
            }

            return NoContent();
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("stats")]
        public async Task<ActionResult<object>> GetFeedbackStats()
        {
            var allFeedbacks = await _feedback.Find(_ => true).ToListAsync();
            
            return Ok(new
            {
                total = allFeedbacks.Count,
                newFeedbacks = allFeedbacks.Count(f => f.Status == FeedbackStatus.New),
                responded = allFeedbacks.Count(f => f.Status == FeedbackStatus.Responded),
                archived = allFeedbacks.Count(f => f.Status == FeedbackStatus.Archived),
                averageRating = allFeedbacks.Any() ? allFeedbacks.Average(f => f.Rating) : 0
            });
        }

        public class FeedbackStatusUpdate
        {
            public FeedbackStatus Status { get; set; }
            public string? Response { get; set; }
        }
    }
}
