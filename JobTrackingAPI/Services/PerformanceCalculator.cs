using System;
using System.Collections.Generic;
using JobTrackingAPI.Models;

namespace JobTrackingAPI.Services
{
    public class PerformanceCalculator
    {
        private const double EARLY_COMPLETION_BONUS = 0.02; // 2% bonus per day
        private const double LATE_COMPLETION_PENALTY = 0.015; // 1.5% penalty per day
        private const double OVERDUE_PENALTY = 0.05; // 5% penalty per day

        private static readonly Dictionary<string, int> PRIORITY_SCORES = new()
        {
            { "high", 30 },
            { "medium", 20 },
            { "low", 10 }
        };

        public static PerformanceMetrics CalculateDetailedMetrics(List<TaskItem> tasks, string teamId)
        {
            var metrics = new PerformanceMetrics();
            if (tasks.Count == 0) return metrics;

            var teamTasks = tasks.Where(t => t.TeamId == teamId).ToList();
            if (teamTasks.Count == 0) return metrics;

            var completedTasks = teamTasks.Where(t => t.Status == "completed").ToList();
            var overdueTasks = teamTasks.Where(t => t.Status == "overdue").ToList();

            // Genel metrikleri hesapla
            metrics.AverageCompletionTime = CalculateAverageCompletionTime(completedTasks);
            metrics.EarlyCompletionRate = CalculateEarlyCompletionRate(completedTasks, teamTasks.Count);
            metrics.OnTimeCompletionRate = CalculateOnTimeCompletionRate(completedTasks, teamTasks.Count);
            metrics.OverdueRate = (double)overdueTasks.Count / teamTasks.Count;

            // Öncelik metriklerini hesapla
            CalculatePriorityMetrics(teamTasks, metrics.PriorityMetrics);

            // Kategori metriklerini hesapla
            CalculateCategoryMetrics(teamTasks, metrics.CategoryPerformance);

            // Aylık performans verilerini güncelle
            UpdateMonthlyPerformance(teamTasks, metrics);

            return metrics;
        }

        private static double CalculateAverageCompletionTime(List<TaskItem> completedTasks)
        {
            if (!completedTasks.Any()) return 0;

            var totalDays = completedTasks.Sum(task =>
            {
                var completedDate = task.CompletedDate ?? DateTime.UtcNow;
                var createdDate = task.CreatedAt;
                return (completedDate - createdDate).TotalDays;
            });

            return totalDays / completedTasks.Count;
        }

        private static double CalculateEarlyCompletionRate(List<TaskItem> completedTasks, int totalTasks)
        {
            if (totalTasks == 0) return 0;

            var earlyCompletions = completedTasks.Count(task =>
            {
                var completedDate = task.CompletedDate ?? DateTime.UtcNow;
                var dueDate = task.DueDate != null ? DateTime.Parse(task.DueDate.ToString()!) : DateTime.UtcNow;
                return completedDate < dueDate;
            });

            return (double)earlyCompletions / totalTasks;
        }

        private static double CalculateOnTimeCompletionRate(List<TaskItem> completedTasks, int totalTasks)
        {
            if (totalTasks == 0) return 0;

            var onTimeCompletions = completedTasks.Count(task =>
            {
                var completedDate = task.CompletedDate ?? DateTime.UtcNow;
                var dueDate = task.DueDate != null ? DateTime.Parse(task.DueDate.ToString()!) : DateTime.UtcNow;
                return completedDate <= dueDate;
            });

            return (double)onTimeCompletions / totalTasks;
        }

        private static void CalculatePriorityMetrics(List<TaskItem> tasks, TaskPriorityMetrics metrics)
        {
            foreach (var task in tasks)
            {
                var stats = task.Priority.ToLower() switch
                {
                    "high" => metrics.High,
                    "medium" => metrics.Medium,
                    "low" => metrics.Low,
                    _ => null
                };

                if (stats != null)
                {
                    stats.TotalTasks++;
                    if (task.Status == "completed") stats.CompletedTasks++;
                    if (task.Status == "overdue") stats.OverdueTasks++;

                    if (task.CompletedDate.HasValue)
                    {
                        var completionTime = (task.CompletedDate.Value - task.CreatedAt).TotalDays;
                        stats.AverageCompletionTime = ((stats.AverageCompletionTime * (stats.CompletedTasks - 1)) + completionTime) / stats.CompletedTasks;
                    }
                }
            }
        }

