using Microsoft.AspNetCore.Mvc;
using JobTrackingAPI.Models;
using JobTrackingAPI.Services;
using System.Threading.Tasks;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Caching.Memory;
using System.Linq;
using System.Collections.Generic;
using MongoDB.Driver;
using System;

namespace JobTrackingAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AuthService _authService;
        private readonly ILogger<AuthController> _logger;
        private readonly CacheService _cacheService;
        private readonly IMongoCollection<User> _usersCollection;
        private readonly TasksService _tasksService;
        private readonly TeamService _teamService;
        private readonly DashboardService _dashboardService;
        private readonly UserService _userService;
        private readonly IActivityService _activityService;

        public AuthController(
            AuthService authService, 
            ILogger<AuthController> logger, 
            CacheService cacheService, 
            IMongoDatabase database,
            TasksService tasksService, 
            TeamService teamService, 
            DashboardService dashboardService,
            UserService userService,
            IActivityService activityService)
        {
            _authService = authService;
            _logger = logger;
            _cacheService = cacheService;
            _usersCollection = database.GetCollection<User>("Users");
            _tasksService = tasksService;
            _teamService = teamService;
            _dashboardService = dashboardService;
            _userService = userService;
            _activityService = activityService;
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

            if (!success || user == null)
            {
                return BadRequest(new { message });
            }

            // Generate JWT token
            var token = _authService.GenerateJwtToken(user);
            return Ok(new { message, token });
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            try
            {
                // Check if email or username already exists
                var existingUser = await _usersCollection.Find(u => u.Email == request.Email || u.Username == request.Username).FirstOrDefaultAsync();
                if (existingUser != null)
                {
                    return BadRequest(new { message = existingUser.Email == request.Email ? 
                        "Bu email adresi zaten kullanımda." : 
                        "Bu kullanıcı adı zaten kullanımda." });
                }

                // Create the user directly without verification
                var (passwordHash, passwordSalt) = _authService.CreatePasswordHash(request.Password);

                var now = DateTime.UtcNow;

                // Create the user
                var user = new User
                {
                    Username = request.Username,
                    Email = request.Email,
                    PasswordHash = passwordHash,
                    PasswordSalt = passwordSalt,
                    FullName = request.FullName ?? request.Username,
                    Department = request.Department ?? "Engineering",
                    Title = request.Title ?? "Test User",
                    Phone = request.Phone ?? "",
                    Position = request.Position ?? "Tester",
                    ProfileImage = request.ProfileImage ?? "",
                    CreatedDate = now,
                    UpdatedDate = now,
                    Role = request.Role ?? "User"
                };

                await _usersCollection.InsertOneAsync(user);

                // Generate JWT token
                var token = _authService.GenerateJwtToken(user);
                
                _logger.LogInformation($"User registered directly: {user.Username}");
                
                return Ok(new { message = "Kayıt başarıyla tamamlandı.", token, userId = user.Id });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Registration error");
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
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

                // Login başarılı olduğunda IsOnline'ı true yap
                await _userService.UpdateUserOnlineStatus(user.Id, true);

                await _activityService.LogLoginActivity(user.Id);

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
                        role = user.Role, // Add role to the response
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
                        lastLoginDate = user.LastLoginDate,
                        role = user.Role
                    } 
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

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

                // Logout olurken IsOnline'ı false yap
                await _userService.UpdateUserOnlineStatus(userId, false);

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

    }

}
