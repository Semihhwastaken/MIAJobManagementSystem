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

    public TeamService(IOptions<MongoDbSettings> mongoDbSettings, IMongoClient mongoClient)
    {
        var database = mongoClient.GetDatabase(mongoDbSettings.Value.DatabaseName);
        _teams = database.GetCollection<Team>("Teams");
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
    public async Task<Team?> GetByIdAsync(string id)
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
    /// Var olan takımı günceller
    /// </summary>
    public async Task<bool> UpdateAsync(Team team)
    {
        var result = await _teams.ReplaceOneAsync(t => t.Id == team.Id, team);
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
}
