using System;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace JobTrackingAPI.Models
{
    public class Comment
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; }

        [BsonElement("jobId")]
        public string JobId { get; set; }

        [BsonElement("userId")]
        public string UserId { get; set; }

        [BsonElement("content")]
        public string Content { get; set; }

        [BsonElement("createdDate")]
        public DateTime CreatedDate { get; set; }

        [BsonElement("mentions")]
        public List<string> Mentions { get; set; } = new List<string>();

        [BsonElement("attachments")]
        public List<Attachment> Attachments { get; set; } = new List<Attachment>();

        public Comment(string jobId, string userId, string content)
        {
            Id = ObjectId.GenerateNewId().ToString();
            JobId = jobId;
            UserId = userId;
            Content = content;
            CreatedDate = DateTime.UtcNow;
        }
    }

    public class Attachment
    {
        [BsonElement("fileName")]
        public string FileName { get; set; }

        [BsonElement("fileUrl")]
        public string FileUrl { get; set; }

        [BsonElement("fileType")]
        public string FileType { get; set; }

        [BsonElement("fileSize")]
        public long FileSize { get; set; }
    }
}
