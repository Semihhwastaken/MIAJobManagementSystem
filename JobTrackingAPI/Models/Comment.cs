using System;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.ComponentModel.DataAnnotations;

namespace JobTrackingAPI.Models
{
    public class Comment
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = string.Empty;

        [BsonElement("taskId")]
        [Required]
        public string TaskId { get; set; } = string.Empty;

        [BsonElement("userId")]
        [Required]
        public string UserId { get; set; } = string.Empty;

        [BsonElement("content")]
        [Required]
        public string Content { get; set; } = string.Empty;

        [BsonElement("createdDate")]
        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

        [BsonElement("mentions")]
        public List<string> Mentions { get; set; } = new List<string>();

        [BsonElement("attachments")]
        public List<Attachment> Attachments { get; set; } = new List<Attachment>();

        // Add a parameterless constructor for MongoDB serialization
        public Comment()
        {
            // Let MongoDB generate the Id automatically
            CreatedDate = DateTime.UtcNow;
            Mentions = new List<string>();
            Attachments = new List<Attachment>();
        }

        public Comment(string taskId, string userId, string content)
        {
            // Let MongoDB generate the Id automatically
            TaskId = taskId;
            UserId = userId;
            Content = content;
            CreatedDate = DateTime.UtcNow;
            Mentions = new List<string>();
            Attachments = new List<Attachment>();
        }
    }

    public class Attachment
    {
        [BsonElement("fileName")]
        [Required]
        public string FileName { get; set; } = string.Empty;

        [BsonElement("fileUrl")]
        [Required]
        public string FileUrl { get; set; } = string.Empty;

        [BsonElement("fileType")]
        [Required]
        public string FileType { get; set; } = string.Empty;

        [BsonElement("fileSize")]
        public long FileSize { get; set; }
    }
}
