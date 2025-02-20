namespace JobTrackingAPI.Settings
{
    public class MongoDbSettings
    {
        public string ConnectionString { get; set; } = string.Empty;
        public string DatabaseName { get; set; } = string.Empty;
        public string JobsCollectionName { get; set; } = string.Empty;
        public string UsersCollectionName { get; set; } = string.Empty;
        public string CalendarEventsCollectionName { get; set; } = "CalendarEvents";
    }
}
