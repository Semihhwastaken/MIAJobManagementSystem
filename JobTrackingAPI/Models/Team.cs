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
    /// Takım lideri ID'si
    /// </summary>
    [Required(ErrorMessage = "Takım lideri zorunludur")]
    [BsonElement("leaderId")]
    public string LeaderId { get; set; } = string.Empty;

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
    /// <summary>
    /// Üye ID'si (User tablosundaki ID)
    /// </summary>
    [Required]
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// Üyenin takımdaki rolü
    /// </summary>
    public string Role { get; set; } = "member";

    /// <summary>
    /// Üyenin departmanı
    /// </summary>
    public string Department { get; set; } = string.Empty;

    /// <summary>
    /// Üyenin takıma katılma tarihi
    /// </summary>
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime JoinDate { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Üyenin takımdaki durumu (active, inactive, pending)
    /// </summary>
    public string Status { get; set; } = "active";

    /// <summary>
    /// Üyenin tamamladığı görev sayısı
    /// </summary>
    public int CompletedTasksCount { get; set; } = 0;

    /// <summary>
    /// Üyenin performans puanı (0-100 arası)
    /// </summary>
    public double PerformanceScore { get; set; } = 0;
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
