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

        public static double CalculateTaskScore(TaskItem task)
        {
            if (task == null) return 0;

            int basePriority = PRIORITY_SCORES[task.Priority.ToLower()];
            int assignedUsersCount = task.AssignedUsers?.Count ?? 1;

            if (task.Status == "completed")
            {
                var completedDate = task.CompletedDate;
                var dueDate = DateTime.Parse(task.DueDate.ToString());
                var timeSpan = dueDate - completedDate;
                var daysDifference = timeSpan?.TotalDays ?? 0;

                double timeBonus = daysDifference > 0
                    ? daysDifference * EARLY_COMPLETION_BONUS
                    : daysDifference * LATE_COMPLETION_PENALTY * -1;

                return (basePriority * (1 + timeBonus)) / assignedUsersCount;
            }
            else if (task.Status == "overdue")
            {
                var currentDate = DateTime.UtcNow;
                var dueDate = DateTime.Parse(task.DueDate.ToString());
                var overdueDays = (currentDate - dueDate).TotalDays;

                if (overdueDays <= 0) return 0;

                return (basePriority * overdueDays * OVERDUE_PENALTY * -1) / assignedUsersCount;
            }

            return 0;
        }

        public static double CalculateUserPerformance(List<TaskItem> userTasks)
        {
            if (userTasks == null || userTasks.Count == 0) return 100; // Default score

            double totalScore = 0;
            double maxPossibleScore = 0;

            foreach (var task in userTasks)
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