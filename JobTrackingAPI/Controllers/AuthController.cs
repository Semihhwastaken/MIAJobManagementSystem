using Microsoft.AspNetCore.Mvc;
using JobTrackingAPI.Models;
using JobTrackingAPI.Services;
using System.Threading.Tasks;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
<<<<<<< HEAD
=======
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Caching.Memory;
using System.Linq;
using System.Collections.Generic;
using MongoDB.Driver;
using System;
>>>>>>> newdb1

namespace JobTrackingAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AuthService _authService;
<<<<<<< HEAD

        public AuthController(AuthService authService)
        {
            _authService = authService;
=======
        private readonly ILogger<AuthController> _logger;
        private readonly CacheService _cacheService;
        private readonly IMongoCollection<User> _usersCollection;
        private readonly TasksService _tasksService;
        private readonly TeamService _teamService;
        private readonly DashboardService _dashboardService;

        public AuthController(
            AuthService authService, 
            ILogger<AuthController> logger, 
            CacheService cacheService, 
            IMongoDatabase database,
            TasksService tasksService, 
            TeamService teamService, 
            DashboardService dashboardService)
        {
            _authService = authService;
            _logger = logger;
            _cacheService = cacheService;
            _usersCollection = database.GetCollection<User>("users");
            _tasksService = tasksService;
            _teamService = teamService;
            _dashboardService = dashboardService;
>>>>>>> newdb1
        }

        [HttpPost("register/initiate")]
        public async Task<IActionResult> InitiateRegistration([FromBody] Models.InitiateRegistrationRequest request)
        {
            var result = await _authService.InitiateRegistrationAsync(request);
            if (!result.Success)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpPost("register/verify")]
        public async Task<IActionResult> VerifyAndRegister([FromBody] Models.VerificationRequest request)
        {
            var (success, message, user) = await _authService.VerifyAndRegisterAsync(
                request.Email,
                request.Code,
                request.Username,
                request.Password,
                request.FullName,
                request.Department,
                request.Title,
                request.Phone,
                request.Position,
                request.ProfileImage
            );

            if (!success)
            {
                return BadRequest(new { message });
            }

            // Generate JWT token
            var token = _authService.GenerateJwtToken(user);
            return Ok(new { message, token });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
<<<<<<< HEAD
            var (success, message, token, user) = await _authService.LoginAsync(request.Username, request.Password);
            if (!success || token == null || user == null)
            {
                return BadRequest(new { Message = message });
            }

            return Ok(new { Token = token, User = user });
=======
            try
            {
                _logger.LogInformation($"Login attempt with username: {request?.Username}");
                
                if (request == null)
                {
                    return BadRequest(new { message = "Invalid request format" });
                }

                if (string.IsNullOrEmpty(request.Username) || string.IsNullOrEmpty(request.Password))
                {
                    return BadRequest(new { message = "Kullanıcı adı ve şifre zorunludur" });
                }

                var user = await _authService.AuthenticateAsync(request.Username, request.Password);
                if (user == null)
                    return Unauthorized(new { message = "Geçersiz kullanıcı adı veya şifre" });

                var token = _authService.GenerateJwtToken(user);

                try
                {
                    // Tüm cache işlemlerini paralel olarak başlat
                    var preloadTasks = new List<Task>
                    {
                        _cacheService.GetOrUpdateAsync(
                            _cacheService.GetUserCacheKey(user.Id),
                            async () => await _usersCollection.Find(u => u.Id == user.Id).FirstOrDefaultAsync()
                        ),
                        _cacheService.GetOrUpdateAsync(
                            _cacheService.GetUserTasksCacheKey(user.Id),
                            async () => await _tasksService.GetTasksByUserId(user.Id)
                        ),
                        _cacheService.GetOrUpdateAsync(
                            $"completed_tasks_{user.Id}",
                            async () => {
                                var allTasks = await _tasksService.GetTasksByUserId(user.Id);
                                return allTasks.Where(t => t.Status == "completed").ToList();
                            }
                        ),
                        _cacheService.GetOrUpdateAsync(
                            _cacheService.GetUserTeamsCacheKey(user.Id),
                            async () => await _teamService.GetTeamsByUserId(user.Id)
                        ),
                        _cacheService.GetOrUpdateAsync(
                            $"dashboard_stats_{user.Id}",
                            async () => await _dashboardService.GetUserDashboardStats(user.Id)
                        ),
                        _cacheService.GetOrUpdateAsync(
                            _cacheService.GetUserTaskHistoryCacheKey(user.Id),
                            async () => await _tasksService.GetTaskHistoryByUserId(user.Id)
                        )
                    };

                    // Tüm cache işlemlerinin tamamlanmasını bekle
                    await Task.WhenAll(preloadTasks);
                    
                    _logger.LogInformation($"Cache preload completed for user {user.Id}");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Error during cache preload for user {user.Id}");
                    return BadRequest(new { message = "Kullanıcı verileri yüklenirken bir hata oluştu. Lütfen tekrar deneyin." });
                }

                return Ok(new
                {
                    token,
                    user = new
                    {
                        id = user.Id,
                        email = user.Email,
                        fullName = user.FullName,
                        username = user.Username,
                        department = user.Department,
                        title = user.Title,
                        position = user.Position,
                        phone = user.Phone,
                        profileImage = user.ProfileImage,
                        userStatus = user.UserStatus,
                        assignedJobs = user.AssignedJobs,
                        ownerTeams = user.OwnerTeams,
                        memberTeams = user.MemberTeams,
                        taskHistory = user.TaskHistory,
                        expertise = user.Expertise,
                        metrics = user.Metrics,
                        availabilitySchedule = user.AvailabilitySchedule,
                        onlineStatus = user.OnlineStatus,
                        performanceScore = user.PerformanceScore,
                        completedTasksCount = user.CompletedTasksCount,
                        createdDate = user.CreatedDate,
                        lastLoginDate = user.LastLoginDate
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Login error");
                return BadRequest(new { message = ex.Message });
            }
>>>>>>> newdb1
        }


        [Authorize]
        [HttpGet("current-user")]
        public async Task<IActionResult> GetCurrentUser()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "Kullanıcı girişi yapılmamış" });
                }

                var user = await _authService.GetUserByIdAsync(userId);
                if (user == null)
                {
                    return NotFound(new { message = "Kullanıcı bulunamadı" });
                }

<<<<<<< HEAD
                return Ok(new { user });
=======
                return Ok(new { 
                    user = new
                    {
                        id = user.Id,
                        email = user.Email,
                        fullName = user.FullName,
                        username = user.Username,
                        department = user.Department,
                        title = user.Title,
                        position = user.Position,
                        phone = user.Phone,
                        profileImage = user.ProfileImage,
                        userStatus = user.UserStatus,
                        assignedJobs = user.AssignedJobs,
                        ownerTeams = user.OwnerTeams,
                        memberTeams = user.MemberTeams,
                        taskHistory = user.TaskHistory,
                        expertise = user.Expertise,
                        metrics = user.Metrics,
                        availabilitySchedule = user.AvailabilitySchedule,
                        onlineStatus = user.OnlineStatus,
                        performanceScore = user.PerformanceScore,
                        completedTasksCount = user.CompletedTasksCount,
                        createdDate = user.CreatedDate,
                        lastLoginDate = user.LastLoginDate
                    } 
                });
>>>>>>> newdb1
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

<<<<<<< HEAD
=======
        [Authorize]
        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "Kullanıcı girişi yapılmamış" });
                }

                // Kullanıcıya ait tüm cache verilerini temizle
                _cacheService.InvalidateUserCaches(userId);

                return Ok(new { message = "Başarıyla çıkış yapıldı" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Logout error");
                return BadRequest(new { message = "Çıkış yapılırken bir hata oluştu" });
            }
        }

        [HttpGet("check-preload-status")]
        [Authorize]
        public async Task<IActionResult> CheckPreloadStatus()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized();
                }

                var userTasksCacheKey = _cacheService.GetUserTasksCacheKey(userId);
                var userTeamsCacheKey = _cacheService.GetUserTeamsCacheKey(userId);
                var userTaskHistoryCacheKey = _cacheService.GetUserTaskHistoryCacheKey(userId);

                var tasksExist = await _cacheService.GetAsync<List<TaskItem>>(userTasksCacheKey) != null;
                var teamsExist = await _cacheService.GetAsync<List<Team>>(userTeamsCacheKey) != null;
                var taskHistoryExists = await _cacheService.GetAsync<List<TaskHistory>>(userTaskHistoryCacheKey) != null;

                var isComplete = tasksExist && teamsExist && taskHistoryExists;

                return Ok(new { isComplete });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Preloading durumu kontrol edilirken hata oluştu");
                return StatusCode(500, new { message = "Preloading durumu kontrol edilirken bir hata oluştu" });
            }
        }

>>>>>>> newdb1
    }

    public class RegisterRequest
    {
        [Required]
        public required string Username { get; set; }

        [Required]
        [EmailAddress]
        public required string Email { get; set; }

        [Required]
        [MinLength(6)]
        public required string Password { get; set; }

        [Required]
        public required string FullName { get; set; }

        [Required]
        public required string Department { get; set; }
    }
<<<<<<< HEAD

    public class LoginRequest
    {
        [Required]
        public required string Username { get; set; }

        [Required]
        public required string Password { get; set; }
    }
=======
>>>>>>> newdb1
}
