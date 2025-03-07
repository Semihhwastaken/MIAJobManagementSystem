using JobTrackingAPI.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

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
        Task<List<TaskHistoryDto>> GetUserTaskHistory(string userId);
        Task FileUpload(string taskId, string fileUrl);
        
        // AssignedUsers yerine AssignedUserIds kullanan yeni metotlar
        Task<IEnumerable<TaskItem>> GetTasksByAssignedUserIdAsync(string userId);
        Task<IEnumerable<TaskItem>> GetTasksByDepartmentAsync(string department);
        Task<IEnumerable<TaskItem>> GetTasksByTeamsAsync(List<string> teamIds);
        Task<bool> AssignUserToTaskAsync(string taskId, string userId);
        Task<bool> RemoveUserFromTaskAsync(string taskId, string userId);
    }
}