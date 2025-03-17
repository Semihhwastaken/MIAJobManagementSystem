using JobTrackingAPI.Models;
using MongoDB.Driver;
using Microsoft.Extensions.Logging;

namespace JobTrackingAPI.Services
{
    public class ActivityService : IActivityService
    {
        private readonly IMongoDatabase _database;
        private readonly ILogger<ActivityService> _logger;

        public ActivityService(
            IMongoDatabase database,
            ILogger<ActivityService> logger)
        {
            _database = database;
            _logger = logger;
        }

        public async Task LogUserActivity(string userId, string description)
        {
            await AddActivity("user", description, userId);
        }

        public async Task LogTaskActivity(string userId, string taskId, string description)
        {
            await AddActivity("task", description, userId, new Dictionary<string, object> { { "taskId", taskId } });
        }

        public async Task LogTeamActivity(string userId, string teamId, string description)
        {
            await AddActivity("team", description, userId, new Dictionary<string, object> { { "teamId", teamId } });
        }

        public async Task LogLoginActivity(string userId)
        {
            await AddActivity("login", "sisteme giriş yaptı", userId);
        }

        public async Task LogSystemActivity(string description)
        {
            await AddActivity("system", description, "system");
        }

        private async Task AddActivity(string type, string description, string userId, Dictionary<string, object>? metadata = null)
        {
            try
            {
                var activity = new Activity
                {
                    Type = type,
                    Description = description,
                    UserId = userId,
                    Metadata = metadata ?? new Dictionary<string, object>()
                };

                await _database.GetCollection<Activity>("activities").InsertOneAsync(activity);
                _logger.LogInformation("Activity added: {Type} - {Description}", type, description);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding activity: {Type} - {Description}", type, description);
                throw;
            }
        }
    }
}
