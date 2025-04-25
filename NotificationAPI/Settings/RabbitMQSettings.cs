namespace NotificationAPI.Settings
{
    public class RabbitMQSettings
    {
        public string HostName { get; set; } = "localhost";
        public string UserName { get; set; } = "guest";
        public string Password { get; set; } = "guest";
        public string NotificationQueueName { get; set; } = "notification_queue";
        public int Port { get; set; } = 5672;
        public int BatchSize { get; set; } = 1000;
        public int ConcurrentConsumers { get; set; } = 5;
        public bool RetryEnabled { get; set; } = true;
        public int MaxRetryAttempts { get; set; } = 5;
        public int RetryWaitInSeconds { get; set; } = 10;
        public int HeartbeatInSeconds { get; set; } = 60;
        public bool AutoRecoveryEnabled { get; set; } = true;
        public int NetworkRecoveryIntervalInSeconds { get; set; } = 10;
    }
}
