using JobTrackingAPI.Models;
using JobTrackingAPI.Interfaces;
using MongoDB.Driver;
using Microsoft.Extensions.Options;
using JobTrackingAPI.Settings;

namespace JobTrackingAPI.Services
{
    public class FeedbackService : IFeedbackService
    {
        private readonly IMongoCollection<Feedback> _feedback;
        private readonly ILogger<FeedbackService> _logger;

        public FeedbackService(
            IOptions<MongoDbSettings> settings,
            ILogger<FeedbackService> logger)
        {
            var client = new MongoClient(settings.Value.ConnectionString);
            var database = client.GetDatabase(settings.Value.DatabaseName);
            _feedback = database.GetCollection<Feedback>("Feedbacks");
            _logger = logger;
        }

        public async Task<Feedback> CreateFeedbackAsync(Feedback feedback)
        {
            try
            {
                await _feedback.InsertOneAsync(feedback);
                return feedback;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating feedback");
                throw;
            }
        }

        public async Task<List<Feedback>> GetPublicFeedbacksAsync()
        {
            try
            {
                return await _feedback
                    .Find(f => f.IsPublic)
                    .SortByDescending(f => f.CreatedAt)
                    .Limit(10)
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting public feedbacks");
                throw;
            }
        }

        public async Task<List<Feedback>> GetAllFeedbacksAsync(string? status = null)
        {
            try
            {
                var filter = Builders<Feedback>.Filter.Empty;
                if (!string.IsNullOrEmpty(status) && Enum.TryParse<FeedbackStatus>(status, out var feedbackStatus))
                {
                    filter = Builders<Feedback>.Filter.Eq(f => f.Status, feedbackStatus);
                }

                return await _feedback
                    .Find(filter)
                    .SortByDescending(f => f.CreatedAt)
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all feedbacks");
                throw;
            }
        }

        public async Task<Feedback> GetFeedbackByIdAsync(string id)
        {
            try
            {
                return await _feedback.Find(f => f.Id == id).FirstOrDefaultAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting feedback by id: {Id}", id);
                throw;
            }
        }

        public async Task<Feedback> UpdateFeedbackStatusAsync(string id, FeedbackStatus status, string? response)
        {
            try
            {
                _logger.LogInformation("Updating feedback status: {Id}, Status: {Status}, Response: {Response}", id, status, response);
                var update = Builders<Feedback>.Update
                    .Set(f => f.Status, status)
                    .Set(f => f.LastUpdated, DateTime.UtcNow)
                    .Set(f => f.IsRead, status == FeedbackStatus.Read || status == FeedbackStatus.Responded || status == FeedbackStatus.Archived);

                if (!string.IsNullOrEmpty(response))
                {
                    update = update
                        .Set(f => f.AdminResponse, response)
                        .Set(f => f.RespondedAt, DateTime.UtcNow);
                }

                return await _feedback.FindOneAndUpdateAsync(
                    f => f.Id == id,
                    update,
                    new FindOneAndUpdateOptions<Feedback> { ReturnDocument = ReturnDocument.After }
                );
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating feedback status: {Id}", id);
                throw;
            }
        }

        public async Task<bool> DeleteFeedbackAsync(string id)
        {
            try
            {
                var result = await _feedback.DeleteOneAsync(f => f.Id == id);
                return result.DeletedCount > 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting feedback: {Id}", id);
                throw;
            }
        }

        public async Task<FeedbackStats> GetFeedbackStatsAsync()
        {
            try
            {
                var allFeedbacks = await _feedback.Find(_ => true).ToListAsync();

                return new FeedbackStats
                {
                    Total = allFeedbacks.Count,
                    NewCount = allFeedbacks.Count(f => f.Status == FeedbackStatus.New),
                    RespondedCount = allFeedbacks.Count(f => f.Status == FeedbackStatus.Responded),
                    ArchivedCount = allFeedbacks.Count(f => f.Status == FeedbackStatus.Archived),
                    AverageRating = allFeedbacks.Any() ? allFeedbacks.Average(f => f.Rating) : 0
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting feedback stats");
                throw;
            }
        }
    }
}