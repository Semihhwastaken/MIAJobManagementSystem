using JobTrackingAPI.Models;

namespace JobTrackingAPI.Services
{
    public interface ITasksService
    {
        Task<TaskItem> CreateTask(TaskItem task);
        Task<TaskItem> GetTask(string id);
        Task<List<TaskItem>> GetTasks();
        Task<List<TaskItem>> GetTasksByUserId(string userId);
        Task<TaskItem> UpdateTask(string id, TaskItem task);
        Task DeleteTask(string id);
    }
}