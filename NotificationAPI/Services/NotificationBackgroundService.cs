using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using RabbitMQ.Client.Exceptions;
using NotificationAPI.Models;
using NotificationAPI.Settings;
using Microsoft.AspNetCore.SignalR;
using NotificationAPI.Hubs;
using Polly;
using Polly.Retry;
using System.Net.Sockets;

namespace NotificationAPI.Services
{
    /// <summary>
    /// RabbitMQ'dan bildirimleri dinleyen ve işleyen arka plan servisi
    /// </summary>
    public class NotificationBackgroundService : BackgroundService
    {
        private readonly RabbitMQSettings _rabbitSettings;
        private readonly IMongoCollection<Notification> _notifications;
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly ILogger<NotificationBackgroundService> _logger;
        private readonly List<IModel> _consumerChannels;
        private IConnection? _rabbitConnection;
        private IModel? _channel;
        private bool _isConnected = false;
        private int _retryCount = 0;
        private const int MaxRetryCount = 10;
        private readonly AsyncRetryPolicy _retryPolicy;
        private readonly SemaphoreSlim _connectionLock = new SemaphoreSlim(1, 1); private readonly ConnectionFactory _connectionFactory;
        private readonly int _workerCount = 2; // Reduced from 4 to 2 workers per instance
        private readonly List<IModel> _channels = new();
        private IConnection? _connection;
        private readonly string _instanceId = Guid.NewGuid().ToString().Substring(0, 8); // Unique instance ID

        /// <summary>
        /// NotificationBackgroundService yapıcı metodu
        /// </summary>
        public NotificationBackgroundService(
            IOptions<RabbitMQSettings> rabbitSettings,
            IMongoDatabase database,
            IHubContext<NotificationHub> hubContext,
            ILogger<NotificationBackgroundService> logger)
        {
            _rabbitSettings = rabbitSettings.Value;
            _notifications = database.GetCollection<Notification>("Notifications");
            _hubContext = hubContext;
            _logger = logger;
            _consumerChannels = new List<IModel>();            // RabbitMQ bağlantı fabrikası - tüm parametrelerle oluştur
            _connectionFactory = new ConnectionFactory
            {
                HostName = _rabbitSettings.HostName,
                UserName = _rabbitSettings.UserName,
                Password = _rabbitSettings.Password,
                Port = _rabbitSettings.Port,
                DispatchConsumersAsync = true,
                RequestedHeartbeat = TimeSpan.FromSeconds(_rabbitSettings.HeartbeatInSeconds),
                AutomaticRecoveryEnabled = _rabbitSettings.AutoRecoveryEnabled,
                NetworkRecoveryInterval = TimeSpan.FromSeconds(_rabbitSettings.NetworkRecoveryIntervalInSeconds)
            };

            // Yeniden deneme politikası oluştur
            _retryPolicy = Policy
                .Handle<BrokerUnreachableException>()
                .Or<SocketException>()
                .Or<AlreadyClosedException>()
                .Or<ConnectFailureException>()
                .WaitAndRetryAsync(
                    retryCount: 5,
                    sleepDurationProvider: retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
                    onRetry: (ex, time, retryCount, context) =>
                    {
                        _logger.LogWarning(ex, "RabbitMQ bağlantısı başarısız oldu. {RetryCount}. deneme, {Seconds} saniye sonra tekrar denenecek.",
                            retryCount, time.TotalSeconds);
                    });
        }

