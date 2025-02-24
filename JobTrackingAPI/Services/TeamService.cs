using JobTrackingAPI.Models;
using JobTrackingAPI.Settings;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace JobTrackingAPI.Services;

/// <summary>
/// Takım işlemlerini yöneten servis sınıfı
/// </summary>
public class TeamService
{
    private readonly IMongoCollection<Team> _teams;
    private readonly IMongoCollection<User> _users;
    private readonly IMongoCollection<JobTask> _tasks;

    public TeamService(IOptions<MongoDbSettings> mongoDbSettings, IMongoClient mongoClient)
    {
        var database = mongoClient.GetDatabase(mongoDbSettings.Value.DatabaseName);
        _teams = database.GetCollection<Team>("Teams");
        _users = database.GetCollection<User>("Users");
        _tasks = database.GetCollection<JobTask>("Tasks");
    }

    /// <summary>
    /// Tüm takımları getirir
    /// </summary>
    public async Task<List<Team>> GetAllAsync()
    {
        return await _teams.Find(team => true).ToListAsync();
    }

    /// <summary>
    /// ID'ye göre takım getirir
    /// </summary>
    public async Task<Team> GetByIdAsync(string id)
    {
        return await _teams.Find(t => t.Id == id).FirstOrDefaultAsync();
    }

    /// <summary>
    /// Yeni takım oluşturur
    /// </summary>
    public async Task<Team> CreateAsync(Team team)
    {
        await _teams.InsertOneAsync(team);
        return team;
    }

    /// <summary>
    /// Takımı günceller
    /// </summary>
    /// <param name="id">Takım ID'si</param>
    /// <param name="team">Güncellenmiş takım verileri</param>
    /// <returns>Güncelleme başarılı ise true, aksi halde false</returns>
    public async Task<bool> UpdateAsync(string id, Team team)
    {
        var result = await _teams.ReplaceOneAsync(t => t.Id == id, team);
        return result.IsAcknowledged && result.ModifiedCount > 0;
    }

    /// <summary>
    /// Takımı siler
    /// </summary>
    public async Task<bool> DeleteAsync(string id)
    {
        var result = await _teams.DeleteOneAsync(t => t.Id == id);
        return result.IsAcknowledged && result.DeletedCount > 0;
    }

    /// <summary>
    /// Tüm takım üyelerini getirir
    /// </summary>
    public async Task<List<TeamMember>> GetAllMembersAsync()
    {
        var teams = await GetAllAsync();
        var allMembers = new List<TeamMember>();
        foreach (var team in teams)
        {
            allMembers.AddRange(team.Members);
        }
        return allMembers;
    }

    /// <summary>
    /// Tüm departmanları getirir
    /// </summary>
    public async Task<List<string>> GetDepartmentsAsync()
    {
        var teams = await GetAllAsync();
        return teams.SelectMany(t => t.Departments).Distinct().ToList();
    }

    /// <summary>
    /// Departmana göre takım üyelerini getirir
    /// </summary>
    public async Task<List<TeamMember>> GetMembersByDepartmentAsync(string department)
    {
        var teams = await GetAllAsync();
        return teams
            .SelectMany(t => t.Members)
            .Where(m => m.Department == department)
            .ToList();
    }

    /// <summary>
    /// Takım üyesinin durumunu günceller
    /// </summary>
    public async Task<TeamMember?> UpdateMemberStatusAsync(string teamId, string userId, string status)
    {
        var team = await GetByIdAsync(teamId);
        if (team == null) return null;

        var member = team.Members.FirstOrDefault(m => m.UserId == userId);
        if (member == null) return null;

        member.Status = status;
        await UpdateAsync(teamId, team);
        
        return member;
    }

    /// <summary>
    /// Takım üyesini günceller
    /// </summary>
    public async Task<TeamMember?> UpdateMemberAsync(string teamId, string userId, TeamMember updatedMember)
    {
        var team = await GetByIdAsync(teamId);
        if (team == null) return null;

        var member = team.Members.FirstOrDefault(m => m.UserId == userId);
        if (member == null) return null;

        member.Role = updatedMember.Role;
        member.Status = updatedMember.Status;

        await UpdateAsync(teamId, team);
        return member;
    }

