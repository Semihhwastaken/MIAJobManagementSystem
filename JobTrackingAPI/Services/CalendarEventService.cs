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
            var indexKeysDefinition = Builders<CalendarEvent>.IndexKeys.Combine(
                Builders<CalendarEvent>.IndexKeys.Ascending(e => e.StartDate),
                Builders<CalendarEvent>.IndexKeys.Ascending(e => e.EndDate)
            );
            var indexOptions = new CreateIndexOptions { Name = "StartEndDateIndex" };
            var indexModel = new CreateIndexModel<CalendarEvent>(indexKeysDefinition, indexOptions);
            _events.Indexes.CreateOne(indexModel);
        }

        private DateTime CombineDateAndTime(string date, string time)
        {
            if (!DateTime.TryParse(date, out DateTime dateValue))
                throw new ArgumentException("Invalid date format");
            
            if (!TimeSpan.TryParse(time, out TimeSpan timeValue))
                throw new ArgumentException("Invalid time format");

            return dateValue.Date.Add(timeValue);
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
                    Builders<CalendarEvent>.Filter.Lte(e => e.StartDate, endDate),
                    Builders<CalendarEvent>.Filter.Gte(e => e.EndDate, startDate)
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
                // Convert event times to DateTime for comparison
                var newEventStart = CombineDateAndTime(calendarEvent.StartDate, calendarEvent.StartTime);
                var newEventEnd = CombineDateAndTime(calendarEvent.StartDate, calendarEvent.EndTime);

                // Basic validation
                if (newEventEnd <= newEventStart)
                {
                    throw new InvalidOperationException("Event end time must be after start time.");
                }

                // Set default category if not provided
                if (string.IsNullOrEmpty(calendarEvent.Category))
                {
                    calendarEvent.Category = "task";
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

        public async Task<CalendarEvent> UpdateEventAsync(string id, CalendarEvent calendarEvent)
        {
            try
            {
                // Convert event times to DateTime for comparison
                var newEventStart = CombineDateAndTime(calendarEvent.StartDate, calendarEvent.StartTime);
                var newEventEnd = CombineDateAndTime(calendarEvent.StartDate, calendarEvent.EndTime);

                // Basic validation
                if (newEventEnd <= newEventStart)
                {
                    throw new InvalidOperationException("Event end time must be after start time.");
                }

                calendarEvent.UpdatedAt = DateTime.UtcNow;
                await _events.ReplaceOneAsync(e => e.Id == id, calendarEvent);
                return calendarEvent;
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

        public async Task<List<CalendarEvent>> GetTeamMemberEventsAsync(List<string> memberEmails)
        {
            try
            {
                var filter = Builders<CalendarEvent>.Filter.AnyIn(e => e.Participants, memberEmails);
                return await _events.Find(filter).ToListAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetTeamMemberEventsAsync: {ex.Message}");
                throw;
            }
        }

        public async Task<List<CalendarEvent>> GetEventsByTeamIdAsync(string teamId, string startDate = null, string endDate = null)
        {
            try
            {
                var filterBuilder = Builders<CalendarEvent>.Filter;
                var filter = filterBuilder.Eq(e => e.TeamId, teamId);

                // Eğer tarih aralığı belirtilmişse, filtreye ekle
                if (!string.IsNullOrEmpty(startDate) && !string.IsNullOrEmpty(endDate))
                {
                    if (!DateTime.TryParse(startDate, out DateTime start) || !DateTime.TryParse(endDate, out DateTime end))
                    {
                        throw new ArgumentException("Invalid date format");
                    }

                    filter = filterBuilder.And(
                        filter,
                        filterBuilder.Lte(e => e.StartDate, endDate),
                        filterBuilder.Gte(e => e.EndDate, startDate)
                    );
                }

                return await _events.Find(filter).ToListAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetEventsByTeamIdAsync: {ex.Message}");
                throw;
            }
        }
    }
}
