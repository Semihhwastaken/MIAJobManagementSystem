using System.Collections.Generic;
using System.Threading.Tasks;
using JobTrackingAPI.Models;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using JobTrackingAPI.Settings;
using System.Linq;
using System;
using Microsoft.Extensions.Logging;

namespace JobTrackingAPI.Services
{
    public class UserService : IUserService
    {
        private readonly IMongoCollection<User> _users;
        private readonly ILogger<UserService> _logger;

        public UserService(IOptions<MongoDbSettings> settings, ILogger<UserService> logger)
        {
            _logger = logger;
            var client = new MongoClient(settings.Value.ConnectionString);
            var database = client.GetDatabase(settings.Value.DatabaseName);
            _users = database.GetCollection<User>(settings.Value.UsersCollectionName);
            _logger = logger;
        }
        

        public async Task<User> GetUserById(string id)
        {
            return await _users.Find(u => u.Id == id).FirstOrDefaultAsync();
        }

        public async Task<IEnumerable<User>> GetAllUsers()
        {
            return await _users.Find(_ => true).ToListAsync();
        }

        public async Task<User> UpdateUser(string id, User user)
        {
            await _users.ReplaceOneAsync(u => u.Id == id, user);
            return user;
        }

        public async Task<bool> UpdateUser(string id, UpdateDefinition<User> update)
        {
            var result = await _users.UpdateOneAsync(u => u.Id == id, update);
            return result.ModifiedCount > 0;
        }

        public async Task<bool> DeleteUser(string id)
        {
            var result = await _users.DeleteOneAsync(u => u.Id == id);
            return result.DeletedCount > 0;
        }

        public async Task<User> GetUserByEmail(string email)
        {
            return await _users.Find(u => u.Email == email).FirstOrDefaultAsync();
        }

        public async Task<bool> UpdateUserStatus(string userId, string status)
        {
            var update = Builders<User>.Update.Set(u => u.UserStatus, status);
            var result = await _users.UpdateOneAsync(u => u.Id == userId, update);
            return result.ModifiedCount > 0;
        }

        public async Task<bool> UpdateUserProfileImage(string userId, string imageUrl)
        {
            var update = Builders<User>.Update.Set(u => u.ProfileImage, imageUrl);
            var result = await _users.UpdateOneAsync(u => u.Id == userId, update);
            return result.ModifiedCount > 0;
        }

        public async Task AddTaskToHistory(string userId, string taskId)
        {
            var update = Builders<User>.Update.AddToSet(u => u.TaskHistory, taskId);
            await _users.UpdateOneAsync(u => u.Id == userId, update);
        }

        public async Task AddToAssignedJobs(string userId, string taskId)
        {
            var update = Builders<User>.Update.AddToSet(u => u.AssignedJobs, taskId);
            await _users.UpdateOneAsync(u => u.Id == userId, update);
        }

        public async Task RemoveFromAssignedJobs(string userId, string taskId)
        {
            var update = Builders<User>.Update.Pull(u => u.AssignedJobs, taskId);
            await _users.UpdateOneAsync(u => u.Id == userId, update);
        }

        public async Task<List<User>> GetUsersByIds(List<string> userIds)
        {
            if (userIds == null || !userIds.Any())
            {
                return new List<User>();
            }

            var filter = Builders<User>.Filter.In(u => u.Id, userIds);
            return await _users.Find(filter).ToListAsync();
        }

        public async Task AddOwnerTeam(string userId, string teamId)
        {
            try
            {
                var filter = Builders<User>.Filter.Eq(u => u.Id, userId);
                var update = Builders<User>.Update.AddToSet(u => u.OwnerTeams, teamId);

                var result = await _users.UpdateOneAsync(filter, update);

                if (result.ModifiedCount == 0)
                {
                    _logger.LogWarning($"AddOwnerTeam failed for user {userId} and team {teamId}");
                    throw new Exception("Kullanıcı takım listesi güncellenemedi");
                }

                _logger.LogInformation($"Successfully added team {teamId} to user {userId}'s owner teams");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in AddOwnerTeam for user {userId} and team {teamId}");
                throw;
            }
        }

