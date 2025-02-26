using JobTrackingAPI.Models;
using JobTrackingAPI.Models.Requests;

namespace JobTrackingAPI.Services
{
    public interface ITeamService
    {
        Task<Team> CreateTeam(Models.Requests.CreateTeamRequest request, string userId);
        Task<Team> GetTeamById(string teamId);
        Task<IEnumerable<Team>> GetAllTeams();
        Task<Team> UpdateTeam(string teamId, Team updatedTeam);
        Task DeleteTeam(string teamId);
        Task<bool> AddMemberToTeam(string teamId, string userId, string role = "member");
        Task<bool> RemoveMemberFromTeam(string teamId, string userId);
        Task<bool> UpdateMemberRole(string teamId, string userId, string newRole);
        Task<Team> SetTeamInviteLink(string teamId, string inviteLink);
        Task<bool> JoinTeamViaInviteLink(string inviteLink, string userId);
        Task<Team> UpdateTeamDepartments(string teamId, UpdateTeamDepartmentsRequest request);
        Task<bool> UpdateMemberMetrics(string teamId, string userId, MemberMetricsUpdateDto metrics);
    }
}