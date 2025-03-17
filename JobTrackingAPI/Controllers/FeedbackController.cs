using Microsoft.AspNetCore.Mvc;
using JobTrackingAPI.Models;
using JobTrackingAPI.Services;
using JobTrackingAPI.Interfaces;
using Microsoft.AspNetCore.Authorization;
using System.Text.Json.Serialization;

namespace JobTrackingAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FeedbackController : ControllerBase
    {
        private readonly IFeedbackService _feedbackService;
        private readonly INotificationService _notificationService;
        private readonly ILogger<FeedbackController> _logger;

        public FeedbackController(
            IFeedbackService feedbackService,
            INotificationService notificationService,
            ILogger<FeedbackController> logger)
        {
            _feedbackService = feedbackService;
            _notificationService = notificationService;
            _logger = logger;
        }

        [HttpGet("public")]
        public async Task<ActionResult<IEnumerable<Feedback>>> GetPublicFeedbacks()
        {
            try
            {
                var feedbacks = await _feedbackService.GetPublicFeedbacksAsync();
                return Ok(feedbacks);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting public feedbacks");
                return StatusCode(500, "Internal server error");
            }
        }

        [Authorize]
        [HttpPost]
        public async Task<ActionResult<Feedback>> CreateFeedback([FromBody] Feedback feedback)
        {
            try
            {
                var createdFeedback = await _feedbackService.CreateFeedbackAsync(feedback);
                return CreatedAtAction(nameof(GetPublicFeedbacks), new { id = createdFeedback.Id }, createdFeedback);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating feedback");
                return StatusCode(500, "Internal server error");
            }
        }

        [Authorize(Roles = "Admin")]
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Feedback>>> GetAllFeedbacks([FromQuery] string? status)
        {
            try
            {
                var feedbacks = await _feedbackService.GetAllFeedbacksAsync(status);
                return Ok(feedbacks);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all feedbacks");
                return StatusCode(500, "Internal server error");
            }
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("{id}/status")]
        public async Task<ActionResult> UpdateFeedbackStatus(string id, [FromBody] FeedbackStatusUpdate update)
        {
            try
            {
                _logger.LogInformation("Updating feedback status: {Id}, Status: {Status}, Response: {Response}", id, update.Status.ToString(), update.Response);
                var feedback = await _feedbackService.UpdateFeedbackStatusAsync(id, update.Status, update.Response);
                
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
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating feedback status: {Id}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("stats")]
        public async Task<ActionResult<FeedbackStats>> GetFeedbackStats()
        {
            try
            {
                var stats = await _feedbackService.GetFeedbackStatsAsync();
                return Ok(stats);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting feedback stats");
                return StatusCode(500, "Internal server error");
            }
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteFeedback(string id)
        {
            try
            {
                var result = await _feedbackService.DeleteFeedbackAsync(id);
                if (!result)
                    return NotFound();

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting feedback: {Id}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        public class FeedbackStatusUpdate
        {
            [JsonConverter(typeof(JsonStringEnumConverter))]
            public FeedbackStatus Status { get; set; }
            public string? Response { get; set; }
        }
    }
}
