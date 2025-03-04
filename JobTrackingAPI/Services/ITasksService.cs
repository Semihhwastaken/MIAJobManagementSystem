using System.Collections.Generic;
using System.Threading.Tasks;
using JobTrackingAPI.Models;

namespace JobTrackingAPI.Services
{
    public interface ITasksService
    {
        Task<TaskItem> CreateTask(TaskItem task);
        Task<TaskItem> GetTask(string id);
        Task<List<TaskItem>> GetTasks();
        Task<List<TaskItem>> GetTasksOptimized(string userId);
        Task<List<TaskItem>> GetTasksByUserId(string userId);
        Task<TaskItem> UpdateTask(string id, TaskItem task);
        Task DeleteTask(string id);
        Task FileUpload(string id, string fileUrl);
        Task DeleteTaskFiles(TaskItem task);
        Task<List<TaskHistoryDto>> GetUserTaskHistory(string userId);
        string GetFilePath(string fileName);
        Task<List<TaskItem>> GetTasksAssignedToUserAsync(string userId);
    }
}