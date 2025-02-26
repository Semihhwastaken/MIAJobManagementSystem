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
            task.StartDate = DateTime.UtcNow;
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
    }
}