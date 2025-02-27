using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using JobTrackingAPI.Models;
using JobTrackingAPI.Settings;
using Microsoft.Extensions.Options;

namespace JobTrackingAPI.Services;

public class StatusUpdateBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly IMongoCollection<Team> _teams;
    private readonly IMongoCollection<TaskItem> _tasks;

    public StatusUpdateBackgroundService(IServiceProvider serviceProvider, IOptions<MongoDbSettings> settings)
    {
        _serviceProvider = serviceProvider;
        var client = new MongoClient(settings.Value.ConnectionString);
        var database = client.GetDatabase(settings.Value.DatabaseName);
        _teams = database.GetCollection<Team>("Teams");
        _tasks = database.GetCollection<TaskItem>("Tasks");
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Perform initial status check when service starts
        try
        {
            await UpdateTeamMemberStatuses();
            Console.WriteLine($"[{DateTime.Now}] Initial team member status check completed.");
        }
        catch (MongoException ex)
        {
            Console.Error.WriteLine($"[{DateTime.Now}] MongoDB Error in initial status check: {ex.Message}");
            Console.Error.WriteLine($"Stack trace: {ex.StackTrace}");
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[{DateTime.Now}] Unexpected error in initial status check: {ex.Message}");
            Console.Error.WriteLine($"Stack trace: {ex.StackTrace}");
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await UpdateTeamMemberStatuses();
                await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken); // Run every 5 minutes
            }
            catch (MongoException ex)
            {
                Console.Error.WriteLine($"[{DateTime.Now}] MongoDB Error in StatusUpdateBackgroundService: {ex.Message}");
                Console.Error.WriteLine($"Stack trace: {ex.StackTrace}");
                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken); // Wait before retrying
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[{DateTime.Now}] Unexpected error in StatusUpdateBackgroundService: {ex.Message}");
                Console.Error.WriteLine($"Stack trace: {ex.StackTrace}");
                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken); // Wait before retrying
            }
        }
    }

    private async Task UpdateTeamMemberStatuses()
    {
        var teams = await _teams.Find(_ => true).ToListAsync();
        int updatedMembersCount = 0;

        foreach (var team in teams)
        {
            bool teamUpdated = false;
            
            foreach (var member in team.Members)
            {
                // Get active tasks for the member
                var activeTasks = await _tasks.Find(t => 
                    t.AssignedUsers != null &&
                    t.AssignedUsers.Any(u => u.Id == member.Id) && 
                    t.Status != "completed" && 
                    t.Status != "overdue")
                    .ToListAsync();

                // Update member status based on active task count
                int totalActiveTasks = activeTasks.Count;
                string newStatus = totalActiveTasks > 3 ? "busy" : "available";

                if (member.Status != newStatus)
                {
                    member.Status = newStatus;
                    updatedMembersCount++;
                    teamUpdated = true;
                }
            }
            
            // Only update the team if there are changes
            if (teamUpdated)
            {
                await _teams.ReplaceOneAsync(t => t.Id == team.Id, team);
            }
        }
        
        if (updatedMembersCount > 0)
        {
            Console.WriteLine($"[{DateTime.Now}] {updatedMembersCount} member statuses updated");
        }
    }
}