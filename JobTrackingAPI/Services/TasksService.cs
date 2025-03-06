using JobTrackingAPI.Models;
using JobTrackingAPI.Settings;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace JobTrackingAPI.Services
{
    public class TasksService : ITasksService
    {
        private readonly IMongoCollection<TaskItem> _tasks;
        private readonly string _uploadsFolder;
        private readonly CacheService _cacheService;

        public TasksService(IOptions<MongoDbSettings> settings, CacheService cacheService)
        {
            var client = new MongoClient(settings.Value.ConnectionString);
            var database = client.GetDatabase(settings.Value.DatabaseName);
            _tasks = database.GetCollection<TaskItem>("Tasks");
            _uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
            _cacheService = cacheService;
        }

        public async Task<TaskItem> CreateTask(TaskItem task)
        {
            task.CreatedAt = DateTime.UtcNow;
            task.UpdatedAt = DateTime.UtcNow;
            await _tasks.InsertOneAsync(task);
            _cacheService.InvalidateTaskRelatedCaches(task);
            return task;
        }

        public async Task<TaskItem> GetTask(string id)
        {
            return await _tasks.Find(t => t.Id == id).FirstOrDefaultAsync();
        }

        public async Task<List<TaskItem>> GetTasks()
        {
            return await _tasks.Find(_ => true).ToListAsync();
        }

        public async Task<List<TaskItem>> GetTasksByUserId(string userId)
        {
            return await _tasks.Find(t => t.AssignedUsers != null && t.AssignedUsers.Any(u => u.Id == userId)).ToListAsync();
        }

        public async Task<TaskItem> UpdateTask(string id, TaskItem task)
        {
            task.UpdatedAt = DateTime.UtcNow;
            
            // Check if the status is changing to completed or overdue
            var existingTask = await GetTask(id);
            if (existingTask != null && 
                (existingTask.Status != "completed" && task.Status == "completed" ||
                 existingTask.Status != "overdue" && task.Status == "overdue"))
            {
                // Delete associated files
                await DeleteTaskFiles(existingTask);
            }
            
            await _tasks.ReplaceOneAsync(t => t.Id == id, task);
            _cacheService.InvalidateTaskRelatedCaches(task);
            return task;
        }

        public async Task DeleteTask(string id)
        {
            var task = await GetTask(id);
            if (task != null)
            {
                // Delete associated files before deleting the task
                await DeleteTaskFiles(task);
                await _tasks.DeleteOneAsync(t => t.Id == id);
                _cacheService.InvalidateTaskRelatedCaches(task);
            }
        }

        public async Task FileUpload(string id, string fileUrl)
        {
            var filter = Builders<TaskItem>.Filter.Eq(t => t.Id, id);
            var update = Builders<TaskItem>.Update
                .Push(t => t.Attachments, new TaskAttachment
                {
                    Id = Guid.NewGuid().ToString(),
                    FileUrl = fileUrl,
                    FileName = Path.GetFileName(fileUrl),
                    FileType = Path.GetExtension(fileUrl),
                    UploadDate = DateTime.UtcNow
                })
                .Set(t => t.UpdatedAt, DateTime.UtcNow);

            await _tasks.UpdateOneAsync(filter, update);
        }

        // New method to delete all files associated with a task
        public async Task DeleteTaskFiles(TaskItem task)
        {
            if (task.Attachments == null || task.Attachments.Count == 0)
                return;

            foreach (var attachment in task.Attachments)
            {
                string fileName = Path.GetFileName(attachment.FileUrl);
                string filePath = Path.Combine(_uploadsFolder, fileName);
                
                if (File.Exists(filePath))
                {
                    try
                    {
                        File.Delete(filePath);
                    }
                    catch (Exception ex)
                    {
                        // Log the error but continue with other files
                        Console.WriteLine($"Error deleting file {filePath}: {ex.Message}");
                    }
                }
            }
            
            // Optionally clear the attachments list in the database
            var filter = Builders<TaskItem>.Filter.Eq(t => t.Id, task.Id);
            var update = Builders<TaskItem>.Update.Set(t => t.Attachments, new List<TaskAttachment>());
            await _tasks.UpdateOneAsync(filter, update);
        }

        public async Task<List<TaskHistoryDto>> GetUserTaskHistory(string userId)
        {
            var tasks = await _tasks.Find(t => t.AssignedUsers != null && t.AssignedUsers.Any(u => u.Id == userId) &&
                                      (t.Status == "completed" || DateTime.UtcNow > t.DueDate))
                            .ToListAsync();

            return tasks.Select(t => new TaskHistoryDto
            {
                Id = t.Id,
                Title = t.Title,
                Description = t.Description,
                Status = DateTime.UtcNow > t.DueDate ? "overdue" : "completed",
                Priority = t.Priority,
                Category = t.Category,
                DueDate = t.DueDate,
                AssignedUsers = t.AssignedUsers?.Select(u => new UserDto { Id = u.Id, FullName = u.FullName ?? string.Empty }).ToList() ?? new List<UserDto>()
            }).ToList();
        }

        public string GetFilePath(string fileName)
        {
            return Path.Combine(_uploadsFolder, fileName);
        }
    }
}