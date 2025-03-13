using System.ComponentModel.DataAnnotations;

namespace JobTrackingAPI.Models.Requests
{
    public class SetInviteLinkRequest
    {
        [Required(ErrorMessage = "Takım ID'si zorunludur")]
        public string? teamId { get; set; }

        [Required(ErrorMessage = "Davet linki zorunludur")]
        public string? InviteLink { get; set; }
    }
}
