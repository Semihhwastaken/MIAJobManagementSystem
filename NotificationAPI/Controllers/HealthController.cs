using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace NotificationAPI.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class HealthController : ControllerBase
    {
        private readonly ILogger<HealthController> _logger;

        public HealthController(ILogger<HealthController> logger)
        {
            _logger = logger;
        }

        [HttpGet]
        public IActionResult Check()
        {
            try
            {
                // Burada gerekirse MongoDB ve RabbitMQ bağlantılarını kontrol edebiliriz
                return Ok(new
                {
                    status = "healthy",
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Health check failed");
                return StatusCode(500, new
                {
                    status = "unhealthy",
                    error = ex.Message,
                    timestamp = DateTime.UtcNow
                });
            }
        }

        [HttpGet("health/mongo")]
        public async Task<IActionResult> CheckMongoDbConnection()
        {
            try
            {
                var client = new MongoClient("mongodb+srv://200315055:asker123@mia-ime.9gv81.mongodb.net/JobTrackingDb");
                var database = client.GetDatabase("JobTrackingDb");
                var collections = await database.ListCollectionNamesAsync();
                return Ok("MongoDB bağlantısı başarılı");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"MongoDB bağlantı hatası: {ex.Message}");
            }
        }

    }
}
