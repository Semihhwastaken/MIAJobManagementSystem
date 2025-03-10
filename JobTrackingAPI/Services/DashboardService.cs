using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using JobTrackingAPI.Models;
using MongoDB.Driver;
using System.Linq;

namespace JobTrackingAPI.Services
{
    public class DashboardService
    {
        private readonly IMongoDatabase _database;
        private readonly ITasksService _tasksService;
        private readonly ITeamService _teamService;

        public DashboardService(
            IMongoDatabase database,
            ITasksService tasksService,
            ITeamService teamService)
        {
            _database = database;
            _tasksService = tasksService;
            _teamService = teamService;
        }

        public async Task<DashboardStats> GetDashboardStats(string userId, bool forTeam = false, string? teamId = null)
        {
            var tasks = await _tasksService.GetTasks() ?? new List<TaskItem>();
            
            // Filter tasks based on user/team
            if (forTeam && !string.IsNullOrEmpty(teamId))
            {
                tasks = tasks.Where(t => t.TeamId == teamId).ToList();
            }
            else
            {
                tasks = tasks.Where(t => t.AssignedUserIds != null && t.AssignedUserIds.Contains(userId)).ToList();
            }

            var completedTasks = tasks.Where(t => t.Status == "completed").ToList();
            var inProgressTasks = tasks.Where(t => t.Status == "in-progress").ToList();
            var overdueTasks = tasks.Where(t => t.Status == "overdue").ToList();

            var previousDate = DateTime.UtcNow.AddDays(-7);
            var previousTasks = tasks.Where(t => t.CreatedAt <= previousDate).ToList();
            var previousCompleted = previousTasks.Count(t => t.Status == "completed");
            var previousInProgress = previousTasks.Count(t => t.Status == "in-progress");
            var previousOverdue = previousTasks.Count(t => t.Status == "overdue");

            var stats = new DashboardStats
            {
                TotalTasks = tasks.Count(),
                CompletedTasks = completedTasks.Count(),
                InProgressTasks = inProgressTasks.Count(),
                OverdueTasks = overdueTasks.Count(),
                PreviousTotalTasks = previousTasks.Count(),
                PreviousCompletedTasks = previousCompleted,
                PreviousInProgressTasks = previousInProgress,
                PreviousOverdueTasks = previousOverdue
            };

            if (forTeam && !string.IsNullOrEmpty(teamId))
            {
                var team = await _teamService.GetTeamById(teamId);
                if (team != null)
                {
                    var tasksCount = tasks.Count();
                    var completionRate = tasksCount > 0 
                        ? (completedTasks.Count() * 100.0) / tasksCount 
                        : 0;

                    var averageDuration = completedTasks
                        .Where(t => t.CompletedDate.HasValue)
                        .Select(t => (t.CompletedDate!.Value - t.CreatedAt).TotalDays)
                        .DefaultIfEmpty(0)
                        .Average();

                    var onTimeCompletions = completedTasks.Count(t => 
                        t.CompletedDate.HasValue && 
                        t.DueDate.HasValue && 
                        t.CompletedDate.Value <= t.DueDate.Value);

                    var performanceScore = CalculateTeamPerformanceScore(
                        tasksCount,
                        completedTasks.Count(),
                        overdueTasks.Count(),
                        onTimeCompletions,
                        averageDuration
                    );

                    stats.TeamActivity = new TeamActivity
                    {
                        CompletedTasksCount = completedTasks.Count(),
                        CompletionRate = Math.Round(completionRate, 1),
                        AverageTaskDuration = Math.Round(averageDuration, 1),
                        PerformanceScore = Math.Round(performanceScore, 1)
                    };

                    stats.TopContributors = await GetTopContributors(team, tasks);
                }
            }

            return stats;
        }

        public async Task<DashboardStats> GetUserDashboardStats(string userId)
        {
            // Call the existing GetDashboardStats method with forTeam=false
            return await GetDashboardStats(userId, false, null);
        }

        private double CalculateTeamPerformanceScore(
            int totalTasks,
            int completedTasks,
            int overdueTasks,
            int onTimeCompletions,
            double averageDuration)
        {
            if (totalTasks == 0) return 0;

            const double completionWeight = 0.4;
            const double onTimeWeight = 0.3;
            const double overdueWeight = 0.2;
            const double durationWeight = 0.1;

            var completionScore = (completedTasks * 100.0) / totalTasks;
            var onTimeScore = completedTasks > 0 ? (onTimeCompletions * 100.0) / completedTasks : 0;
            var overdueScore = 100 - (totalTasks > 0 ? (overdueTasks * 100.0) / totalTasks : 0);
            
            var durationScore = averageDuration <= 5 ? 100 : Math.Max(0, 100 - ((averageDuration - 5) * 10));

            var finalScore = (completionScore * completionWeight) +
                            (onTimeScore * onTimeWeight) +
                            (overdueScore * overdueWeight) +
                            (durationScore * durationWeight);

            return Math.Min(100, Math.Max(0, finalScore));
        }

        private async Task<List<TopContributor>> GetTopContributors(Team team, List<TaskItem> teamTasks)
        {
            var contributors = new List<TopContributor>();
            var usersCollection = _database.GetCollection<User>("Users");
            
            foreach (var member in team.Members ?? Enumerable.Empty<TeamMember>())
            {
                var userTasks = teamTasks
                    .Where(t => t.AssignedUserIds?.Contains(member.Id) == true)
                    .ToList();

                var completedTasksCount = userTasks.Count(t => t.Status == "completed");
                
                var score = CalculateUserPerformanceScore(userTasks);

                var user = await usersCollection.Find(u => u.Id == member.Id).FirstOrDefaultAsync();
                if (user != null)
                {
                    contributors.Add(new TopContributor
                    {
                        Id = user.Id,
                        Name = user.FullName ?? "Unknown",
                        ProfileImage = user.ProfileImage ?? "",
                        TasksCompleted = completedTasksCount,
                        PerformanceScore = score,
                        Role = user.Title ?? user.Position ?? "Team Member"
                    });
                }
            }

            return contributors
                .OrderByDescending(c => c.PerformanceScore)
                .Take(5)
                .ToList();
        }

        private double CalculateUserPerformanceScore(List<TaskItem> userTasks)
        {
            if (userTasks == null || userTasks.Count == 0) return 0;

            var completedTasks = userTasks.Count(t => t.Status == "completed");
            var overdueTasks = userTasks.Count(t => t.Status == "overdue");
            var onTimeCompletions = userTasks.Count(t => 
                t.Status == "completed" && 
                t.CompletedDate.HasValue && 
                t.DueDate.HasValue && 
                t.CompletedDate.Value <= t.DueDate.Value);

            var averageDuration = userTasks
                .Where(t => t.CompletedDate.HasValue)
                .Select(t => (t.CompletedDate!.Value - t.CreatedAt).TotalDays)
                .DefaultIfEmpty(0)
                .Average();

            return CalculateTeamPerformanceScore(
                userTasks.Count,
                completedTasks,
                overdueTasks,
                onTimeCompletions,
                averageDuration
            );
        }
    }
}