        /// <summary>
        /// RabbitMQ'ya bağlanmayı dener
        /// </summary>
        private async Task<bool> TryConnectAsync()
        {
            // Eş zamanlı bağlantı denemelerini önlemek için kilit mekanizması
            await _connectionLock.WaitAsync();

            try
            {
                if (_isConnected)
                {
                    return true;
                }

                _logger.LogInformation("RabbitMQ bağlantısı kuruluyor... Deneme: {RetryCount}", _retryCount + 1);

                return await _retryPolicy.ExecuteAsync(async () =>
                {
                    try
                    {
                        var factory = new ConnectionFactory
                        {
                            HostName = _rabbitSettings.HostName,
                            UserName = _rabbitSettings.UserName,
                            Password = _rabbitSettings.Password,
                            Port = _rabbitSettings.Port,
                            DispatchConsumersAsync = true,
                            RequestedHeartbeat = TimeSpan.FromSeconds(60),
                            AutomaticRecoveryEnabled = true,
                            NetworkRecoveryInterval = TimeSpan.FromSeconds(10)
                        };

                        _rabbitConnection = await Task.Run(() => factory.CreateConnection());
                        _rabbitConnection.ConnectionShutdown += RabbitMQ_ConnectionShutdown;

                        _channel = _rabbitConnection.CreateModel();

                        _channel.QueueDeclare(
                            queue: _rabbitSettings.NotificationQueueName,
                            durable: true,
                            exclusive: false,
                            autoDelete: false,
                            arguments: null);

                        // Prefetch size ayarı
                        _channel.BasicQos(
                            prefetchSize: 0,
                            prefetchCount: (ushort)_rabbitSettings.BatchSize,
                            global: false);

                        _isConnected = true;
                        _retryCount = 0;
                        _logger.LogInformation("RabbitMQ bağlantısı başarıyla kuruldu");
                        return true;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "RabbitMQ bağlantısı kurulamadı. Deneme: {RetryCount}", _retryCount + 1);

                        _retryCount++;

                        if (_retryCount >= MaxRetryCount)
                        {
                            _logger.LogCritical("Maksimum deneme sayısına ulaşıldı. RabbitMQ bağlantısı kurulamadı.");
                            return false;
                        }

                        throw; // Retry politikasının yeniden denemesi için hatayı fırlat
                    }
                });
            }
            finally
            {
                _connectionLock.Release();
            }
        }

        /// <summary>
        /// RabbitMQ bağlantısı kapandığında tetiklenen olay
        /// </summary>
        private void RabbitMQ_ConnectionShutdown(object? sender, ShutdownEventArgs e)
        {
            _logger.LogWarning("RabbitMQ bağlantısı kapandı: {Reason}", e.ReplyText);
            _isConnected = false;

            // Bağlantı kapandığında yeniden bağlanmayı dene
            Task.Run(async () =>
            {
                await Task.Delay(5000); // Kısa bir bekleme süresi
                await TryConnectAsync();
            });
        }        /// <summary>
                 /// Arka plan servisi çalıştırma metodu
                 /// </summary>
        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("NotificationBackgroundService başlatılıyor...");

            // RabbitMQ etkin mi kontrol et
            if (!_rabbitSettings.Enabled)
            {
                _logger.LogInformation("RabbitMQ devre dışı bırakıldı. Servis yalnızca HTTP endpoint'leri üzerinden çalışacak.");
                
                // RabbitMQ olmadan çalışmaya devam et
                while (!stoppingToken.IsCancellationRequested)
                {
                    await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
                }
                return;
            }

            _logger.LogInformation("NotificationBackgroundService RabbitMQ'ya bağlanmaya hazırlanıyor...");

