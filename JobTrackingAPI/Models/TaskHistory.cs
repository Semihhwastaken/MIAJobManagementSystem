using System;
using System.Collections.Generic;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace JobTrackingAPI.Models
{
    public class TaskHistory
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = string.Empty;
        
        [BsonElement("taskId")]
        public string TaskId { get; set; } = string.Empty;
        
        [BsonElement("title")]
        public string Title { get; set; } = string.Empty;
        
        [BsonElement("description")]
        public string Description { get; set; } = string.Empty;
        
        [BsonElement("status")]
        public string Status { get; set; } = string.Empty;
        
        [BsonElement("priority")]
        public string Priority { get; set; } = string.Empty;
        
        [BsonElement("category")]
        public string Category { get; set; } = string.Empty;
        
        [BsonElement("dueDate")]
        public DateTime DueDate { get; set; }
        
        [BsonElement("assignedUsers")]
        public List<AssignedUser> AssignedUsers { get; set; } = new List<AssignedUser>();
        
        [BsonElement("changedOn")]
        public DateTime ChangedOn { get; set; } = DateTime.UtcNow;
        
        [BsonElement("changedBy")]
        public string ChangedBy { get; set; } = string.Empty;
        
        [BsonElement("changeType")]
        public string ChangeType { get; set; } = string.Empty;

        [BsonElement("oldValue")]
        public string OldValue { get; set; } = string.Empty;

        [BsonElement("newValue")]
        public string NewValue { get; set; } = string.Empty;

        [BsonElement("timestamp")]
        public DateTime Timestamp { get; set; }

        // Parameterless constructor for MongoDB serialization
        public TaskHistory()
        {
            AssignedUsers = new List<AssignedUser>();
        }

        // Constructor to create history from a TaskItem
        public TaskHistory(TaskItem task, string changedBy, string changeType)
        {
            TaskId = task.Id;
            Title = task.Title;
            Description = task.Description;
            Status = task.Status;
            Priority = task.Priority;
            Category = task.Category;
            DueDate = task.DueDate ?? DateTime.UtcNow; // Fix: Add null coalescing operator to handle nullable DateTime
            AssignedUsers = new List<AssignedUser>(task.AssignedUsers);
            ChangedOn = DateTime.UtcNow;
            ChangedBy = changedBy;
            ChangeType = changeType;
            Timestamp = DateTime.UtcNow; // Ensure Timestamp is set to a non-nullable value
        }
    }
}
