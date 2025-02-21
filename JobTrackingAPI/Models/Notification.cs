using System;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace JobTrackingAPI.Models
{
    public class Notification
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; }

        [BsonElement("userId")]
        public string UserId { get; set; }

        [BsonElement("title")]
        public string Title { get; set; }

        [BsonElement("message")]
        public string Message { get; set; }

        [BsonElement("type")]
        public NotificationType Type { get; set; }

        [BsonElement("relatedJobId")]
        public string RelatedJobId { get; set; }

        [BsonElement("isRead")]
        public bool IsRead { get; set; }

        [BsonElement("createdDate")]
        public DateTime CreatedDate { get; set; }

        public Notification(string userId, string title, string message, NotificationType type, string? relatedJobId = null)
        {
            Id = ObjectId.GenerateNewId().ToString();
            UserId = userId;
            Title = title;
            Message = message;
            Type = type;
            RelatedJobId = relatedJobId;
            IsRead = false;
            CreatedDate = DateTime.UtcNow;
        }
    }

    public enum NotificationType
    {
        Comment,
        Mention,
        TaskAssigned,
        TaskUpdated,
        TaskCompleted,
        Reminder
    }
}
