using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using JobTrackingAPI.Models;
using JobTrackingAPI.Settings;
using Microsoft.Extensions.Options;

namespace JobTrackingAPI.Services
{
    public class OverdueTasksService : IHostedService, IDisposable
    {
        private Timer? _timer;
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<OverdueTasksService> _logger;

        public OverdueTasksService(
            IServiceProvider serviceProvider,
            ILogger<OverdueTasksService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        public Task StartAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("Overdue Tasks Service başlatıldı.");

            // İlk çalıştırmada hemen kontrol et
            DoWork(null);

            // Her gün saat 00:00'da çalışacak şekilde ayarla
            var now = DateTime.UtcNow;
            var nextRun = now.Date.AddDays(1); // Yarının başlangıcı
            var firstDelay = nextRun - now; // İlk çalışmaya kadar beklenecek süre

            _timer = new Timer(DoWork, null, firstDelay, TimeSpan.FromDays(1));

            return Task.CompletedTask;
        }

        private async void DoWork(object? state)
        {
            using (var scope = _serviceProvider.CreateScope())
            {
                try
                {
                    var mongoClient = scope.ServiceProvider.GetRequiredService<IMongoClient>();
                    var settings = scope.ServiceProvider.GetRequiredService<IOptions<MongoDbSettings>>().Value;
                    var database = mongoClient.GetDatabase(settings.DatabaseName);
                    var tasksCollection = database.GetCollection<TaskItem>("Tasks");

                    var currentDate = DateTime.UtcNow;
                    
                    // Süresi geçmiş ve tamamlanmamış görevleri bul
                    var filter = Builders<TaskItem>.Filter.And(
                        Builders<TaskItem>.Filter.Lt(t => t.DueDate, currentDate),
                        Builders<TaskItem>.Filter.Ne(t => t.Status, "completed"),
                        Builders<TaskItem>.Filter.Ne(t => t.Status, "overdue")
                    );

                    var update = Builders<TaskItem>.Update
                        .Set(t => t.Status, "overdue")
                        .Set(t => t.UpdatedAt, currentDate);

                    var result = await tasksCollection.UpdateManyAsync(filter, update);

                    _logger.LogInformation($"Overdue kontrolü tamamlandı. {result.ModifiedCount} görev overdue olarak işaretlendi. Kontrol zamanı: {currentDate}");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Overdue kontrolü sırasında hata oluştu");
                }
            }
        }

        public Task StopAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("Overdue Tasks Service durduruldu.");

            _timer?.Change(Timeout.Infinite, 0);

            return Task.CompletedTask;
        }

        public void Dispose()
        {
            _timer?.Dispose();
        }
    }
} 