        public async Task AddMemberTeam(string userId, string teamId)
        {
            var update = Builders<User>.Update.AddToSet(u => u.MemberTeams, teamId);
            await _users.UpdateOneAsync(u => u.Id == userId, update);
        }

        public async Task RemoveOwnerTeam(string userId, string teamId)
        {
            var update = Builders<User>.Update.Pull(u => u.OwnerTeams, teamId);
            await _users.UpdateOneAsync(u => u.Id == userId, update);
        }

        public async Task RemoveMemberTeam(string userId, string teamId)
        {
            var update = Builders<User>.Update.Pull(u => u.MemberTeams, teamId);
            await _users.UpdateOneAsync(u => u.Id == userId, update);
        }

        public async Task<int> GetTotalUserCount()
        {
            try
            {
                return (int)await _users.CountDocumentsAsync(Builders<User>.Filter.Empty);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting total user count: {ex.Message}");
                return 0;
            }
        }

        public async Task<int> GetActiveUserCount()
        {
            try
            {
                // Son 15 dakika içinde aktif olan kullanıcıları say
                var fifteenMinutesAgo = DateTime.UtcNow.AddMinutes(-45);
                var filter = Builders<User>.Filter.And(
                    Builders<User>.Filter.Eq(u => u.IsOnline, true),
                    Builders<User>.Filter.Gt(u => u.LastLoginDate, fifteenMinutesAgo)
                );

                return (int)await _users.CountDocumentsAsync(filter);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting active user count");
                return 0;
            }
        }

        public async Task<List<User>> GetPaginatedUsers(int page, int pageSize)
        {
            try
            {
                return await _users.Find(Builders<User>.Filter.Empty)
                    .Skip((page - 1) * pageSize)
                    .Limit(pageSize)
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting paginated users: {ex.Message}");
                return new List<User>();
            }
        }

        public async Task<bool> UpdateUserOnlineStatus(string userId, bool isOnline)
        {
            try
            {
                var update = Builders<User>.Update
                    .Set(u => u.IsOnline, isOnline)
                    .Set(u => u.LastLoginDate, DateTime.UtcNow);

                var result = await _users.UpdateOneAsync(u => u.Id == userId, update);
                return result.ModifiedCount > 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating online status for user {userId}");
                return false;
            }
        }
         
        public async Task UpdateUserSubscriptionAsync(string userId, string planType, string subscriptionId)
        {
            try
            {
                var user = await _users.Find(u => u.Id == userId).FirstOrDefaultAsync();
                if (user == null)
                {
                    _logger.LogWarning("User not found with ID: {UserId}", userId);
                    return;
                }

                // Create update definition for subscription fields
                var update = Builders<User>.Update
                    .Set(u => u.SubscriptionPlan, planType)
                    .Set(u => u.SubscriptionId, subscriptionId)
                    .Set(u => u.SubscriptionDate, DateTime.UtcNow)
                    .Set(u => u.SubscriptionExpiryDate, planType.ToLower() switch
                    {
                        "pro" => DateTime.UtcNow.AddMonths(1),
                        "enterprise" => DateTime.UtcNow.AddYears(1),
                        _ => DateTime.UtcNow.AddMonths(1)
                    });

                var result = await _users.UpdateOneAsync(u => u.Id == userId, update);
                if (result.ModifiedCount > 0)
                {
                    _logger.LogInformation("Updated subscription for user {UserId} to plan {PlanType}", userId, planType);
                }
                else
                {
                    _logger.LogWarning("Failed to update subscription for user {UserId}", userId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating subscription for user {UserId}", userId);
                throw;
            }
        }
    }
}
