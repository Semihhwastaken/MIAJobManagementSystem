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
    private readonly IMongoCollection<TeamMember> _members;
    private readonly IMongoCollection<JobTask> _tasks;

    public TeamService(IOptions<MongoDbSettings> mongoDbSettings, IMongoClient mongoClient)
    {
        var database = mongoClient.GetDatabase(mongoDbSettings.Value.DatabaseName);
        _teams = database.GetCollection<Team>("Teams");
        _members = database.GetCollection<TeamMember>("TeamMembers");
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
        return await _members.Find(member => true).ToListAsync();
    }

    /// <summary>
    /// Tüm departmanları getirir
    /// </summary>
    public async Task<List<string>> GetDepartmentsAsync()
    {
        return await _members.Distinct<string>("Department", Builders<TeamMember>.Filter.Empty).ToListAsync();
    }

    /// <summary>
    /// Departmana göre takım üyelerini getirir
    /// </summary>
    public async Task<List<TeamMember>> GetMembersByDepartmentAsync(string department)
    {
        var filter = Builders<TeamMember>.Filter.Eq(m => m.Department, department);
        return await _members.Find(filter).ToListAsync();
    }

    /// <summary>
    /// Takım üyesinin durumunu günceller
    /// </summary>
    public async Task<TeamMember> UpdateMemberStatusAsync(string id, string status)
    {
        var filter = Builders<TeamMember>.Filter.Eq(m => m.Id, id);
        var update = Builders<TeamMember>.Update.Set(m => m.Status, status);
        
        await _members.UpdateOneAsync(filter, update);
        return await _members.Find(filter).FirstOrDefaultAsync();
    }

    /// <summary>
    /// Takım üyesini günceller
    /// </summary>
    public async Task<TeamMember> UpdateMemberAsync(string id, TeamMemberUpdateDto updateDto)
    {
        var filter = Builders<TeamMember>.Filter.Eq(m => m.Id, id);
        var update = Builders<TeamMember>.Update;
        var updateDefinition = new List<UpdateDefinition<TeamMember>>();

        if (updateDto.ProfileImage != null)
            updateDefinition.Add(update.Set(m => m.ProfileImage, updateDto.ProfileImage));
        
        if (updateDto.Expertise != null)
            updateDefinition.Add(update.Set(m => m.Expertise, updateDto.Expertise));
        
        if (updateDto.Phone != null)
            updateDefinition.Add(update.Set(m => m.Phone, updateDto.Phone));
        
        if (updateDto.AvailabilitySchedule != null)
            updateDefinition.Add(update.Set(m => m.AvailabilitySchedule, updateDto.AvailabilitySchedule));

        await _members.UpdateOneAsync(filter, update.Combine(updateDefinition));
        return await _members.Find(filter).FirstOrDefaultAsync();
    }

    // Yardımcı metodlar
    private async Task UpdateMemberPerformanceScores()
    {
        var members = await GetAllMembersAsync();
        foreach (var member in members)
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

            var filter = Builders<TeamMember>.Filter.Eq(m => m.Id, member.Id);
            var update = Builders<TeamMember>.Update
                .Set(m => m.CompletedTasksCount, (int)completedTasks)
                .Set(m => m.PerformanceScore, performanceScore);

            await _members.UpdateOneAsync(filter, update);
        }
    }
}
