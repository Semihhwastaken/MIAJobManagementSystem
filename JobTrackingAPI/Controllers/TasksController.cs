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
        private readonly IUserService _userService;
        private readonly IActivityService _activityService;

        public TasksController(
            ITasksService tasksService,
            IMongoClient mongoClient,
            IOptions<MongoDbSettings> settings,
            NotificationService notificationService,
            ITeamService teamsService,
            CacheService cacheService,
            ILogger<TasksController> logger,
            IUserService userService,
            IActivityService activityService)
        {
            var database = mongoClient.GetDatabase(settings.Value.DatabaseName);
            _tasksService = tasksService;
            _notificationService = notificationService;
            _teamsService = teamsService;
            _usersCollection = database.GetCollection<User>(settings.Value.UsersCollectionName);
            _tasksCollection = database.GetCollection<TaskItem>(settings.Value.TasksCollectionName);
            _teamsCollection = database.GetCollection<Team>(settings.Value.TeamsCollectionName);
            _cacheService = cacheService;
            _logger = logger;
            _userService = userService;
            _activityService = activityService;
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

                // Ensure the Id is generated if not provided
                if (string.IsNullOrEmpty(task.Id))
                {
                    task.Id = MongoDB.Bson.ObjectId.GenerateNewId().ToString();
                }

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

                // Görev atanan kullanıcıların assignedJobs listelerini güncelle
                if (createdTask.AssignedUserIds != null && createdTask.AssignedUserIds.Any())
                {
                    foreach (var assignedUserId in createdTask.AssignedUserIds)
                    {
                        try
                        {
                            await _userService.AddToAssignedJobs(assignedUserId, createdTask.Id);
                            _logger.LogInformation("Added task {TaskId} to user {UserId} assigned jobs", createdTask.Id, assignedUserId);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Error updating assigned jobs for user {UserId}", assignedUserId);
                        }
                    }
                }

                // Invalidate caches after creating a new task
                InvalidateTaskRelatedCaches(createdTask);

                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!string.IsNullOrEmpty(userId))
                {
                    await _activityService.LogTaskActivity(
                        userId: userId,
                        taskId: createdTask.Id,
                        description: $"yeni görev oluşturdu: {createdTask.Title}"
                    );
                }

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

                foreach (var item in task.AssignedUsers)
                {
                    var user = await _usersCollection.Find(u => u.Id == item.Id).FirstOrDefaultAsync();
                    if (user == null)
                    {
                        return BadRequest($"ID'si {item.Id} olan kullanıcı bulunamadı.");
                    }
                    await _notificationService.SendNotificationAsync(new NotificationDto
                    {
                        UserId = user.Id,
                        Title = "Görev Tamamlandı",
                        Message = $"{task.Title} görevi tamamlandı.",
                        Type = NotificationType.TaskCompleted,
                        RelatedJobId = task.Id
                    });
                }
                {

                }

                try
                {
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

                // Ekibe ait önbelleği temizle
                if (!string.IsNullOrEmpty(task?.TeamId))
                {
                    _logger.LogInformation("Invalidating team caches for TeamId={TeamId}", task.TeamId);
                    _cacheService.InvalidateTeamCaches(task.TeamId);
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

                // Önce eski görev verilerini al
                var oldAssignedUserIds = existingTask.AssignedUserIds?.ToList() ?? new List<string>();
                var newAssignedUserIds = updatedTask.AssignedUsers?.Select(u => u.Id).ToList() ?? new List<string>();

                // Atanan kullanıcılarda değişiklik varsa bildirimleri gönder
                var removedUserIds = oldAssignedUserIds.Where(id => !newAssignedUserIds.Contains(id)).ToList();
                var addedUserIds = newAssignedUserIds.Where(id => !oldAssignedUserIds.Contains(id)).ToList();

                // Yeni AssignedUserIds listesini güncelle
                updatedTask.AssignedUserIds = newAssignedUserIds;

                // Görevden çıkarılan kullanıcılardan bu görevi kaldır
                foreach (var userId in removedUserIds)
                {
                    await _userService.RemoveFromAssignedJobs(userId, id);
                    _logger.LogInformation("Removed task {TaskId} from user {UserId} assigned jobs", id, userId);
                }

                // Göreve yeni eklenen kullanıcılara bu görevi ekle
                foreach (var userId in addedUserIds)
                {
                    await _userService.AddToAssignedJobs(userId, id);
                    _logger.LogInformation("Added task {TaskId} to user {UserId} assigned jobs", id, userId);
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
            try
            {
                

                // Kullanıcı kimliğini al
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized();
                }

                // Kullanıcı bilgilerini al - yetkilendirme için
                var user = await _usersCollection.Find(u => u.Id == userId).FirstOrDefaultAsync();
                if (user == null)
                {
                    return NotFound(new { message = "Kullanıcı bulunamadı" });
                }

                // Cache anahtarını kullanıcıya özel oluştur ve kısa bir ömür ver
                string cacheKey = $"all_tasks_{userId}";

                // Her istek için önbelleği yeniden validasyon yapmak üzere temizle (test için)
                _cacheService.Remove(cacheKey);

                var tasks = await _cacheService.GetOrUpdateAsync(
                    cacheKey,
                    async () =>
                    {
                        _logger.LogInformation("Cache missed, loading tasks from database");
                        var allTasks = await _tasksService.GetTasks();

                        // Her görev için sahiplik ve yetki bilgilerini işaretle
                        foreach (var task in allTasks ?? Enumerable.Empty<TaskItem>())
                        {
                            if (task.AssignedUserIds != null && task.AssignedUserIds.Contains(userId))
                            {
                                task.IsAssignedToCurrentUser = true;
                            }

                            // Admin veya görevin ekibinin sahibi ise izinleri ekle
                            if (user.OwnerTeams.Count > 0 ||
                                (task.TeamId != null && await IsTeamOwner(userId, task.TeamId)))
                            {
                                task.HasManagePermission = true;
                            }
                        }

                        return allTasks ?? new List<TaskItem>();
                    },
                    TimeSpan.FromSeconds(30) // Önbellek süresini ciddi oranda kısalttık
                );

                return Ok(tasks ?? new List<TaskItem>());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving tasks");
                return StatusCode(500, new { message = $"Internal server error: {ex.Message}" });
            }
        }

        // Kullanıcının belirtilen ekibin sahibi olup olmadığını kontrol eden yardımcı metod
        private async Task<bool> IsTeamOwner(string userId, string teamId)
        {
            try
            {
                if (string.IsNullOrEmpty(teamId) || !ObjectId.TryParse(teamId, out _))
                {
                    return false;
                }

                var team = await _teamsCollection.Find(t => t.Id == teamId).FirstOrDefaultAsync();
                return team != null && team.CreatedById == userId;
            }
            catch (Exception)
            {
                return false;
            }
        }

        [HttpGet("user/{userId}/active-tasks")]
        public async Task<ActionResult<IEnumerable<TaskItem>>> GetUserActiveTasks(string userId)
        {
            try
            {
                var tasks = await _cacheService.GetOrUpdateAsync(
                    $"active_tasks_{userId}",
                    async () =>
                    {
                        var allTasks = await _tasksService.GetTasksByUserId(userId);
                        return allTasks.Where(t => t.Status != "completed" && t.Status != "cancelled").ToList();
                    },
                    TimeSpan.FromMinutes(10)
                );

                return Ok(tasks);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving active tasks for user {UserId}", userId);
                return StatusCode(500, new { message = "Internal server error" });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<TaskItem>> GetTask(string id)
        {
            _logger.LogInformation("Getting task details: {TaskId}", id);

            try
            {
                var task = await _cacheService.GetOrUpdateAsync(
                    $"task_{id}",
                    async () => await _tasksService.GetTask(id),
                    TimeSpan.FromMinutes(15)
                );

                if (task == null)
                    return NotFound();

                return Ok(task);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving task {TaskId}", id);
                return StatusCode(500, new { message = "Internal server error" });
            }
        }

        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<TaskItem>>> GetUserTasks(string userId)
        {
           

            try
            {
                var tasks = await _cacheService.GetOrUpdateAsync(
                    $"user_tasks_{userId}",
                    async () => await _tasksService.GetTasksByUserId(userId),
                    TimeSpan.FromMinutes(15)
                );

                return Ok(tasks);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving tasks for user {UserId}", userId);
                return StatusCode(500, new { message = "Internal server error" });
            }
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

                foreach (var item in task.AssignedUsers)
                {
                    var user = await _usersCollection.Find(u => u.Id == item.Id).FirstOrDefaultAsync();
                    if (user == null)
                    {
                        _logger.LogWarning("User not found: {UserId} for task {TaskId}", item.Id, id);
                        continue;
                    }

                    // Kullanıcının assignedJobs listesinden görevi kaldır
                    await _userService.RemoveFromAssignedJobs(user.Id, id);
                    _logger.LogInformation("Removed task {TaskId} from user {UserId} assigned jobs", id, user.Id);

                    await _notificationService.SendNotificationAsync(new NotificationDto
                    {
                        UserId = user.Id,
                        Title = "Görev Silindi",
                        Message = $"{task.Title} görevi silindi.",
                        Type = NotificationType.TaskDeleted,
                        RelatedJobId = task.Id
                    });
                }

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

                // Ekibe ait önbelleği temizle
                if (!string.IsNullOrEmpty(task?.TeamId))
                {
                    _logger.LogInformation("Invalidating team caches for TeamId={TeamId}", task.TeamId);
                    _cacheService.InvalidateTeamCaches(task.TeamId);
                }

                // Invalidate task-related caches
                InvalidateTaskRelatedCaches(task);

                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!string.IsNullOrEmpty(userId))
                {
                    await _activityService.LogTaskActivity(
                        userId: userId,
                        taskId: id,
                        description: $"görev durumunu {status} olarak güncelledi"
                    );
                }

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
                var allowedExtensions = new[] { ".jpg", ".png", ".jpeg", ".pdf", ".zip", ".docx", ".doc", ".rar", ".txt", ".xlsx", ".xls", ".enc" };
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

                // Invalidate task cache
                InvalidateTaskRelatedCaches(task);

                var updatedTask = await _tasksService.GetTask(id);
                var attachment = updatedTask?.Attachments?.LastOrDefault();
                if (attachment == null)
                    return Ok(new { taskId = id, message = "File uploaded but attachment details not available" });

                return Ok(new
                {
                    taskId = id,
                    attachment = new
                    {
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
        public async Task<ActionResult<DashboardStats>> GetDashboardStats([FromQuery] bool forTeam = false, [FromQuery] string? teamId = null)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                // Fix the conditional expression by ensuring both return the same type
                List<TaskItem> tasks;
                if (forTeam)
                {
                    var teamTasks = await _tasksService.GetTasksByTeamsAsync(new List<string> { teamId ?? string.Empty });
                    tasks = teamTasks.ToList();
                }
                else
                {
                    tasks = (await _tasksService.GetTasks()).ToList();
                }

                tasks = tasks ?? new List<TaskItem>();

                // If not forTeam, filter tasks for current user
                if (!forTeam)
                {
                    tasks = tasks.Where(t => t.AssignedUserIds?.Contains(userId) == true).ToList();
                }

                var completedTasks = tasks.Where(t => t.Status == "completed").ToList();
                var inProgressTasks = tasks.Where(t => t.Status == "in-progress").ToList();
                var overdueTasks = tasks.Where(t => t.Status == "overdue").ToList();

                var previousDate = DateTime.UtcNow.AddDays(-7);
                var previousTasks = tasks.Where(t => t.CreatedAt <= previousDate).ToList();
                var previousCompleted = previousTasks.Count(t => t.Status == "completed");
                var previousInProgress = previousTasks.Count(t => t.Status == "in-progress");
                var previousOverdue = previousTasks.Count(t => t.Status == "overdue");

                var chartData = Enumerable.Range(0, 7)
                    .Select(i => DateTime.UtcNow.Date.AddDays(-i))
                    .Select(date => new ChartDataPoint
                    {
                        Date = date,
                        DateString = date.ToString("dd/MM"),
                        Completed = completedTasks.Count(t =>
                            t.CompletedDate?.Date == date.Date),
                        NewTasks = tasks.Count(t => t.CreatedAt.Date == date.Date)
                    })
                    .OrderBy(d => d.Date)
                    .ToList();

                var stats = new DashboardStats
                {
                    TotalTasks = tasks.Count(),
                    CompletedTasks = completedTasks.Count(),
                    InProgressTasks = inProgressTasks.Count(),
                    OverdueTasks = overdueTasks.Count(),
                    PreviousTotalTasks = previousTasks.Count(),
                    PreviousCompletedTasks = previousCompleted,
                    PreviousInProgressTasks = previousInProgress,
                    PreviousOverdueTasks = previousOverdue,
                    LineChartData = chartData
                };

                if (forTeam && !string.IsNullOrEmpty(teamId))
                {
                    var team = await _teamsService.GetTeamById(teamId);
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

                        stats.TopContributors = await GetTopContributors(team, tasks.ToList());
                    }
                }

                return Ok(stats);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting dashboard stats");
                return StatusCode(500, new { message = "An error occurred while getting dashboard stats" });
            }
        }

        private async Task<List<TopContributor>> GetTopContributors(Team team, List<TaskItem> teamTasks)
        {
            var contributors = new List<TopContributor>();

            foreach (var member in team.Members ?? Enumerable.Empty<TeamMember>())
            {
                var userTasks = teamTasks
                    .Where(t => t.AssignedUserIds?.Contains(member.Id) == true)
                    .ToList();

                var completedTasksCount = userTasks.Count(t => t.Status == "completed");
                var score = CalculateUserPerformanceScore(userTasks);

                var user = await _usersCollection.Find(u => u.Id == member.Id).FirstOrDefaultAsync();
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

        private void InvalidateTaskRelatedCaches(TaskItem? task)
        {
            if (task == null) return;

            // Clear user-specific caches
            if (task.AssignedUserIds != null)
            {
                foreach (var userId in task.AssignedUserIds)
                {
                    _cacheService.Remove($"user_tasks_{userId}");
                    _cacheService.Remove($"active_tasks_{userId}");
                }
            }

            // Clear team-specific caches
            if (!string.IsNullOrEmpty(task.TeamId))
            {
                _cacheService.Remove($"team_tasks_{task.TeamId}");
                _cacheService.Remove($"team_stats_{task.TeamId}");
            }

            // Clear global caches
            _cacheService.Remove("dashboard_stats");
            _cacheService.Remove("all_tasks");
        }

        [HttpGet("history")]
        public async Task<ActionResult<IEnumerable<TaskHistoryDto>>> GetTaskHistory()
        {
            try
            {
                _logger.LogInformation("Getting task history for current user");

                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized();
                }

                var cacheKey = $"task_history_{userId}";
                var tasks = await _cacheService.GetOrUpdateAsync(
                    cacheKey,
                    async () =>
                    {
                        var allTasks = await _tasksService.GetTasks();
                        return allTasks.Where(t =>
                                       (t.Status == "completed" || t.Status == "overdue") &&
                                       (t.AssignedUserIds != null && t.AssignedUserIds.Contains(userId)))
                                     .OrderByDescending(t => t.UpdatedAt)
                                     .ToList();
                    },
                    TimeSpan.FromMinutes(30)
                );

                return Ok(tasks);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving task history");
                return StatusCode(500, new { message = $"Internal server error: {ex.Message}" });
            }
        }
    }
}