using System.ComponentModel.DataAnnotations;

namespace JobTrackingAPI.Models;

<<<<<<< HEAD
public class CreateTeamRequest
{
    [Required(ErrorMessage = "Takım adı zorunludur.")]
    [StringLength(100, MinimumLength = 3, ErrorMessage = "Takım adı 3-100 karakter arasında olmalıdır.")]
    public string Name { get; set; }

    [StringLength(500, ErrorMessage = "Takım açıklaması en fazla 500 karakter olabilir")]
    public string? Description { get; set; }
}

public class GenerateTeamInviteLinkRequest
{
    [Required(ErrorMessage = "Takım ID'si zorunludur")]
    public string TeamId { get; set; }
=======
public class GenerateTeamInviteLinkRequest
{
    [Required(ErrorMessage = "Takım ID'si zorunludur")]
    public required string TeamId { get; set; }
>>>>>>> newdb1

    /// <summary>
    /// Davet linkinin geçerlilik süresi (saat cinsinden). Varsayılan: 24 saat
    /// </summary>
    public int ExpirationHours { get; set; } = 24;
}

public class JoinTeamWithInviteLinkRequest
{
    [Required(ErrorMessage = "Davet linki zorunludur")]
<<<<<<< HEAD
    public string InviteLink { get; set; }
=======
    public required string InviteLink { get; set; }
>>>>>>> newdb1
}

public class TeamInviteLinkResponse
{
<<<<<<< HEAD
    public string TeamId { get; set; }
    public string InviteLink { get; set; }
    public DateTime ExpiresAt { get; set; }
=======
    public required string TeamId { get; set; }
    public required string InviteLink { get; set; }
    public DateTime ExpiresAt { get; set; }
}

public class AcceptTeamRequest
{
    [Required]
    public required string TeamId { get; set; }

    [Required]
    public required string InviteLink { get; set; }
}

public class TeamInviteRequest
{
    [Required]
    public required string TeamId { get; set; }

    [Required]
    public required string InviteLink { get; set; }
>>>>>>> newdb1
}