using Microsoft.Extensions.Diagnostics.HealthChecks;
using MongoDB.Driver;

namespace NotificationAPI.HealthChecks
{
    public class MongoDbHealthCheck : IHealthCheck
    {
        private readonly IMongoClient _mongoClient;

        public MongoDbHealthCheck(IMongoClient mongoClient)
        {
            _mongoClient = mongoClient;
        }

        public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
        {
            try
            {
                await _mongoClient.GetDatabase("admin").RunCommandAsync<dynamic>(
                    new MongoDB.Bson.BsonDocument("ping", 1), 
                    cancellationToken: cancellationToken);
                    
                return HealthCheckResult.Healthy("MongoDB bağlantısı sağlıklı");
            }
            catch (Exception ex)
            {
                return HealthCheckResult.Unhealthy("MongoDB bağlantısı başarısız", ex);
            }
        }
    }
}