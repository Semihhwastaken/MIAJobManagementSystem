using JobTrackingAPI.Models;
using System.Threading.Tasks;

namespace JobTrackingAPI.Services
{
    public interface IActivityService
    {
        Task LogUserActivity(string userId, string description);
        Task LogTaskActivity(string userId, string taskId, string description);
        Task LogTeamActivity(string userId, string teamId, string description);
        Task LogLoginActivity(string userId);
        Task LogSystemActivity(string description);
    }
}
