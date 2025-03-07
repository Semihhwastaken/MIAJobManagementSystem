namespace JobTrackingAPI.Settings
{
    public class MongoDbSettings
    {
        public string ConnectionString { get; set; } = string.Empty;
        public string DatabaseName { get; set; } = string.Empty;
        public string JobsCollectionName { get; set; } = string.Empty;
        public string UsersCollectionName { get; set; } = string.Empty;
        public string CalendarEventsCollectionName { get; set; } = "CalendarEvents";
        public string BaseUrl { get; set; } = string.Empty;
        public string VerificationCodesCollectionName { get; set; } = string.Empty;
        public string NotificationsCollectionName { get; set; } = "Notifications";
<<<<<<< HEAD

=======
        public string TeamsCollectionName { get; set; } = "Teams";
        public string TasksCollectionName { get; set; } = "Tasks";
        public string PerformanceScoresCollectionName { get; set; } = "PerformanceScores";
>>>>>>> newdb1
    }
}
