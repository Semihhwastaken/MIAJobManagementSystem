namespace NotificationAPI.Settings
{
    public class MongoDbSettings
    {
        public string ConnectionString { get; set; } = string.Empty;
        public string DatabaseName { get; set; } = string.Empty;
        public string NotificationsCollectionName { get; set; } = "Notifications";
    }
}
