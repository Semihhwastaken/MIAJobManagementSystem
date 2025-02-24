using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Text.Json.Serialization;
using System.Collections.Generic;

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

        [BsonElement("category")]
        [JsonPropertyName("category")]
        public string Category { get; set; } = "Personal";

        [BsonElement("subTasks")]
        [JsonPropertyName("subTasks")]
        public List<SubTask> SubTasks { get; set; } = new List<SubTask>();

        [BsonElement("assignedUsers")]
        [JsonPropertyName("assignedUsers")]
        public List<AssignedUser> AssignedUsers { get; set; } = new List<AssignedUser>();

        [BsonElement("dependencies")]
        [JsonPropertyName("dependencies")]
        public List<string> Dependencies { get; set; } = new List<string>();

        [BsonElement("attachments")]
        [JsonPropertyName("attachments")]
        public List<TaskAttachment> Attachments { get; set; } = new List<TaskAttachment>();
    }
}
