namespace NotificationAPI.Settings
{
    public class RabbitMQSettings
    {
        public string HostName { get; set; } = Environment.GetEnvironmentVariable("RabbitMQ__Host") ?? "localhost";
        public string UserName { get; set; } = Environment.GetEnvironmentVariable("RabbitMQ__Username") ?? "guest";
        public string Password { get; set; } = Environment.GetEnvironmentVariable("RabbitMQ__Password") ?? "guest";
        public string VirtualHost { get; set; } = Environment.GetEnvironmentVariable("RabbitMQ__VirtualHost") ?? "/";
        
        public string NotificationQueueName { get; set; } = "notification_queue";
        public int Port { get; set; } = 5672;
        public int BatchSize { get; set; } = 1000;
        public int ConcurrentConsumers { get; set; } = 5;
        
        // SSL ayarları
        public SslSettings? Ssl { get; set; } = new SslSettings();
        
        // Bağlantı yönetimi ayarları
        public int HeartbeatInSeconds { get; set; } = 60;
        public bool AutoRecoveryEnabled { get; set; } = true;
        public int NetworkRecoveryIntervalInSeconds { get; set; } = 10;
        public int RetryWaitInSeconds { get; set; } = 15;
        public int MaxRetryAttempts { get; set; } = 10;
        public bool RetryEnabled { get; set; } = true;
    }
    
    public class SslSettings
    {
        public bool Enabled { get; set; } = false;
    }
}
