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
    /// Takımı oluşturan kullanıcının ID'si
    /// </summary>
    [BsonRepresentation(BsonType.ObjectId)]
    public string CreatedById { get; set; }

    /// <summary>
    /// Takıma katılmak için kullanılacak davet linki
    /// </summary>
    public string? InviteLink { get; set; }

    /// <summary>
    /// Takıma katılmak için kullanılacak davet kodu
    /// </summary>
    public string? InviteCode { get; set; }

    /// <summary>
    /// Davet linkinin geçerlilik süresi
    /// </summary>
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime? InviteLinkExpiresAt { get; set; }


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
    public List<string> Departments { get; set; } = new List<string>();
}

/// <summary>
/// Takım üyesi bilgilerini temsil eden model sınıfı
/// </summary>
public class TeamMember
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string Role { get; set; } = "Member";
    public List<string> AssignedJobs { get; set; } = new();
    public string? ProfileImage { get; set; }
    public List<string> Expertise { get; set; } = new();
    public string? Phone { get; set; }
    public string Status { get; set; } = "available";
    public int CompletedTasksCount { get; set; }
    public double PerformanceScore { get; set; }
    public string OnlineStatus { get; set; } = "offline";
    public AvailabilitySchedule? AvailabilitySchedule { get; set; }
    public string? Title { get; set; }
    public string? Position { get; set; }
    
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

}

/// <summary>
/// Üye müsaitlik programını temsil eden model sınıfı
/// </summary>
public class AvailabilitySchedule
{
    public DayOfWeek Day { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
}

/// <summary>
/// Departman istatistiklerini temsil eden model sınıfı
/// </summary>
public class DepartmentStats
{
    public string DepartmentName { get; set; } = string.Empty;
    public int MemberCount { get; set; }
    public int CompletedTaskCount { get; set; }
    public double AveragePerformance { get; set; }
}
