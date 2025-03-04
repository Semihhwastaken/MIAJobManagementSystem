using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using System.Security.Claims;
using Microsoft.Extensions.Logging;
using JobTrackingAPI.Services;
using JobTrackingAPI.Models;

namespace JobTrackingAPI.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class UserDataController : ControllerBase
    {
        private readonly IUserService _userService;
        private readonly ITasksService _tasksService;
        private readonly ITeamService _teamService;
        private readonly IMemoryCache _cache;
        private readonly ILogger<UserDataController> _logger;

        public UserDataController(
            IUserService userService,
            ITasksService tasksService,
            ITeamService teamService,
            IMemoryCache cache,
            ILogger<UserDataController> logger)
        {
            _userService = userService;
            _tasksService = tasksService;
            _teamService = teamService;
            _cache = cache;
            _logger = logger;
        }

        /// <summary>
        /// Get all essential user data in one request (profile, teams, tasks)
        /// </summary>
        [HttpGet("initialize")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> GetInitialUserData()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "Kullanıcı kimliği doğrulanamadı." });
                }

                // Use cache as much as possible
                var userCacheKey = $"user_{userId}";
                var teamsCacheKey = $"teams_{userId}";
                var tasksCacheKey = $"user_tasks_{userId}";

                // Get or create tasks for concurrent execution
                var userDataTask = GetUserDataAsync(userId, userCacheKey);
                var teamsTask = GetUserTeamsAsync(userId, teamsCacheKey);
                var tasksTask = GetUserTasksAsync(userId, tasksCacheKey);

                // Wait for all tasks to complete
                await Task.WhenAll(userDataTask, teamsTask, tasksTask);

                // Get results
                var userData = await userDataTask;
                var teams = await teamsTask;
                var tasks = await tasksTask;

                return Ok(new
                {
                    user = userData,
                    teams = teams,
                    tasks = tasks
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error initializing user data");
                return StatusCode(500, new { message = "An error occurred while loading user data" });
            }
        }

        private async Task<object> GetUserDataAsync(string userId, string cacheKey)
        {
            if (_cache.TryGetValue(cacheKey, out User user))
            {
                return new
                {
                    id = user.Id,
                    username = user.Username,
                    email = user.Email,
                    fullName = user.FullName,
                    department = user.Department,
                    title = user.Title,
                    phone = user.Phone,
                    position = user.Position,
                    profileImage = user.ProfileImage
                };
            }

            user = await _userService.GetUserById(userId);
            if (user != null)
            {
                _cache.Set(cacheKey, user, TimeSpan.FromMinutes(10));
                return new
                {
                    id = user.Id,
                    username = user.Username,
                    email = user.Email,
                    fullName = user.FullName,
                    department = user.Department,
                    title = user.Title,
                    phone = user.Phone,
                    position = user.Position,
                    profileImage = user.ProfileImage
                };
            }

            return null;
        }

        private async Task<List<Team>> GetUserTeamsAsync(string userId, string cacheKey)
        {
            if (_cache.TryGetValue(cacheKey, out List<Team> teams))
            {
                return teams;
            }

            teams = await _teamService.GetTeamsByUserId(userId);
            _cache.Set(cacheKey, teams, TimeSpan.FromMinutes(5));
            return teams;
        }

        private async Task<List<TaskItem>> GetUserTasksAsync(string userId, string cacheKey)
        {
            if (_cache.TryGetValue(cacheKey, out List<TaskItem> tasks))
            {
                return tasks;
            }

            tasks = await _tasksService.GetTasksAssignedToUserAsync(userId);
            _cache.Set(cacheKey, tasks, TimeSpan.FromMinutes(5));
            return tasks;
        }
    }
}
