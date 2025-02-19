namespace JobTrackingAPI.Settings
{
    public class MongoDbSettings
    {
        public string ConnectionString { get; set; }
        public string DatabaseName { get; set; }
        public string JobsCollectionName { get; set; }
        public string UsersCollectionName { get; set; }
    }
}
