using JobTrackingAPI.Models;
using JobTrackingAPI.Settings;
using JobTrackingAPI.Services;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Text;

namespace JobTrackingAPI.Services;

/// <summary>
/// Takım işlemlerini yöneten servis sınıfı
/// </summary>
public class TeamService
{
    private readonly IMongoCollection<Team> _teams;
    private readonly IMongoCollection<JobTask> _tasks;
    private readonly UserService _userService;
    private readonly IOptions<MongoDbSettings> _settings;

    public TeamService(IOptions<MongoDbSettings> settings, UserService userService)
    {
        var client = new MongoClient(settings.Value.ConnectionString);
        var database = client.GetDatabase(settings.Value.DatabaseName);
        _teams = database.GetCollection<Team>("Teams");
        _tasks = database.GetCollection<JobTask>("Tasks");
        _userService = userService;
        _settings = settings;
    }

    /// <summary>
    /// Tüm takımları getirir
    /// </summary>
    public async Task<List<Team>> GetAllAsync()
    {
        return await _teams.Find(_ => true).ToListAsync();
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
    public async Task<Team> CreateTeamAsync(Team team, string userId)
    {
        var user = await _userService.GetByIdAsync(userId);
        if (user == null)
            throw new Exception("Kullanıcı bulunamadı");

        // İlk üye olarak ekleyen kişiyi Owner rolüyle ekliyoruz
        var owner = new TeamMember
        {
            Id = userId,
            Username = user.Username,
            Email = user.Email,
            FullName = user.FullName,
            Department = user.Department,
            ProfileImage = user.ProfileImage,
            Title = user.Title,
            Position = user.Position,
            Role = "Owner"  // Owner rolü veriliyor
        };

        team.Members = new List<TeamMember> { owner };
        team.InviteCode = GenerateInviteCode();
        
        await _teams.InsertOneAsync(team);
        return team;
    }

    /// <summary>
    /// Takım oluşturur
    /// </summary>
    public async Task<Team> CreateAsync(Team team)
    {
        try
        {
            // Takım adının benzersiz olduğunu kontrol et
            var existingTeam = await _teams.Find(t => t.Name == team.Name).FirstOrDefaultAsync();
            if (existingTeam != null)
            {
                throw new Exception("Bu isimde bir takım zaten mevcut.");
            }

            // Oluşturma tarihini ayarla
            team.CreatedAt = DateTime.UtcNow;

            // Davet kodunu oluştur
            team.InviteCode = GenerateInviteCode();

            // Takımı oluştur
            await _teams.InsertOneAsync(team);

            return team;
        }
        catch (Exception ex)
        {
            throw new Exception($"Takım oluşturulurken bir hata oluştu: {ex.Message}");
        }
    }

    /// Takımı günceller
    /// </summary>
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
        var teams = await _teams.Find(_ => true).ToListAsync();
        return teams.SelectMany(t => t.Members).ToList();
    }

    /// <summary>
    /// Tüm departmanları getirir
    /// </summary>
    public async Task<List<string>> GetDepartmentsAsync()
    {
        var teams = await _teams.Find(_ => true).ToListAsync();
        return teams.SelectMany(t => t.Members).Select(m => m.Department).Distinct().ToList();
    }

    /// <summary>
    /// Departmana göre takım üyelerini getirir
    /// </summary>
    public async Task<List<TeamMember>> GetMembersByDepartmentAsync(string department)
    {
        var teams = await _teams.Find(_ => true).ToListAsync();
        return teams.SelectMany(t => t.Members).Where(m => m.Department == department).ToList();
    }

    /// <summary>
    /// Takım üyesinin durumunu günceller
    /// </summary>
    public async Task<TeamMember> UpdateMemberStatusAsync(string id, string status)
    {
        var teams = await _teams.Find(t => t.Members.Any(m => m.Id == id)).ToListAsync();
        foreach (var team in teams)
        {
            var member = team.Members.FirstOrDefault(m => m.Id == id);
            if (member != null)
            {
                member.Status = status;
                await _teams.ReplaceOneAsync(t => t.Id == team.Id, team);
                return member;
            }
        }
        return null;
    }

    /// <summary>
    /// Takım üyesini günceller
    /// </summary>
    public async Task<TeamMember> UpdateMemberAsync(string id, TeamMemberUpdateDto updateDto)
    {
        var teams = await _teams.Find(t => t.Members.Any(m => m.Id == id)).ToListAsync();
        foreach (var team in teams)
        {
            var member = team.Members.FirstOrDefault(m => m.Id == id);
            if (member != null)
            {
                if (!string.IsNullOrEmpty(updateDto.Email))
                    member.Email = updateDto.Email;
                if (!string.IsNullOrEmpty(updateDto.FullName))
                    member.FullName = updateDto.FullName;
                if (!string.IsNullOrEmpty(updateDto.Department))
                    member.Department = updateDto.Department;
                if (!string.IsNullOrEmpty(updateDto.Title))
                    member.Title = updateDto.Title;
                if (!string.IsNullOrEmpty(updateDto.Phone))
                    member.Phone = updateDto.Phone;
                if (!string.IsNullOrEmpty(updateDto.Position))
                    member.Position = updateDto.Position;
                if (!string.IsNullOrEmpty(updateDto.ProfileImage))
                    member.ProfileImage = updateDto.ProfileImage;

                await _teams.ReplaceOneAsync(t => t.Id == team.Id, team);
                return member;
            }
        }
        return null;
    }

