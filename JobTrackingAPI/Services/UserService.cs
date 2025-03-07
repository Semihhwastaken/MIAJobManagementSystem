using System.Collections.Generic;
using System.Threading.Tasks;
using JobTrackingAPI.Models;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using JobTrackingAPI.Settings;
<<<<<<< HEAD
=======
using System.Linq;
>>>>>>> 954951baa56d11e009937a68c5dc1b9badeb4754

namespace JobTrackingAPI.Services
{
    public class UserService : IUserService
    {
        private readonly IMongoCollection<User> _users;

        public UserService(IOptions<MongoDbSettings> settings)
        {
            var client = new MongoClient(settings.Value.ConnectionString);
            var database = client.GetDatabase(settings.Value.DatabaseName);
            _users = database.GetCollection<User>(settings.Value.UsersCollectionName);
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

<<<<<<< HEAD
=======
        public async Task<bool> UpdateUser(string id, UpdateDefinition<User> update)
        {
            var result = await _users.UpdateOneAsync(u => u.Id == id, update);
            return result.ModifiedCount > 0;
        }

>>>>>>> 954951baa56d11e009937a68c5dc1b9badeb4754
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
<<<<<<< HEAD
=======

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
            var update = Builders<User>.Update.AddToSet(u => u.OwnerTeams, teamId);
            await _users.UpdateOneAsync(u => u.Id == userId, update);
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
>>>>>>> 954951baa56d11e009937a68c5dc1b9badeb4754
    }
}
