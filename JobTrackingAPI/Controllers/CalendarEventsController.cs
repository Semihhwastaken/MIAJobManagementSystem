using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Security.Claims;
using System.Linq;
using JobTrackingAPI.Models;
using JobTrackingAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
<<<<<<< HEAD

=======
using JobTrackingAPI.Enums;
>>>>>>> newdb1
namespace JobTrackingAPI.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/calendar/events")]
    public class CalendarEventsController : ControllerBase
    {
        private readonly CalendarEventService _calendarEventService;
        private readonly ILogger<CalendarEventsController> _logger;
<<<<<<< HEAD

        public CalendarEventsController(
            CalendarEventService calendarEventService,
            ILogger<CalendarEventsController> logger)
        {
            _calendarEventService = calendarEventService;
            _logger = logger;
=======
        private readonly IUserService _userService; // Change to interface
        private readonly INotificationService _notificationService;

        public CalendarEventsController(
            CalendarEventService calendarEventService,
            ILogger<CalendarEventsController> logger,
            IUserService userService, // Change to interface
            INotificationService notificationService)
        {
            _calendarEventService = calendarEventService;
            _logger = logger;
            _userService = userService;
            _notificationService = notificationService;
>>>>>>> newdb1
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
                _logger.LogInformation("Received event creation request: {@CalendarEvent}", calendarEvent);

                if (!ModelState.IsValid)
                {
                    var errors = ModelState.Values
                        .SelectMany(v => v.Errors)
                        .Select(e => e.ErrorMessage)
                        .ToList();
                    _logger.LogWarning("Invalid model state: {@ValidationErrors}", errors);
                    return BadRequest(new { error = "Validation failed", details = errors });
                }

                // Validate and format dates
                if (!DateTime.TryParse(calendarEvent.StartDate, out DateTime startDate) ||
                    !DateTime.TryParse(calendarEvent.EndDate, out DateTime endDate))
                {
                    _logger.LogWarning("Invalid date format. StartDate: {StartDate}, EndDate: {EndDate}", 
                        calendarEvent.StartDate, calendarEvent.EndDate);
                    return BadRequest(new { error = "Invalid date format. Use YYYY-MM-DD format." });
                }

                // Validate start date is not after end date
                if (startDate > endDate)
                {
                    _logger.LogWarning("Start date is after end date. StartDate: {StartDate}, EndDate: {EndDate}", 
                        startDate, endDate);
                    return BadRequest(new { error = "Start date cannot be after end date." });
                }

                // Validate time format
                if (!TimeSpan.TryParse(calendarEvent.StartTime, out TimeSpan startTime) ||
                    !TimeSpan.TryParse(calendarEvent.EndTime, out TimeSpan endTime))
                {
                    _logger.LogWarning("Invalid time format. StartTime: {StartTime}, EndTime: {EndTime}", 
                        calendarEvent.StartTime, calendarEvent.EndTime);
                    return BadRequest(new { error = "Invalid time format. Use HH:mm format." });
                }

                // Validate times for same day
                if (startDate == endDate && startTime >= endTime)
                {
                    _logger.LogWarning("End time must be after start time on same day. StartTime: {StartTime}, EndTime: {EndTime}", 
                        startTime, endTime);
                    return BadRequest(new { error = "End time must be after start time on the same day." });
                }

<<<<<<< HEAD
=======
                // Validate category
                if (!new[] { "meeting", "task", "deadline" }.Contains(calendarEvent.Category))
                {
                    return BadRequest(new { error = "Invalid category. Must be meeting, task, or deadline." });
                }

>>>>>>> newdb1
                // Get the user ID from claims
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    _logger.LogWarning("User ID not found in token claims");
                    return BadRequest(new { error = "User ID not found in token" });
                }
                calendarEvent.CreatedBy = userId;

                _logger.LogInformation("Creating event with validated data: {@CalendarEvent}", calendarEvent);
                var createdEvent = await _calendarEventService.CreateEventAsync(calendarEvent);
                _logger.LogInformation("Event created successfully: {@CreatedEvent}", createdEvent);

<<<<<<< HEAD
=======
                // Send notifications to all participants
                foreach (var participantEmail in calendarEvent.Participants)
                {
                    var user = await _userService.GetUserByEmail(participantEmail);
                    if (user != null)
                    {
                        _logger.LogInformation("Sending notification to user: {@UserId} for email: {@Email}", user.Id, participantEmail);
                        await _notificationService.SendNotificationAsync(
                            userId: user.Id,
                            title: "Yeni Takvim Planı",
                            message: $"{calendarEvent.Title}a davet edildiniz.",
                            notificationType: NotificationType.CalendarEventCreated,
                            relatedJobId: createdEvent.Id
                        );
                    }
                    else
                    {
                        _logger.LogWarning("User not found for email: {@Email}", participantEmail);
                    }
                }

>>>>>>> newdb1
                return CreatedAtAction(nameof(GetEvent), new { id = createdEvent.Id }, createdEvent);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating calendar event: {@CalendarEvent}", calendarEvent);
                return StatusCode(500, new { error = "Internal server error", message = "An error occurred while creating the event." });
            }
        }

        /// <summary>
        /// Update an existing calendar event
        /// </summary>
        [HttpPut("{id}")]
        public async Task<ActionResult<CalendarEvent>> UpdateEvent(string id, [FromBody] CalendarEvent calendarEvent)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var errors = ModelState.Values
                        .SelectMany(v => v.Errors)
                        .Select(e => e.ErrorMessage)
                        .ToList();
                    _logger.LogWarning("Invalid model state: {@ValidationErrors}", errors);
                    return BadRequest(new { error = "Validation failed", details = errors });
                }

                var existingEvent = await _calendarEventService.GetEventByIdAsync(id);
                if (existingEvent == null)
                {
                    return NotFound(new { error = "Event not found" });
                }

                // Validate dates
                if (!DateTime.TryParse(calendarEvent.StartDate, out DateTime startDate) ||
                    !DateTime.TryParse(calendarEvent.EndDate, out DateTime endDate))
                {
                    return BadRequest(new { error = "Invalid date format. Use YYYY-MM-DD format." });
                }

                // Validate start date is not after end date
                if (startDate > endDate)
                {
                    return BadRequest(new { error = "Start date cannot be after end date." });
                }

                // Validate that the user has permission to update this event
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId) || existingEvent.CreatedBy != userId)
                {
                    return Forbid();
                }

                calendarEvent.Id = id;
                calendarEvent.CreatedBy = existingEvent.CreatedBy;
                calendarEvent.CreatedAt = existingEvent.CreatedAt;

                var updatedEvent = await _calendarEventService.UpdateEventAsync(id, calendarEvent);