    /// <summary>
    /// Davet koduna göre takım getirir
    /// </summary>
    public async Task<Team> GetTeamByInviteCodeAsync(string inviteCode)
    {
        return await _teams.Find(t => t.InviteCode == inviteCode).FirstOrDefaultAsync();
    }

    /// <summary>
    /// Davet linkine göre takım getirir
    /// </summary>
    public async Task<Team> GetByInviteLinkAsync(string inviteLink)
    {
        return await _teams.Find(t => t.InviteLink == inviteLink).FirstOrDefaultAsync();
    }

    /// <summary>
    /// Takım üyesinin rolünü günceller
    /// </summary>
    public async Task<bool> UpdateMemberRoleAsync(string teamId, string memberId, string newRole)
    {
        var team = await GetByIdAsync(teamId);
        if (team == null)
            return false;

        var member = team.Members.FirstOrDefault(m => m.Id == memberId);
        if (member == null)
            return false;

        member.Role = newRole;
        return await UpdateAsync(teamId, team);
    }

    /// <summary>
    /// Takımın davet linkini temizler
    /// </summary>
    public async Task<bool> ClearInviteLinkAsync(string teamId)
    {
        var update = Builders<Team>.Update
            .Set(t => t.InviteLink, null)
            .Set(t => t.InviteLinkExpiresAt, null);

        var result = await _teams.UpdateOneAsync(t => t.Id == teamId, update);
        return result.IsAcknowledged && result.ModifiedCount > 0;
    }

    /// <summary>
    /// Kullanıcının üye olduğu tüm ekipleri getirir
    /// </summary>
    public async Task<List<Team>> GetTeamsByUserId(string userId)
    {
        var teams = await _teams.Find(t => t.Members.Any(m => m.Id == userId)).ToListAsync();
        return teams;
    }

    /// <summary>
    /// Davet linki oluşturur
    /// </summary>
    public async Task<string> GenerateInviteLinkAsync(string teamId)
    {
        var team = await _teams.Find(t => t.Id == teamId).FirstOrDefaultAsync();
        if (team == null) throw new Exception("Takım bulunamadı");
        
        var inviteCode = Guid.NewGuid().ToString("N")[..8].ToUpper();
        team.InviteCode = inviteCode;
        await _teams.ReplaceOneAsync(t => t.Id == teamId, team);
        
        return $"{_settings.Value.BaseUrl}/team-invite?code={inviteCode}";
    }

    public async Task<bool> JoinTeamWithInviteCode(string inviteCode, string userId)
    {
        try
        {
            var team = await GetTeamByInviteCodeAsync(inviteCode);
            if (team == null)
                throw new Exception("Takım bulunamadı");

            if (team.Members.Any(m => m.Id == userId))
                throw new Exception("Kullanıcı zaten takımın üyesi");

            var user = await _userService.GetByIdAsync(userId);
            if (user == null)
                throw new Exception("Kullanıcı bulunamadı");

            var newMember = new TeamMember
            {
                Id = userId,
                Username = user.Username,
                Email = user.Email,
                FullName = user.FullName,
                Department = user.Department,
                ProfileImage = user.ProfileImage,
                Role = "Member"
            };

            team.Members.Add(newMember);
            var result = await _teams.ReplaceOneAsync(t => t.Id == team.Id, team);

            return result.IsAcknowledged && result.ModifiedCount > 0;
        }
        catch
        {
            return false;
        }
    }

    public async Task<(bool success, string message)> DeleteTeamAsync(string teamId, string userId)
    {
        try
        {
            var team = await _teams.Find(t => t.Id == teamId).FirstOrDefaultAsync();
            if (team == null)
            {
                return (false, "Takım bulunamadı");
            }

            // İşlemi yapan kullanıcının owner olup olmadığını kontrol et
            var isOwner = team.Members.Any(m => m.Id == userId && m.Role == "Owner");
            if (!isOwner)
            {
                return (false, "Bu işlemi yapmak için takım sahibi olmanız gerekiyor");
            }

            var result = await _teams.DeleteOneAsync(t => t.Id == teamId);
            if (result.DeletedCount > 0)
            {
                return (true, "Takım başarıyla silindi");
            }
            else
            {
                return (false, "Takım silme işlemi başarısız oldu");
            }
        }
        catch (Exception ex)
        {
            return (false, $"Bir hata oluştu: {ex.Message}");
        }
    }

