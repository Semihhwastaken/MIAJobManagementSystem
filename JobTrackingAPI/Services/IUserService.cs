using JobTrackingAPI.Models;
using MongoDB.Driver;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace JobTrackingAPI.Services
{
    public interface IUserService
    {
        Task<User> GetUserById(string id);
        Task<IEnumerable<User>> GetAllUsers();
        Task<User> UpdateUser(string id, User user);
        Task<bool> UpdateUser(string id, UpdateDefinition<User> update);
        Task<bool> DeleteUser(string id);
        Task<User> GetUserByEmail(string email);
        Task<bool> UpdateUserStatus(string userId, string status);
        Task<bool> UpdateUserProfileImage(string userId, string imageUrl);
        Task AddTaskToHistory(string userId, string taskId);
        Task AddToAssignedJobs(string userId, string taskId);
        Task RemoveFromAssignedJobs(string userId, string taskId);

        // Yeni eklenen metodlar
        Task<List<User>> GetUsersByIds(List<string> userIds);
        Task AddOwnerTeam(string userId, string teamId);
        Task AddMemberTeam(string userId, string teamId);
        Task RemoveOwnerTeam(string userId, string teamId);
        Task RemoveMemberTeam(string userId, string teamId);
        Task UpdateUserSubscriptionAsync(string userId, string planType, string subscriptionId);
    }
}