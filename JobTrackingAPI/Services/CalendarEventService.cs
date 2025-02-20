using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using JobTrackingAPI.Models;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using JobTrackingAPI.Settings;

namespace JobTrackingAPI.Services
{
    public class CalendarEventService
    {
        private readonly IMongoCollection<CalendarEvent> _events;
        private readonly MongoDbSettings _settings;

        public CalendarEventService(IOptions<MongoDbSettings> settings)
        {
            _settings = settings.Value;
            var client = new MongoClient(_settings.ConnectionString);
            var database = client.GetDatabase(_settings.DatabaseName);
            _events = database.GetCollection<CalendarEvent>(_settings.CalendarEventsCollectionName);

            // Create indexes for better query performance
            var indexKeysDefinition = Builders<CalendarEvent>.IndexKeys.Ascending(e => e.Date);
            var indexOptions = new CreateIndexOptions { Name = "DateIndex" };
            var indexModel = new CreateIndexModel<CalendarEvent>(indexKeysDefinition, indexOptions);
            _events.Indexes.CreateOne(indexModel);
        }

        public async Task<List<CalendarEvent>> GetEventsAsync(string startDate, string endDate)
        {
            try
            {
                // Parse dates to ensure proper comparison
                if (!DateTime.TryParse(startDate, out DateTime start) || !DateTime.TryParse(endDate, out DateTime end))
                {
                    throw new ArgumentException("Invalid date format");
                }

                var filter = Builders<CalendarEvent>.Filter.And(
                    Builders<CalendarEvent>.Filter.Eq(e => e.Date, startDate)
                );

                return await _events.Find(filter).ToListAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetEventsAsync: {ex.Message}");
                throw;
            }
        }

        public async Task<CalendarEvent> GetEventByIdAsync(string id)
        {
            try
            {
                return await _events.Find(e => e.Id == id).FirstOrDefaultAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetEventByIdAsync: {ex.Message}");
                throw;
            }
        }

        public async Task<List<CalendarEvent>> GetEventsByUserIdAsync(string userId)
        {
            try
            {
                var filter = Builders<CalendarEvent>.Filter.Or(
                    Builders<CalendarEvent>.Filter.Eq(e => e.CreatedBy, userId),
                    Builders<CalendarEvent>.Filter.AnyEq(e => e.Participants, userId)
                );

                return await _events.Find(filter).ToListAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetEventsByUserIdAsync: {ex.Message}");
                throw;
            }
        }

        public async Task<CalendarEvent> CreateEventAsync(CalendarEvent calendarEvent)
        {
            try
            {
                // Validate that there are no overlapping events for the same time slot
                var existingEvents = await _events.Find(e =>
                    e.Date == calendarEvent.Date &&
                    e.StartTime == calendarEvent.StartTime &&
                    e.EndTime == calendarEvent.EndTime)
                    .ToListAsync();

                if (existingEvents.Any())
                {
                    throw new InvalidOperationException("An event already exists for this time slot.");
                }

                calendarEvent.CreatedAt = DateTime.UtcNow;
                calendarEvent.UpdatedAt = DateTime.UtcNow;
                await _events.InsertOneAsync(calendarEvent);
                return calendarEvent;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in CreateEventAsync: {ex.Message}");
                throw;
            }
        }

        public async Task UpdateEventAsync(string id, CalendarEvent calendarEvent)
        {
            try
            {
                calendarEvent.UpdatedAt = DateTime.UtcNow;
                await _events.ReplaceOneAsync(e => e.Id == id, calendarEvent);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in UpdateEventAsync: {ex.Message}");
                throw;
            }
        }

        public async Task DeleteEventAsync(string id)
        {
            try
            {
                await _events.DeleteOneAsync(e => e.Id == id);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in DeleteEventAsync: {ex.Message}");
                throw;
            }
        }
    }
}
