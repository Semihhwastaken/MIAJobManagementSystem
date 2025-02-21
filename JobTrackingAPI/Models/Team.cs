using System.ComponentModel.DataAnnotations;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace JobTrackingAPI.Models;

/// <summary>
/// Takım bilgilerini temsil eden model sınıfı
/// </summary>
public class Team
{
    /// <summary>
    /// Takımın benzersiz kimlik numarası
    /// </summary>
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    /// <summary>
    /// Takımın adı
    /// </summary>
    [Required(ErrorMessage = "Takım adı zorunludur")]
    [StringLength(100, ErrorMessage = "Takım adı en fazla 100 karakter olabilir")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Takımın açıklaması
    /// </summary>
    [StringLength(500, ErrorMessage = "Takım açıklaması en fazla 500 karakter olabilir")]
    public string? Description { get; set; }

    /// <summary>
    /// Takımın oluşturulma tarihi
    /// </summary>
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Takımın son güncelleme tarihi
    /// </summary>
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime? UpdatedAt { get; set; }

    /// <summary>
    /// Takıma ait üyeler
    /// </summary>
    public List<TeamMember> Members { get; set; } = new List<TeamMember>();

    /// <summary>
    /// Takım departmanları
    /// </summary>
    public List<DepartmentStats> Departments { get; set; } = new List<DepartmentStats>();
}

public class TeamMember
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; }

    public string Username { get; set; }
    public string Email { get; set; }
    public string FullName { get; set; }
    public string Department { get; set; }
    public List<string> AssignedJobs { get; set; } = new();
    public string? ProfileImage { get; set; }
    public List<string> Expertise { get; set; } = new();
    public string? Phone { get; set; }
    public string Status { get; set; } = "available";
    public int CompletedTasksCount { get; set; }
    public int PerformanceScore { get; set; }
    public string OnlineStatus { get; set; } = "offline";
    public AvailabilitySchedule? AvailabilitySchedule { get; set; }
}

public class AvailabilitySchedule
{
    public string StartTime { get; set; }
    public string EndTime { get; set; }
}

public class DepartmentStats
{
    public string Name { get; set; }
    public int MemberCount { get; set; }
    public int CompletedTasks { get; set; }
    public int OngoingTasks { get; set; }
    public double Performance { get; set; }
}
