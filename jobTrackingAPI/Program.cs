using JobTrackingAPI.Settings;
using JobTrackingAPI.Services;
using JobTrackingAPI.Extensions;

var builder = WebApplication.CreateBuilder(args);

// Add MongoDB services
builder.Services.AddMongoDb(builder.Configuration);

// Add services to the container
builder.Services.AddSingleton<JobService>();
builder.Services.AddSingleton<UserService>();

// Configure HTTPS Redirection
builder.Services.AddHttpsRedirection(options =>
{
    options.HttpsPort = 7126; // launchSettings.json'daki HTTPS portu
});

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();


// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        builder => builder
            .WithOrigins("http://localhost:3000")
            .AllowAnyMethod()
            .AllowAnyHeader());
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Use CORS
app.UseCors("AllowReactApp");

app.UseAuthorization();

app.MapControllers();

app.Run();
