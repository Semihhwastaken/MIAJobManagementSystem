using JobTrackingAPI.Models;
using JobTrackingAPI.Settings;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace JobTrackingAPI.Services
{
    public class TasksService : ITasksService
    {
        private readonly IMongoCollection<TaskItem> _tasks;

        public TasksService(IOptions<MongoDbSettings> settings)
        {
            var client = new MongoClient(settings.Value.ConnectionString);
            var database = client.GetDatabase(settings.Value.DatabaseName);
            _tasks = database.GetCollection<TaskItem>("Tasks");
        }

        public async Task<TaskItem> CreateTask(TaskItem task)
        {
            task.CreatedAt = DateTime.UtcNow;
            task.UpdatedAt = DateTime.UtcNow;
            await _tasks.InsertOneAsync(task);
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
            return await _tasks.Find(t => t.AssignedUsers.Any(u => u.Id == userId)).ToListAsync();
        }

        public async Task<TaskItem> UpdateTask(string id, TaskItem task)
        {
            task.UpdatedAt = DateTime.UtcNow;
            await _tasks.ReplaceOneAsync(t => t.Id == id, task);
            return task;
        }

        public async Task DeleteTask(string id)
        {
            await _tasks.DeleteOneAsync(t => t.Id == id);
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

        public async Task<List<TaskHistoryDto>> GetUserTaskHistory(string userId)
        {
            var tasks = await _tasks.Find(t => t.AssignedUsers.Any(u => u.Id == userId) &&
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
                AssignedUsers = t.AssignedUsers.Select(u => new UserDto { Id = u.Id, FullName = u.FullName }).ToList()
            }).ToList();
        }

        public string GetFilePath(string fileName)
        {
            return Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", fileName);
        }
    }
}