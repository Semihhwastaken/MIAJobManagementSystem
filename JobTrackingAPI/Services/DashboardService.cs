using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using JobTrackingAPI.Models;
using MongoDB.Driver;

namespace JobTrackingAPI.Services
{
    public class DashboardService
    {
        private readonly IMongoDatabase _database;
        private readonly ITasksService _tasksService;
        private readonly ITeamService _teamService;

        public DashboardService(
            IMongoDatabase database,
            ITasksService tasksService,
            ITeamService teamService)
        {
            _database = database;
            _tasksService = tasksService;
            _teamService = teamService;
        }

        public async Task<DashboardStats> GetUserDashboardStats(string userId)
        {
            var allTasks = await _tasksService.GetTasksByUserId(userId);
            var teams = await _teamService.GetTeamsByUserId(userId);

            var completedTasks = allTasks.FindAll(t => t.Status == "completed");
            var pendingTasks = allTasks.FindAll(t => t.Status == "pending");
            var inProgressTasks = allTasks.FindAll(t => t.Status == "in-progress");
            var overdueTasks = allTasks.FindAll(t => t.Status == "overdue" || 
                (t.DueDate != null && t.DueDate < DateTime.Now && t.Status != "completed"));

            return new DashboardStats
            {
                TotalTasks = allTasks.Count,
                CompletedTasks = completedTasks.Count,
                PendingTasks = pendingTasks.Count,
                OverdueTasks = overdueTasks.Count,
                PreviousTotalTasks = 0,
                PreviousCompletedTasks = 0,
                PreviousInProgressTasks = 0,
                PreviousOverdueTasks = 0,
                LineChartData = new List<ChartDataPoint>()
            };
        }
    }
} 