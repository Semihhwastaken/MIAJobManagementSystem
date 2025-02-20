using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using JobTrackingAPI.Models;
using JobTrackingAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace JobTrackingAPI.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/calendar/events")]
    public class CalendarEventsController : ControllerBase
    {
        private readonly CalendarEventService _calendarEventService;
        private readonly ILogger<CalendarEventsController> _logger;

        public CalendarEventsController(
            CalendarEventService calendarEventService,
            ILogger<CalendarEventsController> logger)
        {
            _calendarEventService = calendarEventService;
            _logger = logger;
        }

        /// <summary>
        /// Get events for a specific date range
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<CalendarEvent>>> GetEvents(
            [FromQuery] string startDate,
            [FromQuery] string endDate)
        {
            try
            {
                if (string.IsNullOrEmpty(startDate) || string.IsNullOrEmpty(endDate))
                {
                    return BadRequest(new { error = "Start date and end date are required" });
                }

                // Validate date format
                if (!DateTime.TryParse(startDate, out _) || !DateTime.TryParse(endDate, out _))
                {
                    return BadRequest(new { error = "Invalid date format. Use YYYY-MM-DD format." });
                }

                var events = await _calendarEventService.GetEventsAsync(startDate, endDate);
                return Ok(events);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting events for date range: {StartDate} to {EndDate}", startDate, endDate);
                return StatusCode(500, new { error = "Internal server error", message = "An error occurred while retrieving events." });
            }
        }

        /// <summary>
        /// Get a specific event by ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<CalendarEvent>> GetEvent(string id)
        {
            try
            {
                var calendarEvent = await _calendarEventService.GetEventByIdAsync(id);
                if (calendarEvent == null)
                {
                    return NotFound(new { error = "Event not found" });
                }
                return Ok(calendarEvent);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting event with ID: {EventId}", id);
                return StatusCode(500, new { error = "Internal server error", message = "An error occurred while retrieving the event." });
            }
        }

        /// <summary>
        /// Get events for a specific user
        /// </summary>
        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<CalendarEvent>>> GetUserEvents(string userId)
        {
            try
            {
                var events = await _calendarEventService.GetEventsByUserIdAsync(userId);
                return Ok(events);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting events for user: {UserId}", userId);
                return StatusCode(500, new { error = "Internal server error", message = "An error occurred while retrieving user events." });
            }
        }

        /// <summary>
        /// Create a new calendar event
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<CalendarEvent>> CreateEvent([FromBody] CalendarEvent calendarEvent)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                // Validate and format date
                if (!DateTime.TryParse(calendarEvent.Date, out DateTime eventDate))
                {
                    return BadRequest(new { error = "Invalid date format. Use YYYY-MM-DD format." });
                }
                calendarEvent.Date = eventDate.ToString("yyyy-MM-dd"); // Standardize date format

                // Validate time format and range
                if (!TimeSpan.TryParse(calendarEvent.StartTime, out TimeSpan startTime) ||
                    !TimeSpan.TryParse(calendarEvent.EndTime, out TimeSpan endTime))
                {
                    return BadRequest(new { error = "Invalid time format. Use HH:mm format." });
                }

                // Validate that end time is after start time
                if (endTime <= startTime)
                {
                    return BadRequest(new { error = "End time must be after start time." });
                }

                // Standardize time format
                calendarEvent.StartTime = startTime.ToString(@"hh\:mm");
                calendarEvent.EndTime = endTime.ToString(@"hh\:mm");

                // Set the creator ID from the authenticated user
                var userId = User.Identity?.Name;
                if (string.IsNullOrEmpty(userId))
                {
                    return BadRequest(new { error = "User ID not found" });
                }

                calendarEvent.CreatedBy = userId;
                
                try 
                {
                    var createdEvent = await _calendarEventService.CreateEventAsync(calendarEvent);
                    return CreatedAtAction(nameof(GetEvent), new { id = createdEvent.Id }, createdEvent);
                }
                catch (InvalidOperationException ex)
                {
                    return BadRequest(new { error = ex.Message });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating calendar event");
                return StatusCode(500, new { error = "Internal server error", message = "An error occurred while creating the event." });
            }
        }

        /// <summary>
        /// Update an existing calendar event
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateEvent(string id, [FromBody] CalendarEvent calendarEvent)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                // Validate date format
                if (!DateTime.TryParse(calendarEvent.Date, out _))
                {
                    return BadRequest(new { error = "Invalid date format. Use YYYY-MM-DD format." });
                }

                var existingEvent = await _calendarEventService.GetEventByIdAsync(id);
                if (existingEvent == null)
                {
                    return NotFound(new { error = "Event not found" });
                }

                // Check if the user is the creator of the event
                var userId = User.Identity?.Name;
                if (existingEvent.CreatedBy != userId)
                {
                    return Forbid();
                }

                calendarEvent.Id = id;
                calendarEvent.CreatedBy = existingEvent.CreatedBy;
                calendarEvent.CreatedAt = existingEvent.CreatedAt;
                
                await _calendarEventService.UpdateEventAsync(id, calendarEvent);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating calendar event with ID: {EventId}", id);
                return StatusCode(500, new { error = "Internal server error", message = "An error occurred while updating the event." });
            }
        }

        /// <summary>
        /// Delete a calendar event
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteEvent(string id)
        {
            try
            {
                var existingEvent = await _calendarEventService.GetEventByIdAsync(id);
                if (existingEvent == null)
                {
                    return NotFound(new { error = "Event not found" });
                }

                // Check if the user is the creator of the event
                var userId = User.Identity?.Name;
                if (existingEvent.CreatedBy != userId)
                {
                    return Forbid();
                }

                await _calendarEventService.DeleteEventAsync(id);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting calendar event with ID: {EventId}", id);
                return StatusCode(500, new { error = "Internal server error", message = "An error occurred while deleting the event." });
            }
        }
    }
}