            // Daha kısa bir başlangıç gecikmesi
            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);

            // Environment değişkenlerini kontrol et
            string envHostName = Environment.GetEnvironmentVariable("RabbitMQ__HostName") ?? _rabbitSettings.HostName;
            string envUserName = Environment.GetEnvironmentVariable("RabbitMQ__UserName") ?? _rabbitSettings.UserName;
            string envPassword = Environment.GetEnvironmentVariable("RabbitMQ__Password") ?? _rabbitSettings.Password;

            _logger.LogInformation("RabbitMQ yapılandırması: HostName={Host}, Port={Port}, UserName={UserName}, EnvUserName={EnvUserName}",
                _rabbitSettings.HostName, _rabbitSettings.Port, _rabbitSettings.UserName, envUserName); bool connected = false;
            int attempts = 0;
            int maxAttempts = 5; // Reduced maximum attempts

            // Daha basit ve doğrudan bağlantı stratejisi
            while (!connected && attempts < maxAttempts && !stoppingToken.IsCancellationRequested)
            {
                try
                {
                    attempts++;
                    _logger.LogInformation("RabbitMQ bağlantısı deneniyor. Deneme: {AttemptCount}/{MaxAttempts}",
                        attempts, maxAttempts);

                    // RabbitMQ'ya yapılandırma ayarları ile bağlanmayı dene
                    await _retryPolicy.ExecuteAsync(async () =>
                    {
                        try
                        {
                            // Önce yapılandırma dosyasındaki ayarları kullan
                            _logger.LogInformation("RabbitMQ'ya yapılandırma ayarları ile bağlanmaya çalışılıyor: Host={Host}, User={User}", 
                                _rabbitSettings.HostName, _rabbitSettings.UserName);
                            
                            _connectionFactory.HostName = _rabbitSettings.HostName;
                            _connectionFactory.UserName = _rabbitSettings.UserName;
                            _connectionFactory.Password = _rabbitSettings.Password;
                            _connectionFactory.Port = _rabbitSettings.Port;

                            _connection = await Task.Run(() => _connectionFactory.CreateConnection(
                                $"notification-api-{_instanceId}-{DateTime.UtcNow.Ticks}"),
                                new CancellationTokenSource(TimeSpan.FromSeconds(10)).Token);

                            _logger.LogInformation("RabbitMQ bağlantısı yapılandırma ayarları ile başarıyla kuruldu!");
                            connected = true;
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "RabbitMQ bağlantısı kurulamadı. Host: {Host}, Port: {Port}, User: {User}", 
                                _rabbitSettings.HostName, _rabbitSettings.Port, _rabbitSettings.UserName);
                            throw; // Retry politikasının tekrar denemesi için hatayı fırlat
                        }
                    });
                }
                catch (Exception ex)
                {
                    // Retry policy başarısız olduysa, daha uzun bir süre bekleyip tekrar deneyelim
                    _logger.LogError(ex, "Tüm retry denemeleri başarısız oldu. {WaitSeconds} saniye beklendikten sonra tekrar denenecek.",
                        attempts * 5);

                    // Artan bekleme süresi - her deneme başarısız olduğunda daha uzun bekle
                    await Task.Delay(TimeSpan.FromSeconds(attempts * 5), stoppingToken);
                }
            }

            if (_connection == null || !_connection.IsOpen)
            {
                _logger.LogWarning("RabbitMQ bağlantısı kurulamadı. Servis RabbitMQ olmadan çalışmaya devam edecek.");
                _logger.LogInformation("NotificationAPI, doğrudan HTTP endpoint'leri üzerinden çalışacak.");
            }
            else
            {
                // Başarılı bağlantı sonrası tüketici kanalları oluştur
                var tasks = new List<Task>();
                for (int i = 0; i < _workerCount; i++)
                {
                    var channel = _connection.CreateModel();
                    channel.BasicQos(0, 50, false); // Prefetch count per consumer
                    _channels.Add(channel);

                    _logger.LogInformation("{Index}. kanal oluşturuldu", i + 1);
                    tasks.Add(StartConsumerAsync(channel, stoppingToken));
                }

                // RabbitMQ tüketicilerini başlat ve devam et
                _ = Task.WhenAll(tasks).ContinueWith(t =>
                {
                    if (t.IsFaulted)
                    {
                        _logger.LogError(t.Exception, "RabbitMQ tüketicileri başlatılırken hata oluştu");
                    }
                    else
                    {
                        _logger.LogInformation("Tüm RabbitMQ tüketicileri başarıyla başlatıldı");
                    }
                }, TaskContinuationOptions.ExecuteSynchronously);
            }

            // Eğer bağlantı kurulamazsa veya tüketiciler çalışmazsa, uygulama çalışmaya devam etsin
            // Periyodik olarak tekrar bağlanmayı deneyecek bir timer ekleyelim
            using var timer = new PeriodicTimer(TimeSpan.FromMinutes(5));
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                if (_connection == null || !_connection.IsOpen)
                {
                    _logger.LogWarning("RabbitMQ bağlantısı kapalı veya hiç kurulamamış. Yeniden bağlanmayı deniyorum...");
                    await TryConnectAsync();
                }
            }
        }

        private async Task StartConsumerAsync(IModel channel, CancellationToken stoppingToken)
        {
            try
            {
                _logger.LogInformation("Starting consumer for instance {InstanceId}", _instanceId);

                // Configure queue with proper settings - use passive declare to avoid conflicts
                try
                {
                    // First try to declare passively (check if exists)
                    channel.QueueDeclarePassive("notifications");
                    _logger.LogInformation("Queue 'notifications' already exists, using existing queue");
                }
                catch (Exception)
                {
                    // If it doesn't exist, create it with our settings
                    _logger.LogInformation("Queue 'notifications' doesn't exist, creating it");
                    channel.QueueDeclare("notifications",
                        durable: true,
                        exclusive: false,
                        autoDelete: false,
                        arguments: new Dictionary<string, object>
                        {
                            {"x-message-ttl", 60000}, // 1 minute TTL
                            {"x-max-length", 10000}, // Max queue length
                            {"x-overflow", "reject-publish"} // Reject new messages when full
                        });
                }

                var consumer = new AsyncEventingBasicConsumer(channel);
                consumer.Received += async (model, ea) =>
                {
                    try
                    {
                        // Process message
                        await ProcessMessageAsync(ea.Body.ToArray());
                        channel.BasicAck(ea.DeliveryTag, false);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error processing message");
                        channel.BasicNack(ea.DeliveryTag, false, true);
                    }
                };

                // Use instance ID in consumer tag to make it unique
                string consumerTag = $"consumer_{_instanceId}_{Guid.NewGuid().ToString().Substring(0, 4)}";

                channel.BasicConsume(
                    queue: "notifications",
                    autoAck: false,
                    consumerTag: consumerTag,
                    consumer: consumer);

                _logger.LogInformation("Consumer {ConsumerTag} started successfully", consumerTag);

                // Wait until cancellation is requested
                while (!stoppingToken.IsCancellationRequested)
                {
                    await Task.Delay(1000, stoppingToken);
                }
            }
            catch (OperationCanceledException)
            {
                // This is expected when the token is canceled
                _logger.LogInformation("Consumer was canceled through token");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in consumer");
            }
        }

        public override async Task StopAsync(CancellationToken cancellationToken)
        {
            foreach (var channel in _channels)
            {
                channel.Close();
                channel.Dispose();
            }

            if (_connection != null && _connection.IsOpen)
            {
                _connection.Close();
                _connection.Dispose();
            }

            await base.StopAsync(cancellationToken);
        }

        /// <summary>
        /// Bildirim grubunu işler
        /// </summary>
        private async Task ProcessNotificationBatchAsync(List<Notification> notifications)
        {
            try
            {
                // MongoDB'ye toplu ekleme
                if (notifications.Any())
                {
                    await _notifications.InsertManyAsync(notifications);
                }

                // SignalR ile bildirimleri gruplandırarak gönder
                var notificationGroups = notifications.GroupBy(n => n.UserId);
                foreach (var group in notificationGroups)
                {
                    await _hubContext.Clients.Group(group.Key)
                        .SendAsync("ReceiveNotifications", group.ToList());
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Bildirim grubu işlenirken hata oluştu. Bildirim sayısı: {Count}", notifications.Count);
                throw;
            }
        }

        /// <summary>
        /// Servis sonlandırıldığında kaynakları temizle
        /// </summary>
        public override void Dispose()
        {
            try
            {
                foreach (var channel in _consumerChannels)
                {
                    if (channel?.IsOpen == true)
                    {
                        channel.Close();
                        channel.Dispose();
                    }
                }

                if (_channel?.IsOpen == true)
                {
                    _channel.Close();
                    _channel.Dispose();
                }

                if (_rabbitConnection?.IsOpen == true)
                {
                    _rabbitConnection.Close();
                    _rabbitConnection.Dispose();
                }

                _connectionLock.Dispose();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Servis kaynakları temizlenirken hata oluştu");
            }

            base.Dispose();
        }
        /// <summary>
        /// Process a single message from RabbitMQ
        /// </summary>
        private async Task ProcessMessageAsync(byte[] messageBody)
        {
            try
            {
                var message = Encoding.UTF8.GetString(messageBody);
                var notification = JsonSerializer.Deserialize<Notification>(message);

                if (notification != null)
                {
                    await ProcessNotificationBatchAsync(new List<Notification> { notification });
                    _logger.LogInformation("Notification processed successfully for user: {UserId}", notification.UserId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing message");
                throw;
            }
        }
    }
}
