using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace JobTrackingAPI.Models
{
    public class PerformanceScore
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = string.Empty;

        [BsonRepresentation(BsonType.ObjectId)]
        public string UserId { get; set; } = string.Empty;

        public double Score { get; set; } = 100; // Base score starts at 100

        public int CompletedTasksCount { get; set; }

        public DateTime LastUpdated { get; set; }
        
        public List<ScoreHistory> History { get; set; } = new List<ScoreHistory>();
    }

    public class ScoreHistory
    {
        public DateTime Date { get; set; }
        public double ScoreChange { get; set; }
        public string Reason { get; set; } = string.Empty;
    }
}