using System;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace JobTrackingAPI.Models
{
    public class Job
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; }
        
        [BsonElement("title")]
        public string Title { get; set; }
        
        [BsonElement("description")]
        public string Description { get; set; }
        
        [BsonElement("createdDate")]
        public DateTime CreatedDate { get; set; }
        
        [BsonElement("dueDate")]
        public DateTime? DueDate { get; set; }
        
        [BsonElement("status")]
        public JobStatus Status { get; set; }
        
        [BsonElement("assignedToUserId")]
        public string AssignedToUserId { get; set; }
        
        [BsonElement("priority")]
        public JobPriority Priority { get; set; }
    }

    public enum JobStatus
    {
        New,
        InProgress,
        OnHold,
        Completed,
        Cancelled
    }

    public enum JobPriority
    {
        Low,
        Medium,
        High,
        Critical
    }
}
