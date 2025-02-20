using System;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace JobTrackingAPI.Models
{
    public class Job
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; } = null;
        
        [BsonElement("title")]
        public string Title { get; set; }
        
        [BsonElement("description")]
        public string Description { get; set; }
        
        [BsonElement("createdDate")]
        public DateTime CreatedDate { get; set; }
        
        [BsonElement("dueDate")]
        public DateTime DueDate { get; set; }
        
        [BsonElement("status")]
        public JobStatus Status { get; set; }
        
        [BsonElement("assignedToUserId")]
        public string AssignedToUserId { get; set; }
        
        [BsonElement("priority")]
        public JobPriority Priority { get; set; }

        public Job(string title, string description, JobStatus status, JobPriority priority, DateTime dueDate, string assignedToUserId)
        {
            Title = title;
            Description = description;
            Status = status;
            Priority = priority;
            DueDate = dueDate;
            AssignedToUserId = assignedToUserId;
        }
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
