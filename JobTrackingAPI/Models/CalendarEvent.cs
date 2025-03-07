using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace JobTrackingAPI.Models
{
    public class CalendarEvent
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        [BsonElement("title")]
        [Required]
        public string Title { get; set; } = string.Empty;

        [BsonElement("description")]
        public string Description { get; set; } = string.Empty;

        [BsonElement("startDate")]
        [Required]
        public string StartDate { get; set; } = string.Empty;

        [BsonElement("endDate")]
        [Required]
        public string EndDate { get; set; } = string.Empty;

        [BsonElement("startTime")]
        [Required]
        public string StartTime { get; set; } = string.Empty;

        [BsonElement("endTime")]
        [Required]
        public string EndTime { get; set; } = string.Empty;

        [BsonElement("priority")]
        [Required]
        [RegularExpression("^(High|Medium|Low)$", ErrorMessage = "Priority must be High, Medium, or Low")]
        public string Priority { get; set; } = "Medium";

        [BsonElement("category")]
        [Required]
        [RegularExpression("^(meeting|task|deadline)$", ErrorMessage = "Category must be meeting, task, or deadline")]
        public string Category { get; set; } = "task";

        [BsonElement("participants")]
        public List<string> Participants { get; set; } = new List<string>();

        [BsonElement("createdBy")]
        public string CreatedBy { get; set; } = string.Empty;

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("updatedAt")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
