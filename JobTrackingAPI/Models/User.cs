using System;
using System.Collections.Generic;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace JobTrackingAPI.Models
{
    public class User
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; }

        [BsonElement("username")]
        public string Username { get; set; }

        [BsonElement("email")]
        public string Email { get; set; }

        [BsonElement("fullName")]
        public string FullName { get; set; }

        [BsonElement("department")]
        public string Department { get; set; }

        [BsonElement("password")]
        public string Password { get; set; }

        [BsonElement("title")]
        public string Title { get; set; }

        [BsonElement("phone")]
        public string Phone { get; set; }

        [BsonElement("position")]
        public string Position { get; set; }

        [BsonElement("assignedJobs")]
        public List<string> AssignedJobs { get; set; } = new List<string>();

        [BsonElement("profileImage")]
        public string ProfileImage { get; set; }

        [BsonElement("createdDate")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

        [BsonElement("updatedDate")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime? UpdatedDate { get; set; }

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
            CreatedDate = DateTime.UtcNow;
            ProfileImage = profileImage;
            Title = title;
            Phone = phone;
            Position = position;
        }
    }
}
