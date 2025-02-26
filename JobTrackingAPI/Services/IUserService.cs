using JobTrackingAPI.Models;

namespace JobTrackingAPI.Services
{
    public interface IUserService
    {
        Task<User> GetUserById(string id);
        Task<IEnumerable<User>> GetAllUsers();
        Task<User> UpdateUser(string id, User user);
        Task<bool> DeleteUser(string id);
        Task<User> GetUserByEmail(string email);
        Task<bool> UpdateUserStatus(string userId, string status);
        Task<bool> UpdateUserProfileImage(string userId, string imageUrl);
    }
} 