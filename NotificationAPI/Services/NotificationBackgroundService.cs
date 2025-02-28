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
        private IConnection _rabbitConnection;
        private IModel _channel;
        private bool _isConnected = false;
        private int _retryCount = 0;
        private const int MaxRetryCount = 10;
        private readonly AsyncRetryPolicy _retryPolicy;
        private readonly SemaphoreSlim _connectionLock = new SemaphoreSlim(1, 1);

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
            _consumerChannels = new List<IModel>();
            
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

                        _rabbitConnection = factory.CreateConnection();
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
        private void RabbitMQ_ConnectionShutdown(object sender, ShutdownEventArgs e)
        {
            _logger.LogWarning("RabbitMQ bağlantısı kapandı: {Reason}", e.ReplyText);
            _isConnected = false;
            
            // Bağlantı kapandığında yeniden bağlanmayı dene
            Task.Run(async () =>
            {
                await Task.Delay(5000); // Kısa bir bekleme süresi
                await TryConnectAsync();
            });
        }

        /// <summary>
        /// Arka plan servisi çalıştırma metodu
        /// </summary>
        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            // RabbitMQ'ya bağlanana kadar denemeye devam et
            if (!await TryConnectAsync())
            {
                _logger.LogError("RabbitMQ bağlantısı kurulamadı. Servis başlatılamıyor.");
                return;
            }

            try
            {
                // Birden fazla consumer oluştur
                for (int i = 0; i < _rabbitSettings.ConcurrentConsumers; i++)
                {
                    await StartConsumerAsync(i, stoppingToken);
                }

                // Servis çalışırken bağlantı durumunu kontrol et
                while (!stoppingToken.IsCancellationRequested)
                {
                    if (!_isConnected)
                    {
                        _logger.LogWarning("RabbitMQ bağlantısı koptu. Yeniden bağlanmaya çalışılıyor...");
                        if (await TryConnectAsync())
                        {
                            // Yeniden bağlantı başarılı olduğunda tüm consumer'ları yeniden başlat
                            for (int i = 0; i < _rabbitSettings.ConcurrentConsumers; i++)
                            {
                                await StartConsumerAsync(i, stoppingToken);
                            }
                        }
                    }
                    
                    await Task.Delay(30000, stoppingToken); // 30 saniyede bir kontrol et
                }
            }
            catch (OperationCanceledException)
            {
                // Servis durdurulduğunda normal bir durum
                _logger.LogInformation("Notification Background Service durduruldu.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "NotificationBackgroundService'de beklenmeyen bir hata oluştu");
            }
        }
        
        /// <summary>
        /// Belirtilen indekste yeni bir consumer başlatır
        /// </summary>
        private async Task StartConsumerAsync(int index, CancellationToken stoppingToken)
        {
            try
            {
                // Önceki channel varsa kapat
                if (_consumerChannels.Count > index && _consumerChannels[index]?.IsOpen == true)
                {
                    _consumerChannels[index].Close();
                    _consumerChannels[index].Dispose();
                    _consumerChannels[index] = null;
                }
                
                if (!_isConnected)
                {
                    await TryConnectAsync();
                }
                
                if (!_isConnected)
                {
                    return;
                }
                
                var consumerChannel = _rabbitConnection.CreateModel();
                
                // Mevcut listeyi güncelle
                if (_consumerChannels.Count > index)
                {
                    _consumerChannels[index] = consumerChannel;
                }
                else
                {
                    _consumerChannels.Add(consumerChannel);
                }
                
                // QoS ayarları
                consumerChannel.BasicQos(0, (ushort)_rabbitSettings.BatchSize, false);
                
                _logger.LogInformation("Consumer {Index} başlatılıyor...", index);

                var consumer = new AsyncEventingBasicConsumer(consumerChannel);
                consumer.Received += async (model, ea) =>
                {
                    try
                    {
                        var body = ea.Body.ToArray();
                        var message = Encoding.UTF8.GetString(body);
                        var notifications = JsonSerializer.Deserialize<List<Notification>>(message);

                        if (notifications != null && notifications.Any())
                        {
                            _logger.LogInformation("Consumer {Index}: {Count} adet bildirim alındı", index, notifications.Count);
                            await ProcessNotificationBatchAsync(notifications);
                            consumerChannel.BasicAck(ea.DeliveryTag, false);
                            _logger.LogInformation("Consumer {Index}: Bildirimler başarıyla işlendi", index);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Consumer {Index}: Bildirim işlenirken hata oluştu", index);
                        consumerChannel.BasicNack(ea.DeliveryTag, false, true);
                    }
                };

                consumerChannel.BasicConsume(
                    queue: _rabbitSettings.NotificationQueueName,
                    autoAck: false,
                    consumer: consumer);
                    
                _logger.LogInformation("Consumer {Index} başarıyla başlatıldı", index);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Consumer {Index} başlatılırken hata oluştu", index);
            }
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
    }
}
