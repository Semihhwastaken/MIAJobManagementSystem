using System.Collections.Generic;
using System.Threading.Tasks;
using JobTrackingAPI.Models;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using JobTrackingAPI.Settings;

namespace JobTrackingAPI.Services
{
    public class JobService
    {
        private readonly IMongoCollection<Job> _jobs;

        public JobService(IOptions<MongoDbSettings> settings)
        {
            var client = new MongoClient(settings.Value.ConnectionString);
            var database = client.GetDatabase(settings.Value.DatabaseName);
            _jobs = database.GetCollection<Job>(settings.Value.JobsCollectionName);
        }

        public async Task<List<Job>> GetAllAsync()
        {
            return await _jobs.Find(_ => true).ToListAsync();
        }

        public async Task<Job> GetByIdAsync(string id)
        {
            return await _jobs.Find(j => j.Id == id).FirstOrDefaultAsync();
        }

        public async Task<Job> CreateAsync(Job job)
        {
            await _jobs.InsertOneAsync(job);
            return job;
        }

        public async Task UpdateAsync(string id, Job job)
        {
            await _jobs.ReplaceOneAsync(j => j.Id == id, job);
        }

        public async Task DeleteAsync(string id)
        {
            await _jobs.DeleteOneAsync(j => j.Id == id);
        }

        public async Task<List<Job>> GetJobsByUserIdAsync(string userId)
        {
            return await _jobs.Find(j => j.AssignedToUserId == userId).ToListAsync();
        }
    }
}
