using System.ComponentModel.DataAnnotations;

namespace JobTrackingAPI.Models;

public class GenerateTeamInviteLinkRequest
{
    [Required(ErrorMessage = "Takım ID'si zorunludur")]
    public required string TeamId { get; set; }

    /// <summary>
    /// Davet linkinin geçerlilik süresi (saat cinsinden). Varsayılan: 24 saat
    /// </summary>
    public int ExpirationHours { get; set; } = 24;
}

public class JoinTeamWithInviteLinkRequest
{
    [Required(ErrorMessage = "Davet linki zorunludur")]
    public required string InviteLink { get; set; }
}

public class TeamInviteLinkResponse
{
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
}