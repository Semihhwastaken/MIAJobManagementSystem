using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.ComponentModel.DataAnnotations;

namespace JobTrackingAPI.Models
{
    public enum FeedbackStatus
    {
        New = 0,
        Read = 1,
        Responded = 2,
        Archived = 3
    }

    public class Feedback
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = string.Empty;

        [Required]
        [BsonElement("userId")]
        public string UserId { get; set; } = string.Empty;

        [Required]
        [BsonElement("userName")]
        public string UserName { get; set; } = string.Empty;

        [Required]
        [BsonElement("userRole")]
        public string UserRole { get; set; } = string.Empty;

        [Required]
        [BsonElement("content")]
        public string Content { get; set; } = string.Empty;

        [Required]
        [BsonElement("rating")]
        public int Rating { get; set; }

        [BsonElement("isPublic")]
        public bool IsPublic { get; set; } = false;

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("userAvatar")]
        public string? UserAvatar { get; set; }

        [BsonElement("status")]
        public FeedbackStatus Status { get; set; } = FeedbackStatus.New;

        [BsonElement("adminResponse")]
        public string? AdminResponse { get; set; }

        [BsonElement("respondedAt")]
        public DateTime? RespondedAt { get; set; }

        [BsonElement("lastUpdated")]
        public DateTime LastUpdated { get; set; } = DateTime.UtcNow;

        [BsonElement("isRead")]
        public bool IsRead { get; set; } = false;
    }
}
