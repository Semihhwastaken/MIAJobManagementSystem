namespace NotificationAPI.Settings
{
    public class RabbitMQSettings
    {
        public string HostName { get; set; } = "amqps://gxbzryiu:ljV6XHPTqib7u7bdHJC8U3WVd9mj1BCh@leopard.lmq.cloudamqp.com/gxbzryiu";
        public string UserName { get; set; } = "guest";
        public string Password { get; set; } = "guest";
        public string NotificationQueueName { get; set; } = "notification_queue";
        public int Port { get; set; } = 5672;
        public int BatchSize { get; set; } = 1000;
        public int ConcurrentConsumers { get; set; } = 5;
    }
}
