using JobTrackingAPI.Models;
using JobTrackingAPI.Models.Requests;
using System.Collections.Generic;
using System.Threading.Tasks;

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
        Task<Team> UpdateTeamDepartments(string teamId, UpdateTeamDepartmentsRequest request);
        Task<bool> UpdateMemberMetrics(string teamId, string userId, MemberMetricsUpdateDto metrics);
        Task<Team> GetTeamByMemberId(string memberId);
        Task UpdateUserPerformance(string userId);
        Task<List<Team>> GetTeamsByUserId(string userId);
        Task UpdateMemberStatusesAsync(MemberMetricsUpdateDto updateData);
        
        // Takım yönetimi ile ilgili metotlar
        Task<bool> AssignOwnerRoleAsync(string teamId, string currentUserId, string targetUserId);
        Task<(bool success, string message)> RemoveTeamMemberAsync(string teamId, string memberId, string requestUserId);
        Task<string> GetInviteLinkAsync(string teamId);
        Task<string> SetInviteLinkAsync(string teamId, string inviteLink);
        Task<Team> AddExpertiesAsync(string memberId, string expertise);
        Task<Team> GetTeamByInviteCodeAsync(string inviteCode);
        Task<bool> JoinTeamWithInviteCode(string inviteCode, string userId);
        
        // TeamController'da ihtiyaç duyulan ek metotlar
        Task<PerformanceScore> GetUserPerformance(string userId);
        Task<List<Team>> GetTeamsByOwnerId(string ownerId);
        Task<List<TeamMember>> GetAllMembersAsync();
        Task<List<string>> GetDepartmentsAsync();
        Task<List<TeamMember>> GetMembersByDepartmentAsync(string department);
        Task<List<TeamMember>> GetTeamMembers(string teamId, bool enrich = true);
        Task<TeamMember> UpdateMemberStatusAsync(string id, string status);
        Task<TeamMember> UpdateMemberAsync(string id, TeamMemberUpdateDto updateDto);
        Task<Team> CreateAsync(Team team);
        Task<bool> UpdateAsync(string id, Team team);
        Task<bool> DeleteAsync(string id);
        Task<string> GenerateInviteLinkAsync(string teamId);
        Task<Team> UpdateTeamDepartmentsAsync(string teamId, List<DepartmentStats> departments);
        Task<(bool success, string message)> DeleteTeamAsync(string teamId, string userId);
        Task<Team> GetByInviteLinkAsync(string inviteLink);
        Task<int> GetTotalTeamCount();
    }
}