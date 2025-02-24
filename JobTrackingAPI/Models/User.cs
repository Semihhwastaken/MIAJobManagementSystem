using System;
using System.Collections.Generic;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.ComponentModel.DataAnnotations;

namespace JobTrackingAPI.Models
{
    [BsonIgnoreExtraElements]
    public class User
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]

        public string Id { get; set; } = string.Empty;

        [BsonElement("username")]
        [Required]
        public string Username { get; set; } = string.Empty;

        [BsonElement("email")]
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [BsonElement("fullName")]
        [Required]
        public string FullName { get; set; } = string.Empty;

        [BsonElement("department")]
        [Required]
        public string Department { get; set; } = string.Empty;

        [BsonElement("password")]
        [Required]
        public string Password { get; set; } = string.Empty;

        [BsonElement("createdAt")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("updatedAt")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime? UpdatedAt { get; set; }

        [BsonElement("profileImage")]
        public string? ProfileImage { get; set; }

        [BsonElement("title")]
        public string Title { get; set; } = string.Empty;

        [BsonElement("phone")]
        public string Phone { get; set; } = string.Empty;

        [BsonElement("position")]
        public string Position { get; set; } = string.Empty;

        [BsonElement("assignedJobs")]
        public List<string> AssignedJobs { get; set; } = new List<string>();

        [BsonElement("leadingTeams")]
        public List<string> LeadingTeams { get; set; } = new List<string>();

        [BsonElement("memberOfTeams")]
        public List<string> MemberOfTeams { get; set; } = new List<string>();

        [BsonElement("role")]
        public string Role { get; set; } = "user";

        public User()
        {
        }

        public User(string username, string email, string fullName, string department, string password, string profileImage, string title, string phone, string position)
        {
            Username = username;
            Email = email;
            FullName = fullName;
            Department = department;
            Password = password;
            CreatedAt = DateTime.UtcNow;
            ProfileImage = profileImage;
            Title = title;
            Phone = phone;
            Position = position;
            LeadingTeams = new List<string>();
            MemberOfTeams = new List<string>();
        }
    }
}