    /// <summary>
    /// Takım üyesinin metriklerini günceller
    /// </summary>
    public async Task<bool> UpdateMemberMetricsAsync(string teamId, string userId, int completedTasks, double performanceScore)
    {
        var team = await GetByIdAsync(teamId);
        if (team == null) return false;

        var member = team.Members.FirstOrDefault(m => m.UserId == userId);
        if (member == null) return false;

        member.CompletedTasksCount = completedTasks;
        member.PerformanceScore = performanceScore;

        return await UpdateAsync(teamId, team);
    }

    /// <summary>
    /// Kullanıcının lider olduğu takımları getirir
    /// </summary>
    public async Task<List<Team>> GetTeamsByLeaderIdAsync(string userId)
    {
        return await _teams.Find(t => t.LeaderId == userId).ToListAsync();
    }

    /// <summary>
    /// Kullanıcının üye olduğu takımları getirir
    /// </summary>
    public async Task<List<Team>> GetTeamsByMemberIdAsync(string userId)
    {
        return await _teams.Find(t => t.Members.Any(m => m.UserId == userId)).ToListAsync();
    }

    /// <summary>
    /// Kullanıcının tüm takımlarını getirir (lider olduğu ve üye olduğu)
    /// </summary>
    public async Task<(List<Team> LeadingTeams, List<Team> MemberTeams)> GetAllTeamsByUserIdAsync(string userId)
    {
        var leadingTeams = await GetTeamsByLeaderIdAsync(userId);
        var memberTeams = await GetTeamsByMemberIdAsync(userId);
        return (leadingTeams, memberTeams);
    }

    /// <summary>
    /// Takıma yeni üye ekler
    /// </summary>
    public async Task<bool> AddTeamMemberAsync(string teamId, string userId, string role = "member")
    {
        var team = await GetByIdAsync(teamId);
        if (team == null) return false;

        var user = await _users.Find(u => u.Id == userId).FirstOrDefaultAsync();
        if (user == null) return false;

        var member = new TeamMember
        {
            UserId = userId,
            Role = role,
            JoinDate = DateTime.UtcNow,
            Status = "active"
        };

        var update = Builders<Team>.Update.Push(t => t.Members, member);
        var teamResult = await _teams.UpdateOneAsync(t => t.Id == teamId, update);

        var userUpdate = Builders<User>.Update.Push(u => u.MemberOfTeams, teamId);
        var userResult = await _users.UpdateOneAsync(u => u.Id == userId, userUpdate);

        return teamResult.IsAcknowledged && teamResult.ModifiedCount > 0 &&
               userResult.IsAcknowledged && userResult.ModifiedCount > 0;
    }

    /// <summary>
    /// Takımdan üye çıkarır
    /// </summary>
    public async Task<bool> RemoveTeamMemberAsync(string teamId, string userId)
    {
        var team = await GetByIdAsync(teamId);
        if (team == null) return false;

        var update = Builders<Team>.Update.PullFilter(t => t.Members, m => m.UserId == userId);
        var teamResult = await _teams.UpdateOneAsync(t => t.Id == teamId, update);

        var userUpdate = Builders<User>.Update.Pull(u => u.MemberOfTeams, teamId);
        var userResult = await _users.UpdateOneAsync(u => u.Id == userId, userUpdate);

        return teamResult.IsAcknowledged && teamResult.ModifiedCount > 0 &&
               userResult.IsAcknowledged && userResult.ModifiedCount > 0;
    }

    /// <summary>
    /// Yeni takım oluşturur ve kullanıcıyı lider olarak atar
    /// </summary>
    public async Task<Team> CreateTeamWithLeaderAsync(Team team, string userId)
    {
        team.LeaderId = userId;
        await _teams.InsertOneAsync(team);

        var update = Builders<User>.Update.Push(u => u.LeadingTeams, team.Id);
        await _users.UpdateOneAsync(u => u.Id == userId, update);

        return team;
    }

    /// <summary>
    /// Departmana göre takımları getirir
    /// </summary>
    public async Task<List<Team>> GetTeamsByDepartmentAsync(string department)
    {
        return await _teams.Find(t => t.Departments.Contains(department)).ToListAsync();
    }
}
