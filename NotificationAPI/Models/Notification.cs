using System;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using NotificationAPI.Enums;

namespace NotificationAPI.Models
{
    public class Notification
    {
        public Notification()
        {
            CreatedDate = DateTime.UtcNow;
            IsRead = false;
        }
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        /// <summary>
        /// Bildirimin gönderileceği kullanıcı ID'si
        /// </summary>
        [BsonElement("userId")]
        public string UserId { get; set; } = null!;

        /// <summary>
        /// Bildirimin başlığı
        /// </summary>
        [BsonElement("title")]
        public string Title { get; set; } = null!;

        /// <summary>
        /// Bildirimin mesajı
        /// </summary>
        [BsonElement("message")]
        public string Message { get; set; } = null!;

        /// <summary>
        /// Bildirimin tipi
        /// </summary>
        [BsonElement("type")]
        public Enums.NotificationType Type { get; set; }

        /// <summary>
        /// İlgili iş kaydının ID'si
        /// </summary>
        [BsonElement("relatedJobId")]
        public string? RelatedJobId { get; set; }

        /// <summary>
        /// Bildirimin okunup okunmadığı
        /// </summary>
        [BsonElement("isRead")]
        public bool IsRead { get; set; }

        /// <summary>
        /// Bildirimin oluşturulma tarihi
        /// </summary>
        [BsonElement("createdDate")]
        public DateTime CreatedDate { get; set; }


        /// <summary>
        /// Yeni bir bildirim oluşturur
        /// </summary>
        /// <param name="userId">Bildirimin gönderileceği kullanıcı ID'si</param>
        /// <param name="title">Bildirimin başlığı</param>
        /// <param name="message">Bildirimin mesajı</param>
        /// <param name="type">Bildirimin tipi</param>
        /// <param name="relatedJobId">İlgili iş kaydının ID'si (opsiyonel)</param>
        public Notification(string userId, string title, string message, Enums.NotificationType type, string? relatedJobId)
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
}
