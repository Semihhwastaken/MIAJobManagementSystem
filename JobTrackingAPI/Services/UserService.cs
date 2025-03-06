using System.Collections.Generic;
using System.Threading.Tasks;
using JobTrackingAPI.Models;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using JobTrackingAPI.Settings;

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
    }
}
