using MongoDB.Driver;
using MongoDB.Bson;
using Microsoft.Extensions.Caching.Memory;
using System.Threading;
using System.Threading.Tasks;
using System;
using Microsoft.Extensions.Options;
using JobTrackingAPI.Settings;

namespace JobTrackingAPI.Services
{
    public interface ISystemMonitoringService
    {
        Task<long> GetDatabaseSize();
        Task<double> GetCacheHitRate();
        Task<int> GetTotalApiRequests();
        Task<double> GetErrorRate();
    }

    public class SystemMonitoringService : ISystemMonitoringService
    {
        private readonly IMongoClient _mongoClient;
        private readonly string _databaseName;
        private readonly IMemoryCache _cache;
        private static int _totalRequests;
        private static int _totalErrors;

        public SystemMonitoringService(
            IMongoClient mongoClient,
            IOptions<MongoDbSettings> settings,
            IMemoryCache cache)
        {
            _mongoClient = mongoClient;
            _databaseName = settings.Value.DatabaseName;
            _cache = cache;
        }

        public async Task<long> GetDatabaseSize()
        {
            var database = _mongoClient.GetDatabase(_databaseName);
            var stats = await database.RunCommandAsync<dynamic>(new BsonDocument("dbStats", 1));
            return stats.dataSize;
        }

        public Task<double> GetCacheHitRate()
        {
            var hitRate = 0.0;
            if (_cache is MemoryCache memCache)
            {
                var stats = memCache.GetCurrentStatistics();
                if (stats?.TotalHits != null && stats?.TotalMisses != null)
                {
                    hitRate = stats.TotalHits / (double)(stats.TotalMisses + stats.TotalHits) * 100;
                }
            }
            return Task.FromResult(hitRate);
        }

        public Task<int> GetTotalApiRequests()
        {
            return Task.FromResult(_totalRequests);
        }

        public Task<double> GetErrorRate()
        {
            return Task.FromResult(_totalRequests > 0 ? (_totalErrors / (double)_totalRequests) * 100 : 0);
        }

        public static void IncrementRequestCount()
        {
            Interlocked.Increment(ref _totalRequests);
        }

        public static void IncrementErrorCount()
        {
            Interlocked.Increment(ref _totalErrors);
        }
    }
}
