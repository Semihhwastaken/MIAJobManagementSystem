using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using JobTrackingAPI.Services;
using JobTrackingAPI.Models;
using System.Security.Claims;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;

namespace JobTrackingAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly IMongoDatabase _database;
        private readonly ITasksService _tasksService;
        private readonly ITeamService _teamService;
        private readonly IUserService _userService;
        private readonly ISystemMonitoringService _systemMonitoring;
        private readonly ILogger<AdminController> _logger;

        public AdminController(
            IMongoDatabase database,
            ITasksService tasksService,
            ITeamService teamService,
            IUserService userService,
            ISystemMonitoringService systemMonitoring,
            ILogger<AdminController> logger)
        {
            _database = database;
            _tasksService = tasksService;
            _teamService = teamService;
            _userService = userService;
            _systemMonitoring = systemMonitoring;
            _logger = logger;
        }

        [HttpGet("dashboard")]
        public async Task<ActionResult<AdminDashboardStats>> GetDashboardStats()
        {
            try
            {
                // Log the current user's role for debugging
                var userRole = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role)?.Value;
                _logger.LogInformation($"User attempting to access admin dashboard with role: {userRole}");

                if (!User.IsInRole("Admin"))
                {
                    return Forbid();
                }

                var stats = new AdminDashboardStats
                {
                    TotalUsers = await _userService.GetTotalUserCount(),
                    TotalTeams = await _teamService.GetTotalTeamCount(),
                    TotalTasks = await _tasksService.GetTotalTaskCount(),
                    ActiveUsers = await _userService.GetActiveUserCount(),
                    SystemStats = await GetSystemStats(),
                    RecentActivities = await GetRecentActivities()
                };

                return Ok(stats);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting admin dashboard stats");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("users")]
        public async Task<ActionResult<IEnumerable<User>>> GetAllUsers([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            try
            {
                var users = await _userService.GetPaginatedUsers(page, pageSize);
                var total = await _userService.GetTotalUserCount();

                return Ok(new { 
                    users = users,
                    total = total,
                    currentPage = page,
                    totalPages = Math.Ceiling((double)total / pageSize)
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("taskStats")]
        public async Task<ActionResult<object>> GetTaskStats()
        {
            try
            {
                var allTasks = await _tasksService.GetTasks();
                var stats = new
                {
                    TasksByStatus = new
                    {
                        Completed = allTasks.Count(t => t.Status == "completed"),
                        InProgress = allTasks.Count(t => t.Status == "in-progress"),
                        Overdue = allTasks.Count(t => t.Status == "overdue")
                    },
                    TasksByPriority = new
                    {
                        High = allTasks.Count(t => t.Priority == "high"),
                        Medium = allTasks.Count(t => t.Priority == "medium"),
                        Low = allTasks.Count(t => t.Priority == "low")
                    },
                    AverageCompletionTime = allTasks
                        .Where(t => t.Status == "completed" && t.CompletedDate.HasValue)
                        .Select(t => (t.CompletedDate!.Value - t.CreatedAt).TotalDays)
                        .DefaultIfEmpty(0)
                        .Average()
                };

                return Ok(stats);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting task statistics");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("teamStats")]
        public async Task<ActionResult<object>> GetTeamStats()
        {
            try
            {
                var teams = await _teamService.GetAllTeams();
                if (teams == null) return Ok(new { TotalTeams = 0 });

                var teamStats = new List<object>();
                foreach (var team in teams)
                {
                    var teamTasks = await _tasksService.GetTasks(teamId: team.Id ?? string.Empty);
                    var activeTasks = teamTasks?.Count(t => t.Status != "completed") ?? 0;
                    var completionRate = await CalculateTeamCompletionRate(team.Id ?? string.Empty, teamTasks ?? Enumerable.Empty<TaskItem>());
                    
                    teamStats.Add(new
                    {
                        TeamId = team.Id,
                        TeamName = team.Name,
                        CompletionRate = completionRate
                    });
                }

                var stats = new
                {
                    TotalTeams = teams.Count(),
                    TeamsWithActiveTasks = teams.Count(t => 
                        teamStats.Any(ts => ((dynamic)ts).TeamId == t.Id && ((dynamic)ts).CompletionRate < 100)),
                    AverageTeamSize = teams.Average(t => t.Members?.Count ?? 0),
                    TeamPerformance = teamStats
                };

                return Ok(stats);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting team statistics");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        private async Task<double> CalculateTeamCompletionRate(string teamId, IEnumerable<TaskItem>? teamTasks = null)
        {
            var tasks = teamTasks ?? await _tasksService.GetTasks(teamId: teamId);
            if (tasks == null || !tasks.Any()) return 0;

            return (double)tasks.Count(t => t.Status == "completed") / tasks.Count() * 100;
        }

        private async Task<SystemStats> GetSystemStats()
        {
            var stats = new SystemStats
            {
                DatabaseSize = await _systemMonitoring.GetDatabaseSize(),
                CacheHitRate = await _systemMonitoring.GetCacheHitRate(),
                ApiRequests = await _systemMonitoring.GetTotalApiRequests(),
                ErrorRate = await _systemMonitoring.GetErrorRate()
            };

            return stats;
        }

        private async Task<List<Activity>> GetRecentActivities()
        {
            try
            {
                var collection = _database.GetCollection<Activity>("activities");
                var lastDay = DateTime.UtcNow.AddDays(-1);

                var filter = Builders<Activity>.Filter.Gte(x => x.Timestamp, lastDay);
                var sort = Builders<Activity>.Sort.Descending(x => x.Timestamp);

                var activities = await collection
                    .Find(filter)
                    .Sort(sort)
                    .Limit(50)
                    .ToListAsync();

                // Kullanıcı bilgilerini ekle
                var userIds = activities.Select(a => a.UserId).Distinct().ToList();
                var users = await _userService.GetUsersByIds(userIds);
                var userDict = users.ToDictionary(u => u.Id!, u => u.Username);

                // Aktivite açıklamalarını zenginleştir
                foreach (var activity in activities)
                {
                    if (userDict.ContainsKey(activity.UserId))
                    {
                        var username = userDict[activity.UserId];
                        activity.Description = activity.Type.ToLower() switch
                        {
                            "user" => $"{username} {activity.Description}",
                            "task" => $"{username} {activity.Description}",
                            "team" => $"{username} {activity.Description}",
                            "login" => $"{username} {activity.Description}",
                            _ => activity.Description
                        };
                    }
                }

                return activities;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching recent activities");
                return new List<Activity>();
            }
        }

        // Aktivite ekleme yardımcı metodu
        private async Task AddSystemActivity(string type, string description, string userId, Dictionary<string, object>? metadata = null)
        {
            try
            {
                var activity = new Activity
                {
                    Id = ObjectId.GenerateNewId().ToString(),
                    Type = type,
                    Description = description,
                    UserId = userId,
                    Metadata = metadata ?? new Dictionary<string, object>(),
                    Timestamp = DateTime.UtcNow
                };

                await _database.GetCollection<Activity>("activities").InsertOneAsync(activity);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding system activity");
            }
        }

        // Additional admin-specific endpoints...
    }
}
