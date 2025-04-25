using JobTrackingAPI.Extensions;
using JobTrackingAPI.Services;
using JobTrackingAPI.Settings;
using JobTrackingAPI.Hubs;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using JobTrackingAPI.Filters;
using MongoDB.Driver;
using System.Text;
using System.Security.Claims;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.FileProviders;
using JobTrackingAPI.Interfaces;

namespace JobTrackingAPI
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Configure JSON serialization
            builder.Services.AddControllers()
                .AddJsonOptions(options =>
                {
                    options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
                });            // CORS politikasını ekle - Vercel URL'leri için dinamik yaklaşım
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowFrontend",
                    policy =>
                    {
                        // Tüm Vercel deployment URL'lerini kabul et
                        policy.SetIsOriginAllowed(origin =>
                            origin.EndsWith(".vercel.app") || // Herhangi bir Vercel alt alanını kabul et
                            origin.Contains("localhost") ||  // Yerel geliştirme için
                            origin.EndsWith("miajobmanagement.com") || // Özel alan adı için
                            origin.EndsWith("onrender.com"))  // Render backend URL'leri için
                              .AllowAnyHeader()
                              .AllowAnyMethod()
                              .AllowCredentials();
                    });
            });

            // Configure JWT Authentication
            var jwtSettings = builder.Configuration.GetSection("JwtSettings").Get<JwtSettings>();
            if (jwtSettings == null || string.IsNullOrEmpty(jwtSettings.Secret))
            {
                throw new InvalidOperationException("JWT settings are not properly configured");
            }

            builder.Services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Secret)),
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ValidateLifetime = true,
                    RoleClaimType = ClaimTypes.Role, // Add this line
                    ClockSkew = TimeSpan.Zero
                };

                // SignalR için JWT ayarları
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        var accessToken = context.Request.Query["access_token"];
                        var path = context.HttpContext.Request.Path;

                        if (!string.IsNullOrEmpty(accessToken) &&
                            path.StartsWithSegments("/chatHub"))
                        {
                            context.Token = accessToken;
                        }
                        return Task.CompletedTask;
                    }
                };
            });

            // Add MongoDB services
            builder.Services.Configure<MongoDbSettings>(builder.Configuration.GetSection("MongoDbSettings"));
            builder.Services.AddSingleton<IMongoClient>(sp =>
            {
                var settings = sp.GetRequiredService<IOptions<MongoDbSettings>>().Value;
                return new MongoClient(settings.ConnectionString);
            });

            builder.Services.AddScoped<IMongoDatabase>(sp =>
            {
                var client = sp.GetRequiredService<IMongoClient>();
                var settings = sp.GetRequiredService<IOptions<MongoDbSettings>>().Value;
                return client.GetDatabase(settings.DatabaseName);
            });

            // Configure JWT settings
            builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("JwtSettings"));

            // Add EmailService configuration
            builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection("EmailSettings"));

            builder.Services.AddScoped<EmailService>(sp =>
            {
                var emailSettings = sp.GetRequiredService<IOptions<EmailSettings>>().Value;
                return new EmailService(
                    emailSettings.SmtpServer,
                    emailSettings.SmtpPort,
                    emailSettings.SmtpUsername,
                    emailSettings.SmtpPassword
                );
            });

            // Add Stripe settings configuration
            builder.Services.Configure<StripeSettings>(builder.Configuration.GetSection("StripeSettings"));
            builder.Services.AddScoped<IStripeService, StripeService>();

            // Configure Stripe
            Stripe.StripeConfiguration.ApiKey = builder.Configuration["Stripe:SecretKey"];

            // Add Memory Cache
            builder.Services.AddMemoryCache();
            builder.Services.AddDistributedMemoryCache(); // IDistributedCache için in-memory implementasyon

            // Register CacheService
            builder.Services.AddSingleton<CacheService>();

            // Register services
            builder.Services.AddScoped<ITasksService, TasksService>();
            builder.Services.AddScoped<TasksService>(); // TasksService'i doğrudan enjekte edebilmek için
            builder.Services.AddScoped<IUserService, UserService>();
            builder.Services.AddScoped<UserService>(); // Add this line to register concrete UserService
            builder.Services.AddScoped<AuthService>();
            builder.Services.AddScoped<NotificationService>();
            builder.Services.AddScoped<ITeamService, TeamService>();
            builder.Services.AddScoped<TeamService>(); // TeamService'i doğrudan enjekte edebilmek için
            builder.Services.AddScoped<OverdueTasksService>();
            builder.Services.AddScoped<MigrationService>();
            builder.Services.AddScoped<IMessageService, MessageService>();
            builder.Services.AddScoped<IConnectionService, ConnectionService>();
            builder.Services.AddScoped<INotificationService, NotificationService>();
            builder.Services.AddScoped<CalendarEventService>();
            builder.Services.AddScoped<DashboardService>();
            builder.Services.AddSingleton<ISystemMonitoringService, SystemMonitoringService>();
            builder.Services.AddScoped<IFeedbackService, FeedbackService>();
            builder.Services.AddScoped<IActivityService, ActivityService>(); // Add this line to register IActivityService

            // Register background services
            builder.Services.AddHostedService<StatusUpdateBackgroundService>();
            builder.Services.AddHostedService<OverdueTasksService>();

            // Add HttpClient for NotificationService
            builder.Services.AddHttpClient<NotificationService>();

            // Configure Swagger/OpenAPI
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new OpenApiInfo
                {
                    Title = "Job Tracking API",
                    Version = "v1",
                    Description = "API for the Job Tracking Application"
                });

                // JWT Bearer Authentication için
                c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                {
                    Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
                    Name = "Authorization",
                    In = ParameterLocation.Header,
                    Type = SecuritySchemeType.ApiKey,
                    Scheme = "Bearer"
                });

                c.AddSecurityRequirement(new OpenApiSecurityRequirement
                {
                    {
                        new OpenApiSecurityScheme
                        {
                            Reference = new OpenApiReference
                            {
                                Type = ReferenceType.SecurityScheme,
                                Id = "Bearer"
                            }
                        },
                        Array.Empty<string>()
                    }
                });

                // Dosya yükleme için
                c.OperationFilter<FileUploadOperationFilter>();
            });

            // Kestrel ayarı (büyük dosyalar için)
            builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenAnyIP(8080);
});
            {
                options.Limits.MaxRequestBodySize = 100_000_000; // 100 MB
            });

            // Form ayarları
            builder.Services.Configure<FormOptions>(options =>
            {
                options.MultipartBodyLengthLimit = 100_000_000; // 100 MB
            });

            builder.Services.AddSignalR(options =>
            {
                options.MaximumReceiveMessageSize = 102400; // 100KB
                options.EnableDetailedErrors = false;
                options.MaximumParallelInvocationsPerClient = 2;
                options.StreamBufferCapacity = 20;
            });

            var app = builder.Build();

            // MongoDB bağlantı kontrolü
            try
            {
                var mongoClient = app.Services.GetRequiredService<IMongoClient>();
                var mongoSettings = app.Services.GetRequiredService<IOptions<MongoDbSettings>>().Value;

                // Bağlantıyı test et
                mongoClient.ListDatabaseNames().ToList();

                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine($"MongoDB bağlantısı başarılı! Veritabanı: {mongoSettings.DatabaseName}");
                Console.ResetColor();
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"MongoDB bağlantı hatası: {ex.Message}");
                Console.ResetColor();
            }

            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI(c =>
                {
                    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Job Tracking API V1");
                    c.RoutePrefix = "swagger";
                });
            }

            app.UseHttpsRedirection();

            // CORS'u etkinleştir
            app.UseCors("AllowFrontend");

            // Authentication ve Authorization middleware'lerini ekle
            app.UseAuthentication();
            app.UseAuthorization();

            // Add static files middleware
            app.UseStaticFiles();

            app.MapControllers();
            app.MapHub<ChatHub>("/chatHub");

            try
            {
                // Veritabanı migrasyonunu çalıştır
                using (var scope = app.Services.CreateScope())
                {
                    var migrationService = scope.ServiceProvider.GetRequiredService<MigrationService>();
                    await migrationService.MigrateDatabase();
                }
            }
            catch (Exception ex)
            {
                app.Logger.LogError(ex, "Veritabanı migrasyonu sırasında bir hata oluştu");
            }

            // Configure static file serving
            var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
            Directory.CreateDirectory(uploadsPath); // Klasör yoksa oluştur

            app.UseStaticFiles(new StaticFileOptions
            {
                FileProvider = new PhysicalFileProvider(uploadsPath),
                RequestPath = "/uploads"
            });

            await app.RunAsync();
        }
    }
}