        private static void CalculateCategoryMetrics(List<TaskItem> tasks, CategoryMetrics metrics)
        {
            foreach (var task in tasks)
            {
                if (!metrics.Categories.ContainsKey(task.Category))
                {
                    metrics.Categories[task.Category] = new CategoryStats();
                }

                var stats = metrics.Categories[task.Category];
                stats.TotalTasks++;
                if (task.Status == "completed") stats.CompletedTasks++;
                if (task.Status == "overdue") stats.OverdueTasks++;
                stats.SuccessRate = stats.TotalTasks > 0 ? (double)stats.CompletedTasks / stats.TotalTasks : 0;
            }
        }

        private static void UpdateMonthlyPerformance(List<TaskItem> tasks, PerformanceMetrics metrics)
        {
            var now = DateTime.UtcNow;
            var currentMonthTasks = tasks.Where(t => 
                t.CompletedDate?.Month == now.Month && 
                t.CompletedDate?.Year == now.Year)
                .ToList();

            var monthlyPerf = new MonthlyPerformance
            {
                Year = now.Year,
                Month = now.Month,
                CompletedTasks = currentMonthTasks.Count(t => t.Status == "completed"),
                OverdueTasks = currentMonthTasks.Count(t => t.Status == "overdue")
            };

            // Ortalama skoru hesapla
            double totalScore = currentMonthTasks.Sum(t => CalculateTaskScore(t));
            monthlyPerf.AverageScore = currentMonthTasks.Any() ? totalScore / currentMonthTasks.Count : 0;

            // Üretkenlik trendini hesapla
            var lastMonth = metrics.MonthlyHistory.LastOrDefault();
            if (lastMonth != null)
            {
                monthlyPerf.ProductivityTrend = lastMonth.AverageScore > 0 
                    ? ((monthlyPerf.AverageScore - lastMonth.AverageScore) / lastMonth.AverageScore) * 100 
                    : 0;
            }

            metrics.CurrentMonthPerformance = monthlyPerf;
            metrics.MonthlyHistory.Add(monthlyPerf);

            // Son 12 ayı tut
            if (metrics.MonthlyHistory.Count > 12)
            {
                metrics.MonthlyHistory = metrics.MonthlyHistory.OrderByDescending(m => m.Year)
                    .ThenByDescending(m => m.Month)
                    .Take(12)
                    .ToList();
            }
        }

        public static double CalculateTaskScore(TaskItem task)
        {
            if (task == null) return 0;

            int basePriority = PRIORITY_SCORES[task.Priority.ToLower()];
            int assignedUsersCount = task.AssignedUsers?.Count ?? 1;

            if (task.Status == "completed" && task.CompletedDate.HasValue)
            {
                var completedDate = task.CompletedDate.Value;
                var dueDate = task.DueDate != null ? DateTime.Parse(task.DueDate.ToString()!) : DateTime.UtcNow;
                var timeSpan = dueDate - completedDate;
                var daysDifference = timeSpan.TotalDays;

                double timeBonus = daysDifference > 0
                    ? daysDifference * EARLY_COMPLETION_BONUS
                    : daysDifference * LATE_COMPLETION_PENALTY * -1;

                return (basePriority * (1 + timeBonus)) / assignedUsersCount;
            }
            else if (task.Status == "overdue")
            {
                var currentDate = DateTime.UtcNow;
                var dueDate = task.DueDate != null ? DateTime.Parse(task.DueDate.ToString()!) : DateTime.UtcNow;
                var overdueDays = (currentDate - dueDate).TotalDays;

                if (overdueDays <= 0) return 0;

                return (basePriority * overdueDays * OVERDUE_PENALTY * -1) / assignedUsersCount;
            }

            return 0;
        }

        public static double CalculateUserPerformance(List<TaskItem> userTasks, string teamId)
        {
            var teamTasks = userTasks.Where(t => t.TeamId == teamId).ToList();
            
            if (teamTasks.Count == 0) return 100; // Default score

            double totalScore = 0;
            double maxPossibleScore = 0;

            foreach (var task in teamTasks)
            {
                totalScore += CalculateTaskScore(task);
                // Calculate max possible score (if all tasks were completed early)
                maxPossibleScore += PRIORITY_SCORES[task.Priority.ToLower()] * (1 + 5 * EARLY_COMPLETION_BONUS) / (task.AssignedUsers?.Count ?? 1);
            }

            if (maxPossibleScore == 0) return 100;

            // Convert to percentage and ensure it stays within 0-100 range
            return Math.Max(0, Math.Min(100, (totalScore / maxPossibleScore) * 100));
        }
    }
}