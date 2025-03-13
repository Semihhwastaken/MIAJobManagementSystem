using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Text.Json.Serialization;
using System.Collections.Generic;
using MongoDB.Bson.Serialization;

namespace JobTrackingAPI.Models
{
    public class SubTask
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; }

        [BsonElement("title")]
        [JsonPropertyName("title")]
        [BsonRequired]
        public string Title { get; set; }

        [BsonElement("completed")]
        [JsonPropertyName("completed")]
        public bool Completed { get; set; }

        [BsonElement("completedDate")]
        [JsonPropertyName("completedDate")]
        public DateTime? CompletedDate { get; set; }

        [BsonElement("assignedUserId")]
        [JsonPropertyName("assignedUserId")]
        public string? AssignedUserId { get; set; }

        public SubTask()
        {
            Id = ObjectId.GenerateNewId().ToString();
            Title = string.Empty;
            Completed = false;
            CompletedDate = null;
            AssignedUserId = null;
        }
    }

    public class TaskAttachment
    {
        [BsonElement("id")]
        [JsonPropertyName("id")]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [BsonElement("fileName")]
        [JsonPropertyName("fileName")]
        public string FileName { get; set; } = string.Empty;

        [BsonElement("fileUrl")]
        [JsonPropertyName("fileUrl")]
        public string FileUrl { get; set; } = string.Empty;

        [BsonElement("fileType")]
        [JsonPropertyName("fileType")]
        public string FileType { get; set; } = string.Empty;

        [BsonElement("uploadDate")]
        [JsonPropertyName("uploadDate")]
        public DateTime UploadDate { get; set; } = DateTime.UtcNow;
    }

    public class AssignedUser
    {
        [BsonElement("id")]
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [BsonElement("username")]
        [JsonPropertyName("username")]
        public string Username { get; set; } = string.Empty;

        [BsonElement("email")]
        [JsonPropertyName("email")]
        public string Email { get; set; } = string.Empty;

        [BsonElement("fullName")]
        [JsonPropertyName("fullName")]
        public string? FullName { get; set; }

        [BsonElement("department")]
        [JsonPropertyName("department")]
        public string? Department { get; set; }

        [BsonElement("title")]
        [JsonPropertyName("title")]
        public string? Title { get; set; }

        [BsonElement("position")]
        [JsonPropertyName("position")]
        public string? Position { get; set; }

        [BsonElement("profileImage")]
        [JsonPropertyName("profileImage")]
        public string? ProfileImage { get; set; }
    }
    public class TaskItem
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = ObjectId.GenerateNewId().ToString();
    
        [BsonElement("title")]
        [JsonPropertyName("title")]
        public string Title { get; set; } = null!;
    
        [BsonElement("description")]
        [JsonPropertyName("description")]
        public string? Description { get; set; }
    
        [BsonElement("status")]
        [JsonPropertyName("status")]
        public string Status { get; set; } = "pending";
    
        [BsonElement("priority")]
        [JsonPropertyName("priority")]
        public string Priority { get; set; } = "medium";
    
        [BsonElement("category")]
        [JsonPropertyName("category")]
        public string Category { get; set; } = "Personal";

        [BsonElement("isLocked")]
        [JsonPropertyName("isLocked")]
        public bool IsLocked { get; set; } = false;

        [BsonElement("assignedUsers")]
        [JsonPropertyName("assignedUsers")]
        public List<AssignedUser> AssignedUsers { get; set; } = new List<AssignedUser>();
        
        [BsonElement("assignedUserIds")]
        [JsonPropertyName("assignedUserIds")]
        public List<string> AssignedUserIds { get; set; } = new List<string>();
    
        [BsonElement("dueDate")]
        [JsonPropertyName("dueDate")]
        public DateTime? DueDate { get; set; }
    
        [BsonElement("createdAt")]
        [JsonPropertyName("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
        [BsonElement("createdBy")]
        [JsonPropertyName("createdBy")]
        public CreatedByUser CreatedBy { get; set; } = new CreatedByUser();
        
        [BsonElement("updatedAt")]
        [JsonPropertyName("updatedAt")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
        [BsonElement("subTasks")]
        [JsonPropertyName("subTasks")]
        public List<SubTask>? SubTasks { get; set; } = new List<SubTask>();
    
        [BsonElement("attachments")]
        [JsonPropertyName("attachments")]
        public List<TaskAttachment>? Attachments { get; set; } = new List<TaskAttachment>();
    
        [BsonElement("comments")]
        [JsonPropertyName("comments")]
        public List<Comment> Comments { get; set; } = new List<Comment>();
    
        [BsonElement("teamId")]
        [JsonPropertyName("teamId")]
        public string? TeamId { get; set; }

        [BsonElement("dependencies")]
        [JsonPropertyName("dependencies")]
        public List<string>? Dependencies { get; set; } = new List<string>();

        [BsonElement("completedDate")]
        [JsonPropertyName("completedDate")]
        public DateTime? CompletedDate { get; set; }

        [BsonElement("assignedJobs")]
        public List<string> AssignedJobs { get; set; } = new List<string>();

        [BsonElement("history")]
        public List<TaskHistory> History { get; set; } = new List<TaskHistory>();
        
        // Bu alanlar veritabanında saklanmaz, API yanıtları için kullanılır
        [BsonIgnore]
        [JsonPropertyName("isAssignedToCurrentUser")]
        public bool IsAssignedToCurrentUser { get; set; }
        
        [BsonIgnore]
        [JsonPropertyName("hasManagePermission")]
        public bool HasManagePermission { get; set; }
    }
    
    public class CreatedByUser
    {
        [BsonElement("id")]
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;
        
        [BsonElement("username")]
        [JsonPropertyName("username")]
        public string Username { get; set; } = string.Empty;
        
        [BsonElement("fullName")]
        [JsonPropertyName("fullName")]
        public string FullName { get; set; } = string.Empty;
        
        [BsonElement("profileImage")]
        [JsonPropertyName("profileImage")]
        public string? ProfileImage { get; set; }
    }
}
