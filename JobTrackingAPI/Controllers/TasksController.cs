using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using MongoDB.Bson;
using JobTrackingAPI.Models;
using JobTrackingAPI.Settings;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using Microsoft.Extensions.Logging;
using JobTrackingAPI.Services;
using JobTrackingAPI.Hubs;
using Microsoft.AspNetCore.SignalR;
using JobTrackingAPI.DTOs;
using JobTrackingAPI.Enums;
using Microsoft.Extensions.Caching.Memory;

namespace JobTrackingAPI.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class TasksController : ControllerBase
    {
        private readonly ITasksService _tasksService;
        private readonly NotificationService _notificationService;
        private readonly ITeamService _teamsService;
        private readonly IMongoCollection<User> _usersCollection;
        private readonly IMongoCollection<TaskItem> _tasksCollection;
        private readonly IMongoCollection<Team> _teamsCollection;
        private readonly IMemoryCache _cache;
        private readonly ILogger<TasksController> _logger;
    
        public TasksController(
            ITasksService tasksService,
            IMongoClient mongoClient, 
            IOptions<MongoDbSettings> settings,
            NotificationService notificationService,
            ITeamService teamsService,
            IMemoryCache memoryCache,
            ILogger<TasksController> logger)
        {
            var database = mongoClient.GetDatabase(settings.Value.DatabaseName);
            _tasksService = tasksService;
            _notificationService = notificationService;
            _usersCollection = database.GetCollection<User>("Users");
            _tasksCollection = database.GetCollection<TaskItem>("Tasks");
            _teamsCollection = database.GetCollection<Team>("Teams");
            _teamsService = teamsService;
            _cache = memoryCache;
            _logger = logger;
        }
    
        [HttpPost]
        public async Task<ActionResult<TaskItem>> CreateTask([FromBody] TaskItem task)
        {
            try
            {
                // Validate required fields
                if (task == null)
                    return BadRequest(new { message = "Task data is required" });

                if (string.IsNullOrEmpty(task.Title))
                    return BadRequest(new { message = "Task title is required" });

                // Initialize collections if they're null
                task.Attachments ??= new List<TaskAttachment>();
                task.Dependencies ??= new List<string>();
                task.SubTasks ??= new List<SubTask>();

                // Get current user ID from claims
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                    return Unauthorized(new { message = "User not authenticated" });

                // Set creator information from claims - avoid DB query
                task.CreatedBy = new UserReference
                {
                    Id = userId,
                    Username = User.FindFirst(ClaimTypes.Name)?.Value ?? "",
                    FullName = User.FindFirst("FullName")?.Value ?? ""
                };

                // Optimize assigned users verification
                if (task.AssignedUsers != null && task.AssignedUsers.Any())
                {
                    // Create a set of user IDs for faster lookup
                    var userIdSet = new HashSet<string>(task.AssignedUsers.Select(u => u.Id));
                    
                    // Fetch all users in one database query instead of multiple
                    var userFilter = Builders<User>.Filter.In(u => u.Id, userIdSet);
                    var users = await _usersCollection.Find(userFilter)
                        .Project<User>(Builders<User>.Projection
                            .Include(u => u.Id)
                            .Include(u => u.Username)
                            .Include(u => u.Email)
                            .Include(u => u.FullName)
                            .Include(u => u.Department)
                            .Include(u => u.Title)
                            .Include(u => u.Position)
                            .Include(u => u.ProfileImage))
                        .ToListAsync();
                        
                    // Map to dictionary for O(1) lookups
                    var userDict = users.ToDictionary(u => u.Id);
                    
                    var updatedAssignedUsers = new List<AssignedUser>();
                    foreach (var assignedUser in task.AssignedUsers)
                    {
                        if (string.IsNullOrEmpty(assignedUser.Id))
                        {
                            return BadRequest($"Atanan kullanıcı ID'si boş olamaz.");
                        }
                        
                        if (!userDict.TryGetValue(assignedUser.Id, out var user))
                        {
                            return BadRequest($"ID'si {assignedUser.Id} olan kullanıcı bulunamadı.");
                        }
                        
                        updatedAssignedUsers.Add(new AssignedUser
                        {
                            Id = user.Id,
                            Username = user.Username,
                            Email = user.Email,
                            FullName = user.FullName,
                            Department = user.Department,
                            Title = user.Title,
                            Position = user.Position,
                            ProfileImage = user.ProfileImage
                        });
                        
                        // Send notification to assigned user
                        await _notificationService.SendNotificationAsync(new NotificationDto
                        {
                            UserId = user.Id,
                            Title = "Yeni Görev Atandı",
                            Message = $"{task.Title} görevi size atandı.",
                            Type = NotificationType.TaskAssigned,
                            RelatedJobId = task.Id
                        });
                    }
                    task.AssignedUsers = updatedAssignedUsers;
                }

                // Set dates
                task.CreatedAt = DateTime.UtcNow;
                task.UpdatedAt = DateTime.UtcNow;
                
                // Check if dependencies exist and are valid
                if (task.Dependencies.Any())
                {
                    var dependencyTasks = await _tasksService.GetTasks();
                    var validDependencyIds = dependencyTasks.Select(t => t.Id).ToList();
                    
                    if (task.Dependencies.Any(depId => !validDependencyIds.Contains(depId)))
                    {
                        return BadRequest(new { message = "One or more dependency tasks do not exist" });
                    }
                }

                var createdTask = await _tasksService.CreateTask(task);

                // Clear related caches
                ClearTaskRelatedCaches(userId);

                return CreatedAtAction(nameof(GetTask), new { id = createdTask.Id }, createdTask);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}/complete")]
        [HttpPost("{id}/complete")]
        public async Task<ActionResult> CompleteTaskPost(string id)
        {
            try
            {
                var task = await _tasksService.GetTask(id);
                if (task == null)
                    return NotFound(new { message = "Task not found" });

                if (task.Status == "completed")
                    return BadRequest(new { message = "Task is already completed" });

                if (string.IsNullOrEmpty(task.TeamId) || !MongoDB.Bson.ObjectId.TryParse(task.TeamId, out _))
                    return BadRequest(new { message = "Invalid team ID format" });

                var oldStatus = task.Status;
                task.Status = "completed";
                task.CompletedDate = DateTime.UtcNow;
                
                // Update task first
                await _tasksService.UpdateTask(id, task);

                try {
                    // Update performance score for each assigned user
                    if (task.AssignedUsers != null)
                    {
                        foreach (var user in task.AssignedUsers)
                        {
                            try
                            {
                                var assignedTeams = await _teamsService.GetTeamsByUserId(user.Id);
                                if (!assignedTeams.Any())
                                {
                                    Console.WriteLine($"Skipping performance update for user {user.Id} - no team membership found");
                                    continue;
                                }
                                
                                await _teamsService.UpdateUserPerformance(user.Id);
                            }
                            catch (Exception userEx)
                            {
                                Console.WriteLine($"Error updating performance for user {user.Id}: {userEx.Message}");
                                // Continue with other users even if one fails
                            }
                        }
                    }
                }
                catch (Exception perfEx)
                {
                    Console.WriteLine($"Error updating performance scores: {perfEx.Message}");
                    // Return success even if performance update fails, since the task was completed
                }

                return Ok(new { message = "Task completed successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
        
        [HttpPut("{id}")]
        public async Task<ActionResult> UpdateTask(string id, [FromBody] TaskItem updatedTask)
        {
            try
            {
                // Get task from cache if available
                var cacheKey = $"task_{id}";
                TaskItem existingTask = null;
                
                if (!_cache.TryGetValue(cacheKey, out existingTask))
                {
                    existingTask = await _tasksService.GetTask(id);
                    if (existingTask == null)
                        return NotFound();
                        
                    // Cache the task for future use - short expiry is fine for task details
                    _cache.Set(cacheKey, existingTask, TimeSpan.FromMinutes(2));
                }

                // Preserve the creator information
                updatedTask.CreatedBy = existingTask.CreatedBy;

                // Check if task became overdue
                if (existingTask.Status != "completed" && 
                    DateTime.UtcNow > existingTask.DueDate && 
                    existingTask.Status != "overdue")
                {
                    updatedTask.Status = "overdue";
                }

                // UpdateTask in the service now handles file deletion if status changes to completed or overdue
                await _tasksService.UpdateTask(id, updatedTask);
                
                // Invalidate cache for this task
                _cache.Remove(cacheKey);
                
                // Invalidate user task caches for all assigned users
                if (updatedTask.AssignedUsers != null)
                {
                    foreach (var user in updatedTask.AssignedUsers)
                    {
                        _cache.Remove($"user_tasks_{user.Id}");
                        
                        await _notificationService.SendNotificationAsync(new NotificationDto
                        {
                            UserId = user.Id,
                            Title = "Görev Güncellendi",
                            Message = $"{updatedTask.Title} görevi güncellendi.",
                            Type = NotificationType.TaskUpdated,
                            RelatedJobId = updatedTask.Id
                        });
                    }
                }

                // Clear related caches
                ClearTaskRelatedCaches(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
                
                // Also clear caches for all users assigned to this task
                if (updatedTask.AssignedUsers != null)
                {
                    foreach (var user in updatedTask.AssignedUsers)
                    {
                        if (!string.IsNullOrEmpty(user.Id) && user.Id != User.FindFirst(ClaimTypes.NameIdentifier)?.Value)
                        {
                            ClearTaskRelatedCaches(user.Id);
                        }
                    }
                }
                
                return Ok(updatedTask);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<TaskItem>>> GetTasks()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return BadRequest(new { message = "User not authenticated" });
            }

            try
            {
                // Use a cache key specific to the user
                var cacheKey = $"all_tasks_{userId}";
                
                // Check if tasks are already in cache
                if (_cache.TryGetValue(cacheKey, out List<TaskItem> cachedTasks))
                {
                    _logger.LogInformation("Returning tasks from cache for user {UserId}", userId);
                    return Ok(cachedTasks);
                }
                
                _logger.LogInformation("Fetching tasks from database for user {UserId}", userId);
                var tasks = await _tasksService.GetTasksOptimized(userId);
                
                // Cache tasks for 5 minutes
                _cache.Set(cacheKey, tasks, TimeSpan.FromMinutes(5));
                
                return Ok(tasks);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting tasks for user {UserId}", userId);
                return StatusCode(500, new { message = $"Internal server error: {ex.Message}" });
            }
        }
        
        [HttpGet("user/{userId}/active-tasks")]
        public async Task<ActionResult<IEnumerable<TaskItem>>> GetUserActiveTasks(string userId)
        {
            var tasks = await _tasksService.GetTasksByUserId(userId);
            var activeTasks = tasks.Where(t => t.Status != "completed" && t.Status != "cancelled").ToList();
            return Ok(activeTasks);
        }
        
        [HttpGet("{id}")]
        public async Task<ActionResult<TaskItem>> GetTask(string id)
        {
            try
            {
                var cacheKey = $"task_{id}";
                
                // Check if the task is already in cache
                if (_cache.TryGetValue(cacheKey, out TaskItem cachedTask))
                {
                    return cachedTask;
                }
                
                var task = await _tasksService.GetTask(id);
                
                if (task == null)
                {
                    return NotFound(new { message = "Task not found" });
                }
                
                // Cache the task for 5 minutes
                _cache.Set(cacheKey, task, TimeSpan.FromMinutes(5));
                
                return task;
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Internal server error: {ex.Message}" });
            }
        }

        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<TaskItem>>> GetUserTasks(string userId)
        {
            var tasks = await _tasksService.GetTasksByUserId(userId);
            return Ok(tasks);
        }
        
        [HttpGet("download/{attachmentId}/{fileName}")]
        public IActionResult DownloadFile(string attachmentId, string fileName)
        {            
            var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", fileName);
            
            if (!System.IO.File.Exists(filePath))
                return NotFound("File not found");

            var contentType = "application/octet-stream";
            var originalFileName = fileName.Substring(fileName.IndexOf('_') + 1);

            return PhysicalFile(filePath, contentType, originalFileName);
        }
        
        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteTask(string id)
        {
            try
            {
                // DeleteTask in the service now handles file deletion
                await _tasksService.DeleteTask(id);

                // Clear related caches
                ClearTaskRelatedCaches(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

                return Ok(new { message = "Task deleted successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}/status")]
        public async Task<ActionResult> UpdateTaskStatus(string id, [FromBody] string status)
        {
            try
            {
                var task = await _tasksService.GetTask(id);
                if (task == null)
                    return NotFound();

                var oldStatus = task.Status;
                task.Status = status;
                
                if (status == "completed" && oldStatus != "completed")
                {
                    task.CompletedDate = DateTime.UtcNow;
                    return BadRequest("Tüm alt görevler tamamlanmadan görev tamamlanamaz");
                }

                // Görevi tamamlandı olarak işaretle
                var updateTask = Builders<TaskItem>.Update
                    .Set(t => t.Status, "completed")
                    .Set(t => t.UpdatedAt, DateTime.UtcNow)
                    .Set(t => t.IsLocked, true); // Görevi kilitli olarak işaretle
                await _tasksCollection.UpdateOneAsync(t => t.Id == id, updateTask);

                // Send notifications to all assigned users about task completion
                if (task.AssignedUsers != null)
                {
                    foreach (var user in task.AssignedUsers)
                    {
                        await _notificationService.SendNotificationAsync(new NotificationDto
                        {
                            UserId = user.Id,
                            Title = "Görev Tamamlandı",
                            Message = $"{task.Title} görevi tamamlandı.",
                            Type = NotificationType.TaskCompleted,
                            RelatedJobId = task.Id
                        });
                    }
                }
                
                // Update team statistics
                if (task.AssignedUsers != null)
                {
                    foreach (var assignedUser in task.AssignedUsers)
                    {
                        var teams = await _teamsCollection.Find(t => t.Members.Any(m => m.Id == assignedUser.Id)).ToListAsync();
                        
                        // Görev tamamlandığında, atanan tüm kullanıcıların performans skorlarını güncelle
                        foreach (var user in task.AssignedUsers)
                        {
                            // Her kullanıcı için görev listesini getir
                            var userTasks = await _tasksService.GetTasksByUserId(user.Id);
                            
                            // Doğru ekip için performans skorunu güncelle
                            if (!string.IsNullOrEmpty(task.TeamId))
                            {
                                var team = await _teamsService.GetTeamById(task.TeamId);
                                if (team != null)
                                {
                                    // Sadece görevin ait olduğu ekipteki performans skorunu güncelle
                                    await _teamsService.UpdateUserPerformance(user.Id);
                                }
                            }
                        }
                    }
                }
                
                await _tasksService.UpdateTask(id, task);
                return Ok(new { message = "Task status updated successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
        
        [HttpPost("{id}/file")]
        public async Task<IActionResult> FileUpload(string id, IFormFile file)
        {
            try
            {
                // Check if the task is completed or overdue before allowing file upload
                var task = await _tasksService.GetTask(id);
                if (task == null) 
                    return NotFound("Task not found");

                if (task.Status == "completed" || task.Status == "overdue")
                    return BadRequest("Cannot upload files to completed or overdue tasks");

                if (file == null || file.Length == 0)
                    return BadRequest("No file uploaded.");
                
                if (file.Length > 1024 * 1024 * 10) // 10MB limit
                    return BadRequest("File size exceeds the limit (10MB).");

                var allowedExtensions = new[] {".jpg", ".png", ".jpeg", ".pdf", ".zip", ".docx", ".doc", ".rar", ".txt", ".xlsx", ".xls",".enc"};
                var fileExtension = Path.GetExtension(file.FileName).ToLowerInvariant();
                
                if (!allowedExtensions.Contains(fileExtension))
                    return BadRequest("Invalid file format.");

                var uploadFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
                Directory.CreateDirectory(uploadFolder);

                var uniqueFileName = $"{Guid.NewGuid()}_{Path.GetFileName(file.FileName)}";
                var filePath = Path.Combine(uploadFolder, uniqueFileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                var fileUrl = $"/uploads/{uniqueFileName}";
                await _tasksService.FileUpload(id, fileUrl);

                var updatedTask = await _tasksService.GetTask(id);
                var attachment = updatedTask?.Attachments?.LastOrDefault();

                if (attachment == null)
                    return Ok(new { taskId = id, message = "File uploaded but attachment details not available" });

                return Ok(new { 
                    taskId = id,
                    attachment = new {
                        id = attachment.Id,
                        fileName = attachment.FileName,
                        fileUrl = attachment.FileUrl,
                        fileType = attachment.FileType,
                        uploadDate = attachment.UploadDate
                    }
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
        
        [HttpGet("dashboard")]
        [Authorize]
        public async Task<ActionResult<DashboardStats>> GetDashboardStats()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return BadRequest(new { message = "User not authenticated" });
                }

                // Add an actual async operation to avoid CS1998 warning
                await Task.Delay(1); // Minimal async operation to satisfy the compiler
                
                return Ok(new { message = "200" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
        [HttpGet("assigned-to-me")]
        [Authorize]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> GetTasksAssignedToCurrentUser()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "Kullanıcı kimliği doğrulanamadı." });
                }
                
                var cacheKey = $"user_tasks_{userId}";
                
                // Try to get from cache first with longer expiration
                if (_cache.TryGetValue(cacheKey, out List<TaskItem> cachedTasks))
                {
                    return Ok(cachedTasks);
                }
                
                // Otherwise fetch from DB
                var tasks = await _tasksService.GetTasksAssignedToUserAsync(userId);
                
                // Cache the result for 5 minutes instead of 2
                _cache.Set(cacheKey, tasks, TimeSpan.FromMinutes(5));
                
                return Ok(tasks);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting tasks for current user");
                return StatusCode(500, new { message = "Görevler getirilirken bir hata oluştu: " + ex.Message });
            }
        }


        [HttpGet("history")]
        public async Task<ActionResult<IEnumerable<TaskHistoryDto>>> GetTaskHistory()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                // Use a cache key specific to the user's history
                var cacheKey = $"task_history_{userId}";
                
                // Check if history is already in cache
                if (_cache.TryGetValue(cacheKey, out List<TaskHistoryDto> cachedHistory))
                {
                    _logger.LogInformation("Returning task history from cache for user {UserId}", userId);
                    return Ok(cachedHistory);
                }
                
                _logger.LogInformation("Fetching task history from database for user {UserId}", userId);
                var history = await _tasksService.GetUserTaskHistory(userId);
                
                // Cache history for 5 minutes
                _cache.Set(cacheKey, history, TimeSpan.FromMinutes(5));
                
                return Ok(history);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting task history");
                return StatusCode(500, new { message = $"Internal server error: {ex.Message}" });
            }
        }

        // Helper method to clear task-related caches for a user
        private void ClearTaskRelatedCaches(string userId)
        {
            _cache.Remove($"all_tasks_{userId}");
            _cache.Remove($"assigned_tasks_{userId}");
            
            // Optionally clear task history and any other related caches
            _cache.Remove($"task_history_{userId}");
        }
    }
}