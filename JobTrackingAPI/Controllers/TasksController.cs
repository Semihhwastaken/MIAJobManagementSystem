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
        private readonly CacheService _cacheService;
        private readonly ILogger<TasksController> _logger;
    
        public TasksController(
            ITasksService tasksService,
            IMongoClient mongoClient, 
            IOptions<MongoDbSettings> settings,
            NotificationService notificationService,
            ITeamService teamsService,
            CacheService cacheService,
            ILogger<TasksController> logger)
        {
            var database = mongoClient.GetDatabase(settings.Value.DatabaseName);
            _tasksService = tasksService;
            _notificationService = notificationService;
            _usersCollection = database.GetCollection<User>("Users");
            _tasksCollection = database.GetCollection<TaskItem>("Tasks");
            _teamsCollection = database.GetCollection<Team>("Teams");
            _teamsService = teamsService;
            _cacheService = cacheService;
            _logger = logger;
        }
    
        [HttpPost]
        public async Task<ActionResult<TaskItem>> CreateTask([FromBody] TaskItem task)
        {
            try
            {
                _logger.LogInformation("Creating new task with title: {Title}", task?.Title ?? "null");
                
                // Validate required fields
                if (task == null)
                    return BadRequest(new { message = "Task data is required" });
                if (string.IsNullOrEmpty(task.Title))
                    return BadRequest(new { message = "Task title is required" });
                
                // Initialize collections if they're null
                task.Attachments ??= new List<TaskAttachment>();
                task.Dependencies ??= new List<string>();
                task.SubTasks ??= new List<SubTask>();
                
                // Atanan kullanıcıları doğrula ve bilgilerini güncelle
                if (task.AssignedUsers != null && task.AssignedUsers.Any())
                {
                    var updatedAssignedUsers = new List<AssignedUser>();
                    foreach (var assignedUser in task.AssignedUsers)
                    {
                        if (string.IsNullOrEmpty(assignedUser.Id))
                        {
                            return BadRequest($"Atanan kullanıcı ID'si boş olamaz.");
                        }
                        var user = await _usersCollection.Find(u => u.Id == assignedUser.Id).FirstOrDefaultAsync();
                        if (user == null)
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
                // Tarihleri ayarla
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
                _logger.LogInformation("Task created successfully: {TaskId}", createdTask.Id);
                
                // Invalidate caches after creating a new task
                InvalidateTaskRelatedCaches(createdTask);
                
                return CreatedAtAction(nameof(GetTask), new { id = createdTask.Id }, createdTask);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating task");
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}/complete")]
        [HttpPost("{id}/complete")]
        public async Task<ActionResult> CompleteTaskPost(string id)
        {
            try
            {
                _logger.LogInformation("Completing task: {TaskId}", id);
                
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
                _logger.LogInformation("Task {TaskId} marked as completed", id);
                
                try {
                    // Update performance score for each assigned user
                    if (task.AssignedUsers != null)
                    {
                        _logger.LogInformation("Updating performance scores for {Count} assigned users", task.AssignedUsers.Count);
                        foreach (var user in task.AssignedUsers)
                        {
                            try
                            {
                                var assignedTeams = await _teamsService.GetTeamsByUserId(user.Id);
                                if (!assignedTeams.Any())
                                {
                                    _logger.LogWarning("Skipping performance update for user {UserId} - no team membership found", user.Id);
                                    continue;
                                }
                                
                                await _teamsService.UpdateUserPerformance(user.Id);
                                
                                // Invalidate user-related caches
                                _cacheService.InvalidateUserCaches(user.Id);
                            }
                            catch (Exception userEx)
                            {
                                _logger.LogError(userEx, "Error updating performance for user {UserId}", user.Id);
                                // Continue with other users even if one fails
                            }
                        }
                    }
                }
                catch (Exception perfEx)
                {
                    _logger.LogError(perfEx, "Error updating performance scores for task {TaskId}", id);
                    // Return success even if performance update fails, since the task was completed
                }
                
                // Invalidate task-related caches
                InvalidateTaskRelatedCaches(task);
                
                return Ok(new { message = "Task completed successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error completing task {TaskId}", id);
                return BadRequest(new { message = ex.Message });
            }
        }
        
        [HttpPut("{id}")]
        public async Task<ActionResult> UpdateTask(string id, [FromBody] TaskItem updatedTask)
        {
            try
            {
                _logger.LogInformation("Updating task: {TaskId}", id);
                
                var existingTask = await _tasksService.GetTask(id);
                if (existingTask == null)
                    return NotFound();
                // Check if task became overdue
                if (existingTask.Status != "completed" && 
                    DateTime.UtcNow > existingTask.DueDate && 
                    existingTask.Status != "overdue")
                {
                    updatedTask.Status = "overdue";
                }
                // UpdateTask in the service now handles file deletion if status changes to completed or overdue
                await _tasksService.UpdateTask(id, updatedTask);
                
                _logger.LogInformation("Task {TaskId} updated successfully", id);
                
                // Send notifications to all assigned users about the task update
                if (updatedTask.AssignedUsers != null)
                {
                    foreach (var user in updatedTask.AssignedUsers)
                    {
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
                
                // Invalidate task-related caches
                InvalidateTaskRelatedCaches(updatedTask);
                
                return Ok(updatedTask);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating task {TaskId}", id);
                return BadRequest(new { message = ex.Message });
            }
        }
        
        [HttpGet]
        public async Task<ActionResult<IEnumerable<TaskItem>>> GetTasks()
        {
            _logger.LogInformation("Getting all tasks for current user");
            
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return BadRequest(new { message = "User not authenticated" });
            }
            
            // Try to get from cache first
            var cachedTasks = _cacheService.GetCachedUserTasks(userId);
            if (cachedTasks != null)
            {
                _logger.LogInformation("Retrieved tasks for user {UserId} from cache", userId);
                var activeCachedTasks = cachedTasks.Where(t => t.Status != "completed").ToList();
                return Ok(activeCachedTasks);
            }
            
            var tasks = await _tasksService.GetTasksByUserId(userId);
            _logger.LogInformation("Retrieved {Count} tasks for user {UserId} from database", tasks.Count, userId);
            
            // Cache the tasks
            _cacheService.CacheUserTasks(userId, tasks);
            
            var activeTasks = tasks.Where(t => t.Status != "completed").ToList();
            return Ok(activeTasks);
        }
        
        [HttpGet("user/{userId}/active-tasks")]
        public async Task<ActionResult<IEnumerable<TaskItem>>> GetUserActiveTasks(string userId)
        {
            _logger.LogInformation("Getting active tasks for user: {UserId}", userId);
            
            // Try to get from cache first
            string cacheKey = $"active_tasks_{userId}";
            var cachedActiveTasks = _cacheService.GetOrCreate<List<TaskItem>>(cacheKey, () => null);
            if (cachedActiveTasks != null)
            {
                _logger.LogInformation("Retrieved active tasks for user {UserId} from cache", userId);
                return Ok(cachedActiveTasks);
            }
            
            var tasks = await _tasksService.GetTasksByUserId(userId);
            var activeTasks = tasks.Where(t => t.Status != "completed" && t.Status != "cancelled").ToList();
            
            _logger.LogInformation("Retrieved {Count} active tasks for user {UserId} from database", activeTasks.Count, userId);
            
            // Cache the active tasks
            _cacheService.GetOrCreate(cacheKey, () => activeTasks, TimeSpan.FromMinutes(5));
            
            return Ok(activeTasks);
        }
        
        [HttpGet("{id}")]
        public async Task<ActionResult<TaskItem>> GetTask(string id)
        {
            _logger.LogInformation("Getting task details: {TaskId}", id);
            
            // Try to get from cache first
            string cacheKey = $"task_{id}";
            var cachedTask = _cacheService.GetOrCreate<TaskItem>(cacheKey, () => null);
            if (cachedTask != null)
            {
                _logger.LogInformation("Retrieved task {TaskId} from cache", id);
                return Ok(cachedTask);
            }
            
            var task = await _tasksService.GetTask(id);
            if (task == null)
                return NotFound();
                
            _logger.LogInformation("Retrieved task {TaskId} from database", id);
            
            // Cache the task
            _cacheService.GetOrCreate(cacheKey, () => task, TimeSpan.FromMinutes(10));
            
            return Ok(task);
        }
        
        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<TaskItem>>> GetUserTasks(string userId)
        {
            _logger.LogInformation("Getting all tasks for user: {UserId}", userId);
            
            // Try to get from cache first
            var cachedTasks = _cacheService.GetCachedUserTasks(userId);
            if (cachedTasks != null)
            {
                _logger.LogInformation("Retrieved tasks for user {UserId} from cache", userId);
                return Ok(cachedTasks);
            }
            
            var tasks = await _tasksService.GetTasksByUserId(userId);
            _logger.LogInformation("Retrieved {Count} tasks for user {UserId} from database", tasks.Count, userId);
            
            // Cache the tasks
            _cacheService.CacheUserTasks(userId, tasks);
            
            return Ok(tasks);
        }
        
        [HttpGet("download/{attachmentId}/{fileName}")]
        public IActionResult DownloadFile(string attachmentId, string fileName)
        {   
            _logger.LogInformation("Downloading file: {FileName}, attachment ID: {AttachmentId}", fileName, attachmentId);
            
            var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", fileName);
            
            if (!System.IO.File.Exists(filePath))
            {
                _logger.LogWarning("File not found: {FilePath}", filePath);
                return NotFound("File not found");
            }
                
            var contentType = "application/octet-stream";
            var originalFileName = fileName.Substring(fileName.IndexOf('_') + 1);
            
            _logger.LogInformation("Serving file: {FileName}", originalFileName);
            return PhysicalFile(filePath, contentType, originalFileName);
        }
        
        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteTask(string id)
        {
            try
            {
                _logger.LogInformation("Deleting task: {TaskId}", id);
                
                var task = await _tasksService.GetTask(id);
                if (task == null)
                {
                    _logger.LogWarning("Attempted to delete non-existent task: {TaskId}", id);
                    return NotFound("Task not found");
                }
                
                // DeleteTask in the service now handles file deletion
                await _tasksService.DeleteTask(id);
                
                _logger.LogInformation("Task {TaskId} deleted successfully", id);
                
                // Invalidate task-related caches
                InvalidateTaskRelatedCaches(task);
                
                return Ok(new { message = "Task deleted successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting task {TaskId}", id);
                return BadRequest(new { message = ex.Message });
            }
        }
        
        [HttpPut("{id}/status")]
        public async Task<ActionResult> UpdateTaskStatus(string id, [FromBody] string status)
        {
            try
            {
                _logger.LogInformation("Updating status for task {TaskId} to {Status}", id, status);
                
                var task = await _tasksService.GetTask(id);
                if (task == null)
                    return NotFound();
                var oldStatus = task.Status;
                task.Status = status;
                
                if (status == "completed" && oldStatus != "completed")
                {
                    task.CompletedDate = DateTime.UtcNow;
                    
                    // Check subtasks
                    if (task.SubTasks != null && task.SubTasks.Any(st => !st.Completed))
                    {
                        _logger.LogWarning("Attempted to complete task {TaskId} with incomplete subtasks", id);
                        return BadRequest("Tüm alt görevler tamamlanmadan görev tamamlanamaz");
                    }
                }
                
                // Update task
                if (status == "completed")
                {
                    // Görevi tamamlandı olarak işaretle
                    var updateTask = Builders<TaskItem>.Update
                        .Set(t => t.Status, "completed")
                        .Set(t => t.UpdatedAt, DateTime.UtcNow)
                        .Set(t => t.IsLocked, true) // Görevi kilitli olarak işaretle
                        .Set(t => t.CompletedDate, DateTime.UtcNow);
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
                            // Her kullanıcı için görev listesini getir
                            var userTasks = await _tasksService.GetTasksByUserId(assignedUser.Id);
                            
                            // Doğru ekip için performans skorunu güncelle
                            if (!string.IsNullOrEmpty(task.TeamId))
                            {
                                var team = await _teamsService.GetTeamById(task.TeamId);
                                if (team != null)
                                {
                                    // Sadece görevin ait olduğu ekipteki performans skorunu güncelle
                                    await _teamsService.UpdateUserPerformance(assignedUser.Id);
                                    
                                    // Invalidate user cache after performance update
                                    _cacheService.InvalidateUserCaches(assignedUser.Id);
                                }
                            }
                        }
                    }
                }
                else
                {
                    // For other status updates
                    await _tasksService.UpdateTask(id, task);
                }
                
                _logger.LogInformation("Task {TaskId} status updated from {OldStatus} to {NewStatus}", id, oldStatus, status);
                
                // Invalidate task-related caches
                InvalidateTaskRelatedCaches(task);
                
                return Ok(new { message = "Task status updated successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating status for task {TaskId}", id);
                return BadRequest(new { message = ex.Message });
            }
        }
        
        [HttpPost("{id}/file")]
        public async Task<IActionResult> FileUpload(string id, IFormFile file)
        {
            try
            {
                _logger.LogInformation("Uploading file to task {TaskId}: {FileName}, size: {FileSize}KB", 
                    id, file?.FileName ?? "null", file?.Length / 1024 ?? 0);
                    
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
                
                _logger.LogInformation("File uploaded successfully to {FilePath}", fileUrl);
                
                await _tasksService.FileUpload(id, fileUrl);
                
                // Invalidate task cache after file upload
                _cacheService.GetOrCreate<TaskItem>($"task_{id}", null);
                
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
                _logger.LogError(ex, "Error uploading file to task {TaskId}", id);
                return BadRequest(new { message = ex.Message });
            }
        }
        
        [HttpGet("dashboard")]
        [Authorize]
        public async Task<ActionResult<DashboardStats>> GetDashboardStats()
        {
            try
            {
                _logger.LogInformation("Getting dashboard stats for current user");
                
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return BadRequest(new { message = "User not authenticated" });
                }
                
                // Try to get from cache first
                string cacheKey = $"dashboard_stats_{userId}";
                var cachedStats = _cacheService.GetOrCreate<object>(cacheKey, () => null, TimeSpan.FromMinutes(5));
                if (cachedStats != null)
                {
                    _logger.LogInformation("Retrieved dashboard stats for user {UserId} from cache", userId);
                    return Ok(cachedStats);
                }
                
                // Add an actual async operation to avoid CS1998 warning
                await Task.Delay(1); // Minimal async operation to satisfy the compiler
                
                var stats = new { message = "200" };
                
                // Cache the dashboard stats
                _cacheService.GetOrCreate(cacheKey, () => stats, TimeSpan.FromMinutes(5));
                _logger.LogInformation("Cached dashboard stats for user {UserId}", userId);
                
                return Ok(stats);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving dashboard stats");
                return BadRequest(new { message = ex.Message });
            }
        }
        
        [HttpGet("history")]
        public async Task<ActionResult<IEnumerable<TaskHistoryDto>>> GetTaskHistory()
        {
            try
            {
                _logger.LogInformation("Getting task history");
                
                // Try to get from cache first
                string cacheKey = "task_history";
                var cachedHistory = _cacheService.GetOrCreate<List<TaskItem>>(cacheKey, () => null, TimeSpan.FromMinutes(10));
                if (cachedHistory != null)
                {
                    _logger.LogInformation("Retrieved task history from cache");
                    return Ok(cachedHistory);
                }
                
                var tasks = await _tasksService.GetTasks();
                _logger.LogInformation("Retrieved {Count} tasks for history", tasks.Count);
                
                var historicalTasks = tasks.Where(t => t.Status == "completed" || t.Status == "overdue")
                                         .OrderByDescending(t => t.UpdatedAt)
                                         .ToList();
                
                // Cache the task history
                _cacheService.GetOrCreate(cacheKey, () => historicalTasks, TimeSpan.FromMinutes(10));
                _logger.LogInformation("Cached task history with {Count} items", historicalTasks.Count);
                
                return Ok(historicalTasks);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving task history");
                return StatusCode(500, new { message = $"Internal server error: {ex.Message}" });
            }
        }
        
        // Helper method to invalidate all related caches when a task is modified
        private void InvalidateTaskRelatedCaches(TaskItem task)
        {
            if (task == null)
            {
                _logger.LogWarning("Attempted to invalidate caches for a null task");
                return;
            }

            _logger.LogInformation("Invalidating caches for task: {TaskId}", task.Id ?? "unknown");
            
            try
            {
                // Invalidate the task's own cache if ID exists
                if (!string.IsNullOrEmpty(task.Id))
                {
                    _cacheService.GetOrCreate<TaskItem>($"task_{task.Id}", () => null);
                }
                
                // Invalidate task history cache
                _cacheService.GetOrCreate<List<TaskItem>>("task_history", () => null);
                
                // Invalidate caches for all assigned users
                if (task.AssignedUsers != null)
                {
                    foreach (var user in task.AssignedUsers)
                    {
                        if (user != null && !string.IsNullOrEmpty(user.Id))
                        {
                            _cacheService.InvalidateUserCaches(user.Id);
                            _cacheService.GetOrCreate<List<TaskItem>>($"active_tasks_{user.Id}", () => null);
                            _logger.LogInformation("Invalidated cache for user: {UserId}", user.Id);
                        }
                    }
                }
                
                // If the task belongs to a team, invalidate team-related caches
                if (!string.IsNullOrEmpty(task.TeamId))
                {
                    _cacheService.InvalidateTeamCaches(task.TeamId);
                    _logger.LogInformation("Invalidated cache for team: {TeamId}", task.TeamId);
                }
                
                _logger.LogInformation("Cache invalidation complete for task: {TaskId}", task.Id ?? "unknown");
            }
            catch (Exception ex)
            {
                // Don't let cache issues block the main operation
                _logger.LogError(ex, "Error during cache invalidation for task {TaskId}, continuing operation", task.Id ?? "unknown");
            }
        }
    }
}