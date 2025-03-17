using System;
using System.Collections.Generic;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace JobTrackingAPI.Models
{
    [BsonIgnoreExtraElements]
    public class AdminDashboardStats
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

        [BsonElement("totalUsers")]
        public int TotalUsers { get; set; }

        [BsonElement("totalTeams")]
        public int TotalTeams { get; set; }

        [BsonElement("totalTasks")]
        public int TotalTasks { get; set; }

        [BsonElement("activeUsers")]
        public int ActiveUsers { get; set; }

        [BsonElement("systemStats")]
        public required SystemStats SystemStats { get; set; }

        [BsonElement("recentActivities")]
        public List<Activity> RecentActivities { get; set; } = new();

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    [BsonIgnoreExtraElements]
    public class SystemStats
    {
        [BsonElement("databaseSize")]
        public long DatabaseSize { get; set; }

        [BsonElement("cacheHitRate")]
        public double CacheHitRate { get; set; }

        [BsonElement("apiRequests")]
        public int ApiRequests { get; set; }

        [BsonElement("errorRate")]
        public double ErrorRate { get; set; }

        [BsonElement("timestamp")]
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }

    [BsonIgnoreExtraElements]
    public class Activity
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

        [BsonElement("type")]
        public required string Type { get; set; }

        [BsonElement("description")]
        public required string Description { get; set; }

        [BsonElement("userId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public required string UserId { get; set; }

        [BsonElement("timestamp")]
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        [BsonElement("metadata")]
        public Dictionary<string, object> Metadata { get; set; } = new();
    }
}
