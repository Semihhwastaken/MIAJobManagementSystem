using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace JobTrackingAPI.Models
{
    public class PerformanceScore
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        [BsonRequired]
        [BsonRepresentation(BsonType.ObjectId)]
        public string UserId { get; set; } = string.Empty;

        [BsonRequired]
        [BsonRepresentation(BsonType.ObjectId)]
        public string TeamId { get; set; } = string.Empty;

        public double Score { get; set; } = 100;

        public int CompletedTasksCount { get; set; }
        public int OverdueTasksCount { get; set; }
        public int TotalTasksAssigned { get; set; }

        public DateTime LastUpdated { get; set; }
        
        public List<ScoreHistory> History { get; set; } = new List<ScoreHistory>();

        // Performans detayları
        public PerformanceMetrics Metrics { get; set; } = new PerformanceMetrics();
    }

    public class ScoreHistory
    {
        public DateTime Date { get; set; }
        public double ScoreChange { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string TaskId { get; set; } = string.Empty;
        public string TaskTitle { get; set; } = string.Empty;
        public string TeamId { get; set; } = string.Empty;
        public string ActionType { get; set; } = string.Empty; // "completion", "overdue", "early_completion" gibi
    }

    public class PerformanceMetrics
    {
        public double AverageCompletionTime { get; set; } // Görevlerin ortalama tamamlanma süresi (gün)
        public double EarlyCompletionRate { get; set; } // Erken tamamlanan görevlerin oranı
        public double OnTimeCompletionRate { get; set; } // Zamanında tamamlanan görevlerin oranı
        public double OverdueRate { get; set; } // Geciken görevlerin oranı

        public TaskPriorityMetrics PriorityMetrics { get; set; } = new TaskPriorityMetrics();
        public CategoryMetrics CategoryPerformance { get; set; } = new CategoryMetrics();
        
        public MonthlyPerformance CurrentMonthPerformance { get; set; } = new MonthlyPerformance();
        public List<MonthlyPerformance> MonthlyHistory { get; set; } = new List<MonthlyPerformance>();
    }

    public class TaskPriorityMetrics
    {
        public PriorityStats High { get; set; } = new PriorityStats();
        public PriorityStats Medium { get; set; } = new PriorityStats();
        public PriorityStats Low { get; set; } = new PriorityStats();
    }

    public class PriorityStats
    {
        public int TotalTasks { get; set; }
        public int CompletedTasks { get; set; }
        public int OverdueTasks { get; set; }
        public double AverageCompletionTime { get; set; }
    }

    public class CategoryMetrics
    {
        public Dictionary<string, CategoryStats> Categories { get; set; } = new Dictionary<string, CategoryStats>();
    }

    public class CategoryStats
    {
        public int TotalTasks { get; set; }
        public int CompletedTasks { get; set; }
        public int OverdueTasks { get; set; }
        public double SuccessRate { get; set; }
    }

    public class MonthlyPerformance
    {
        public int Year { get; set; }
        public int Month { get; set; }
        public double AverageScore { get; set; }
        public int CompletedTasks { get; set; }
        public int OverdueTasks { get; set; }
        public double ProductivityTrend { get; set; } // Önceki aya göre değişim yüzdesi
    }
}