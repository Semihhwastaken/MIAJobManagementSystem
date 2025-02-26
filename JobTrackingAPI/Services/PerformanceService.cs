using JobTrackingAPI.Models;
using JobTrackingAPI.Settings;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace JobTrackingAPI.Services
{
    public interface IPerformanceService
    {
        Task UpdatePerformanceScore(string userId, TaskItem task, bool isCompleted);
        Task<PerformanceScore> GetUserPerformanceScore(string userId);
    }

    public class PerformanceService : IPerformanceService
    {
        private readonly IMongoCollection<PerformanceScore> _performanceScores;
        private readonly IMongoCollection<TaskItem> _tasks;

        public PerformanceService(IOptions<MongoDbSettings> mongoDBSettings)
        {
            var mongoClient = new MongoClient(mongoDBSettings.Value.ConnectionString);
            var mongoDatabase = mongoClient.GetDatabase(mongoDBSettings.Value.DatabaseName);
            _performanceScores = mongoDatabase.GetCollection<PerformanceScore>("PerformanceScores");
            _tasks = mongoDatabase.GetCollection<TaskItem>("Tasks");
        }

        public async Task<PerformanceScore> GetUserPerformanceScore(string userId)
        {
            var score = await _performanceScores
                .Find(p => p.UserId == userId)
                .FirstOrDefaultAsync();

            if (score == null)
            {
                score = new PerformanceScore
                {
                    UserId = userId,
                    LastUpdated = DateTime.UtcNow
                };
                await _performanceScores.InsertOneAsync(score);
            }

            return score;
        }

        public async Task UpdatePerformanceScore(string userId, TaskItem task, bool isCompleted)
        {
            var performanceScore = await GetUserPerformanceScore(userId);
            var scoreChange = 0.0;
            var reason = "";

            if (isCompleted)
            {
                // Base points for task completion based on difficulty
                var basePoints = task.Difficulty switch
                {
                    "Low" => 5.0,
                    "Medium" => 10.0,
                    "High" => 15.0,
                    _ => 5.0
                };

                // Time-based bonus/penalty calculation
                var timeSpan = DateTime.UtcNow - task.StartDate;
                var expectedDuration = task.DueDate - task.StartDate;
                var timeEfficiencyFactor = expectedDuration.TotalHours > 0 
                    ? timeSpan.TotalHours / expectedDuration.TotalHours 
                    : 1;

                // Bonus for early completion
                if (timeEfficiencyFactor < 1)
                {
                    scoreChange = basePoints * (2 - timeEfficiencyFactor);
                    reason = $"Task completed early - Bonus points: {scoreChange:F2}";
                }
                // Penalty for late completion
                else if (DateTime.UtcNow > task.DueDate)
                {
                    var daysLate = (DateTime.UtcNow - task.DueDate).TotalDays;
                    var penaltyFactor = Math.Min(0.5, daysLate * 0.1); // Max 50% penalty
                    scoreChange = basePoints * (1 - penaltyFactor);
                    reason = $"Task completed late - Reduced points: {scoreChange:F2}";
                }
                else
                {
                    scoreChange = basePoints;
                    reason = $"Task completed on time - Base points: {scoreChange:F2}";
                }

                // Additional bonus based on completed tasks count
                var completedTasksBonus = Math.Min(performanceScore.CompletedTasksCount * 0.5, 20);
                scoreChange += completedTasksBonus;
                performanceScore.CompletedTasksCount++;
            }
            else
            {
                // Penalty for overdue tasks
                var daysOverdue = (DateTime.UtcNow - task.DueDate).TotalDays;
                scoreChange = -Math.Min(10.0, daysOverdue * 2); // Max 10 points penalty
                reason = $"Task overdue - Penalty points: {scoreChange:F2}";
            }

            // Update the performance score
            performanceScore.Score = Math.Max(0, Math.Min(100, performanceScore.Score + scoreChange));
            performanceScore.LastUpdated = DateTime.UtcNow;
            performanceScore.History.Add(new ScoreHistory
            {
                Date = DateTime.UtcNow,
                ScoreChange = scoreChange,
                Reason = reason
            });

            // Keep only last 100 history entries
            if (performanceScore.History.Count > 100)
            {
                performanceScore.History = performanceScore.History
                    .OrderByDescending(h => h.Date)
                    .Take(100)
                    .ToList();
            }

            await _performanceScores.ReplaceOneAsync(
                p => p.Id == performanceScore.Id,
                performanceScore,
                new ReplaceOptions { IsUpsert = true }
            );
        }
    }
}