<<<<<<< HEAD
=======

                // Send notifications to all participants
                foreach (var participantEmail in calendarEvent.Participants)
                {
                    var user = await _userService.GetUserByEmail(participantEmail);
                    if (user != null)
                    {
                        _logger.LogInformation("Sending update notification to user: {@UserId} for email: {@Email}", user.Id, participantEmail);
                        await _notificationService.SendNotificationAsync(
                            userId: user.Id,
                            title: "Takvim Planı Değişikliği.",
                            message: $"{calendarEvent.Title} planı güncellendi.",
                            notificationType: NotificationType.CalendarEventUpdated,
                            relatedJobId: id
                        );
                    }
                    else
                    {
                        _logger.LogWarning("User not found for email: {@Email}", participantEmail);
                    }
                }

>>>>>>> newdb1
                return Ok(updatedEvent);
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

                // Validate that the user has permission to delete this event
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId) || existingEvent.CreatedBy != userId)
                {
                    return Forbid();
                }

<<<<<<< HEAD
=======
                // Send notifications to all participants before deleting
                foreach (var participantEmail in existingEvent.Participants)
                {
                    var user = await _userService.GetUserByEmail(participantEmail);
                    if (user != null)
                    {
                        _logger.LogInformation("Sending deletion notification to user: {@UserId} for email: {@Email}", user.Id, participantEmail);
                        await _notificationService.SendNotificationAsync(
                            userId: user.Id,
                            title: "Takvim Planı İptal",
                            message: $"{existingEvent.Title} planı iptal edildi.",
                            notificationType: NotificationType.CalendarEventDeleted,
                            relatedJobId: id
                        );
                    }
                    else
                    {
                        _logger.LogWarning("User not found for email: {@Email}", participantEmail);
                    }
                }

>>>>>>> newdb1
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
<<<<<<< HEAD
}
=======
}
>>>>>>> newdb1
