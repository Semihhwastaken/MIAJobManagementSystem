using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Text.Json.Serialization;
using System.Collections.Generic;
<<<<<<< HEAD
=======
using MongoDB.Bson.Serialization;
>>>>>>> newdb1

namespace JobTrackingAPI.Models
{
    public class SubTask
    {
        [BsonElement("id")]
        [JsonPropertyName("id")]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [BsonElement("title")]
        [JsonPropertyName("title")]
        public string Title { get; set; } = string.Empty;

        [BsonElement("completed")]
        [JsonPropertyName("completed")]
        public bool Completed { get; set; }
<<<<<<< HEAD
=======
        
        [BsonElement("completedDate")]
        [JsonPropertyName("completedDate")]
        public DateTime? CompletedDate { get; set; }
        
        [BsonElement("assignedUserId")]
        [JsonPropertyName("assignedUserId")]
        public string? AssignedUserId { get; set; }
>>>>>>> newdb1
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
<<<<<<< HEAD

=======
>>>>>>> newdb1
    public class TaskItem
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
<<<<<<< HEAD
        public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

        [BsonElement("title")]
        [JsonPropertyName("title")]
        public string Title { get; set; } = string.Empty;

        [BsonElement("description")]
        [JsonPropertyName("description")]
        public string Description { get; set; } = string.Empty;

        [BsonElement("status")]
        [JsonPropertyName("status")]
        public string Status { get; set; } = "todo";

        [BsonElement("dueDate")]
        [JsonPropertyName("dueDate")]
        public DateTime DueDate { get; set; }

        [BsonElement("priority")]
        [JsonPropertyName("priority")]
        public string Priority { get; set; } = "medium";

        [BsonElement("createdAt")]
        [JsonPropertyName("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("updatedAt")]
        [JsonPropertyName("updatedAt")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

=======
        public string Id { get; set; } = string.Empty;
    
        [BsonElement("title")]
        [JsonPropertyName("title")]
        public string Title { get; set; } = string.Empty;
    
        [BsonElement("description")]
        [JsonPropertyName("description")]
        public string Description { get; set; } = string.Empty;
    
        [BsonElement("status")]
        [JsonPropertyName("status")]
        public string Status { get; set; } = string.Empty;
    
        [BsonElement("priority")]
        [JsonPropertyName("priority")]
        public string Priority { get; set; } = string.Empty;
    
>>>>>>> newdb1
        [BsonElement("category")]
        [JsonPropertyName("category")]
        public string Category { get; set; } = "Personal";

<<<<<<< HEAD
        [BsonElement("subTasks")]
        [JsonPropertyName("subTasks")]
        public List<SubTask> SubTasks { get; set; } = new List<SubTask>();
=======
        [BsonElement("isLocked")]
        [JsonPropertyName("isLocked")]
        public bool IsLocked { get; set; } = false;
>>>>>>> newdb1

        [BsonElement("assignedUsers")]
        [JsonPropertyName("assignedUsers")]
        public List<AssignedUser> AssignedUsers { get; set; } = new List<AssignedUser>();
<<<<<<< HEAD
=======
        
        [BsonElement("assignedUserIds")]
        [JsonPropertyName("assignedUserIds")]
        public List<string> AssignedUserIds { get; set; } = new List<string>();
    
        [BsonElement("dueDate")]
        [JsonPropertyName("dueDate")]
        public DateTime DueDate { get; set; }
    
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
        public List<SubTask> SubTasks { get; set; } = new List<SubTask>();
    
        [BsonElement("attachments")]
        [JsonPropertyName("attachments")]
        public List<TaskAttachment> Attachments { get; set; } = new List<TaskAttachment>();
    
        [BsonElement("comments")]
        [JsonPropertyName("comments")]
        public List<Comment> Comments { get; set; } = new List<Comment>();
    
        [BsonElement("teamId")]
        [JsonPropertyName("teamId")]
        public string TeamId { get; set; } = string.Empty;
>>>>>>> newdb1

        [BsonElement("dependencies")]
        [JsonPropertyName("dependencies")]
        public List<string> Dependencies { get; set; } = new List<string>();

<<<<<<< HEAD
        [BsonElement("attachments")]
        [JsonPropertyName("attachments")]
        public List<TaskAttachment> Attachments { get; set; } = new List<TaskAttachment>();
=======
        [BsonElement("completedDate")]
        [JsonPropertyName("completedDate")]
        public DateTime? CompletedDate { get; set; }

        [BsonElement("assignedJobs")]
        public List<string> AssignedJobs { get; set; } = new List<string>();

        [BsonElement("history")]
        public List<TaskHistory> History { get; set; } = new List<TaskHistory>();
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
>>>>>>> newdb1
    }
}