    public async Task<bool> AssignOwnerRoleAsync(string teamId, string currentUserId, string targetUserId)
    {
        try
        {
            var team = await _teams.Find(t => t.Id == teamId).FirstOrDefaultAsync();
            if (team == null)
            {
                throw new Exception("Takım bulunamadı.");
            }

            // Mevcut kullanıcının Owner olduğunu kontrol et
            var currentUserIsOwner = team.Members.Any(m => m.Id == currentUserId && m.Role == "Owner");
            if (!currentUserIsOwner)
            {
                throw new Exception("Bu işlem için yetkiniz bulunmamaktadır.");
            }

            // Hedef kullanıcının takımda olduğunu kontrol et
            var targetMember = team.Members.FirstOrDefault(m => m.Id == targetUserId);
            if (targetMember == null)
            {
                throw new Exception("Hedef kullanıcı takımda bulunamadı.");
            }

            // Hedef kullanıcı zaten Owner ise hata döndür
            if (targetMember.Role == "Owner")
            {
                throw new Exception("Bu kullanıcı zaten Owner rolüne sahip.");
            }

            // Owner rolünü ata
            var update = Builders<Team>.Update.Set(
                t => t.Members[-1].Role,
                "Owner"
            );

            var result = await _teams.UpdateOneAsync(
                t => t.Id == teamId && t.Members.Any(m => m.Id == targetUserId),
                update
            );

            return result.ModifiedCount > 0;
        }
        catch (Exception ex)
        {
            throw new Exception($"Owner rolü atanırken bir hata oluştu: {ex.Message}");
        }
    }

    public async Task<(bool success, string message)> RemoveTeamMemberAsync(string teamId, string memberId, string requestUserId)
    {
        try
        {
            var team = await _teams.Find(t => t.Id == teamId).FirstOrDefaultAsync();
            if (team == null)
            {
                return (false, "Takım bulunamadı");
            }

            // İşlemi yapan kullanıcının owner olup olmadığını kontrol et
            var isOwner = team.Members.Any(m => m.Id == requestUserId && m.Role == "Owner");
            if (!isOwner)
            {
                return (false, "Bu işlemi yapmak için takım sahibi olmanız gerekiyor");
            }

            // Çıkarılacak üyenin owner olup olmadığını kontrol et
            var memberToRemove = team.Members.FirstOrDefault(m => m.Id == memberId);
            if (memberToRemove == null)
            {
                return (false, "Üye bulunamadı");
            }

            if (memberToRemove.Role == "Owner")
            {
                return (false, "Takım sahibi takımdan çıkarılamaz");
            }

            // Üyeyi listeden çıkar
            var updateResult = await _teams.UpdateOneAsync(
                t => t.Id == teamId,
                Builders<Team>.Update.Pull(t => t.Members, memberToRemove)
            );

            if (updateResult.ModifiedCount > 0)
            {
                return (true, "Üye başarıyla takımdan çıkarıldı");
            }
            else
            {
                return (false, "Üye çıkarma işlemi başarısız oldu");
            }
        }
        catch (Exception ex)
        {
            return (false, $"Bir hata oluştu: {ex.Message}");
        }
    }

    /// <summary>
    /// Kullanıcının sahibi olduğu tüm takımları getirir
    /// </summary>
    public async Task<List<Team>> GetTeamsByOwnerId(string userId)
    {
        return await _teams.Find(t => t.CreatedById == userId).ToListAsync();
    }

    /// <summary>
    /// ID'ye göre takım getirir
    /// </summary>
    public async Task<Team> GetTeamById(string id)
    {
        return await _teams.Find(t => t.Id == id).FirstOrDefaultAsync();
    }

    /// <summary>
    /// Belirli bir takımın üyelerini getirir
    /// </summary>
    public async Task<List<TeamMember>> GetTeamMembers(string teamId)
    {
        var team = await GetTeamById(teamId);
        if (team == null)
        {
            return new List<TeamMember>();
        }

        // Takım üyelerini doğrudan döndür
        return team.Members;
    }

    // Yardımcı metodlar
    private string GenerateInviteCode()
    {
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        var random = new Random();
        return new string(Enumerable.Repeat(chars, 8)
            .Select(s => s[random.Next(s.Length)]).ToArray());
    }

    private async Task UpdateMemberPerformanceScores()
    {
        var teams = await _teams.Find(_ => true).ToListAsync();
        foreach (var team in teams)
        {
            foreach (var member in team.Members)
            {
                var completedTasks = await _tasks.CountDocumentsAsync(
                    Builders<JobTask>.Filter.And(
                        Builders<JobTask>.Filter.Eq(t => t.AssignedToUserId, member.Id),
                        Builders<JobTask>.Filter.Eq(t => t.Status, "completed")
                    )
                );

                var totalTasks = await _tasks.CountDocumentsAsync(
                    Builders<JobTask>.Filter.Eq(t => t.AssignedToUserId, member.Id)
                );

                var performanceScore = totalTasks > 0 ? (int)((completedTasks / (double)totalTasks) * 100) : 0;

                member.CompletedTasksCount = (int)completedTasks;
                member.PerformanceScore = performanceScore;
            }
            await _teams.ReplaceOneAsync(t => t.Id == team.Id, team);
        }
    }
}