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
using JobTrackingAPI.Enums;
namespace JobTrackingAPI.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/calendar/events")]
    public class CalendarEventsController : ControllerBase
    {
        private readonly CalendarEventService _calendarEventService;
        private readonly ILogger<CalendarEventsController> _logger;
        private readonly IUserService _userService; // Change to interface
        private readonly INotificationService _notificationService;
        private readonly ITeamService _teamService;
        private readonly EmailService _emailService;

        public CalendarEventsController(
            CalendarEventService calendarEventService,
            ILogger<CalendarEventsController> logger,
            IUserService userService, // Change to interface
            INotificationService notificationService,
            ITeamService teamService,
            EmailService emailService)
        {
            _calendarEventService = calendarEventService;
            _logger = logger;
            _userService = userService;
            _notificationService = notificationService;
            _teamService = teamService;
            _emailService = emailService;
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

                // Validate category
                if (!new[] { "meeting", "task", "deadline" }.Contains(calendarEvent.Category))
                {
                    return BadRequest(new { error = "Invalid category. Must be meeting, task, or deadline." });
                }

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
                        
                        // Get creator user for creator name
                        var creatorUser = await _userService.GetUserById(userId);
                        string creatorName = creatorUser?.FullName ?? "Bir kullanıcı";
                        
                        // Format date and time for email
                        string eventDate = DateTime.Parse(calendarEvent.StartDate).ToString("dd MMMM yyyy");
                        string eventTime = $"{calendarEvent.StartTime} - {calendarEvent.EndTime}";
                        
                        // Send email notification
                        try {
                            await _emailService.SendCalendarEventNotificationAsync(
                                toEmail: participantEmail,
                                eventTitle: calendarEvent.Title,
                                eventDescription: calendarEvent.Description,
                                eventDate: eventDate,
                                eventTime: eventTime,
                                creatorName: creatorName,
                                meetingLink: calendarEvent.MeetingLink
                            );
                            _logger.LogInformation("Email notification sent to: {@Email}", participantEmail);
                        }
                        catch (Exception emailEx) {
                            _logger.LogError(emailEx, "Error sending email notification to: {@Email}", participantEmail);
                        }
                    }
                    else
                    {
                        _logger.LogWarning("User not found for email: {@Email}", participantEmail);
                    }
                }

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
                        
                        // Get creator user for creator name
                        var creatorUser = await _userService.GetUserById(userId);
                        string creatorName = creatorUser?.FullName ?? "Bir kullanıcı";
                        
                        // Format date and time for email
                        string eventDate = DateTime.Parse(calendarEvent.StartDate).ToString("dd MMMM yyyy");
                        string eventTime = $"{calendarEvent.StartTime} - {calendarEvent.EndTime}";
                        
                        // Send email notification
                        try {
                            await _emailService.SendCalendarEventNotificationAsync(
                                toEmail: participantEmail,
                                eventTitle: calendarEvent.Title + " (Güncellendi)",
                                eventDescription: calendarEvent.Description,
                                eventDate: eventDate,
                                eventTime: eventTime,
                                creatorName: creatorName,
                                meetingLink: calendarEvent.MeetingLink
                            );
                            _logger.LogInformation("Email notification sent to: {@Email}", participantEmail);
                        }
                        catch (Exception emailEx) {
                            _logger.LogError(emailEx, "Error sending email notification to: {@Email}", participantEmail);
                        }
                    }
                    else
                    {
                        _logger.LogWarning("User not found for email: {@Email}", participantEmail);
                    }
                }

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
                        
                        // Get creator user for creator name
                        var creatorUser = await _userService.GetUserById(userId);
                        string creatorName = creatorUser?.FullName ?? "Bir kullanıcı";
                        
                        // Format date and time for email
                        string eventDate = DateTime.Parse(existingEvent.StartDate).ToString("dd MMMM yyyy");
                        string eventTime = $"{existingEvent.StartTime} - {existingEvent.EndTime}";
                        
                        // Send email notification
                        try {
                            await _emailService.SendCalendarEventNotificationAsync(
                                toEmail: participantEmail,
                                eventTitle: existingEvent.Title + " (İptal Edildi)",
                                eventDescription: existingEvent.Description,
                                eventDate: eventDate,
                                eventTime: eventTime,
                                creatorName: creatorName,
                                meetingLink: existingEvent.MeetingLink
                            );
                            _logger.LogInformation("Email notification sent to: {@Email}", participantEmail);
                        }
                        catch (Exception emailEx) {
                            _logger.LogError(emailEx, "Error sending email notification to: {@Email}", participantEmail);
                        }
                    }
                    else
                    {
                        _logger.LogWarning("User not found for email: {@Email}", participantEmail);
                    }
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

        /// <summary>
        /// Kullanıcının dahil olduğu takımlardaki üyelerin etkinliklerini getirir
        /// </summary>
        [HttpGet("team-members")]
        public async Task<ActionResult<IEnumerable<CalendarEvent>>> GetTeamMemberEvents()
        {
            try
            {
                // Kullanıcı kimliğini al
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return BadRequest(new { error = "User ID not found in token" });
                }

                // Kullanıcının takımlarını getir
                var userTeams = await _teamService.GetTeamsByUserId(userId);
                
                // Takım üyelerinin e-postalarını topla
                var memberEmails = new HashSet<string>();
                foreach (var team in userTeams)
                {
                    foreach (var member in team.Members)
                    {
                        if (!string.IsNullOrEmpty(member.Email))
                        {
                            memberEmails.Add(member.Email);
                        }
                    }
                }

                if (memberEmails.Count == 0)
                {
                    return Ok(new List<CalendarEvent>());
                }

                // Takım üyelerinin etkinliklerini getir
                var events = await _calendarEventService.GetTeamMemberEventsAsync(memberEmails.ToList());
                return Ok(events);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting team member events");
                return StatusCode(500, new { error = "Internal server error", message = "An error occurred while retrieving team member events." });
            }
        }

        /// <summary>
        /// Belirli bir takıma ait etkinlikleri getirir
        /// </summary>
        [HttpGet("team/{teamId}")]
        public async Task<ActionResult<IEnumerable<CalendarEvent>>> GetTeamEvents(
            string teamId,
            [FromQuery] string startDate,
            [FromQuery] string endDate)
        {
            try
            {
                // Kullanıcının belirtilen takıma üye olup olmadığını kontrol et
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return BadRequest(new { error = "User ID not found in token" });
                }

                var userTeams = await _teamService.GetTeamsByUserId(userId);
                var isTeamMember = userTeams.Any(t => t.Id == teamId);

                if (!isTeamMember)
                {
                    return Forbid();
                }

                var events = await _calendarEventService.GetEventsByTeamIdAsync(teamId, startDate, endDate);
                return Ok(events);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting team events for team: {TeamId}", teamId);
                return StatusCode(500, new { error = "Internal server error", message = "An error occurred while retrieving team events." });
            }
        }

        /// <summary>
        /// Takım için etkinlik oluşturma
        /// </summary>
        [HttpPost("team/{teamId}")]
        public async Task<ActionResult<CalendarEvent>> CreateTeamEvent(string teamId, [FromBody] CalendarEvent calendarEvent)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var errors = ModelState.Values
                        .SelectMany(v => v.Errors)
                        .Select(e => e.ErrorMessage)
                        .ToList();
                    return BadRequest(new { error = "Validation failed", details = errors });
                }

                // Kullanıcının belirtilen takıma üye olup olmadığını kontrol et
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return BadRequest(new { error = "User ID not found in token" });
                }

                var userTeams = await _teamService.GetTeamsByUserId(userId);
                var isTeamMember = userTeams.Any(t => t.Id == teamId);

                if (!isTeamMember)
                {
                    return Forbid();
                }

                // Tarih formatı kontrolü
                if (!DateTime.TryParse(calendarEvent.StartDate, out DateTime startDate) ||
                    !DateTime.TryParse(calendarEvent.EndDate, out DateTime endDate))
                {
                    return BadRequest(new { error = "Invalid date format. Use YYYY-MM-DD format." });
                }

                // Tarih kontrolü
                if (startDate > endDate)
                {
                    return BadRequest(new { error = "Start date cannot be after end date." });
                }

                // Saat formatı kontrolü
                if (!TimeSpan.TryParse(calendarEvent.StartTime, out TimeSpan startTime) ||
                    !TimeSpan.TryParse(calendarEvent.EndTime, out TimeSpan endTime))
                {
                    return BadRequest(new { error = "Invalid time format. Use HH:mm format." });
                }

                // Aynı gün için saat kontrolü
                if (startDate == endDate && startTime >= endTime)
                {
                    return BadRequest(new { error = "End time must be after start time on the same day." });
                }

                // Kategori kontrolü
                if (!new[] { "meeting", "task", "deadline" }.Contains(calendarEvent.Category))
                {
                    return BadRequest(new { error = "Invalid category. Must be meeting, task, or deadline." });
                }

                calendarEvent.CreatedBy = userId;
                calendarEvent.TeamId = teamId;

                var createdEvent = await _calendarEventService.CreateEventAsync(calendarEvent);

                // Katılımcılara bildirim gönder
                foreach (var participantEmail in calendarEvent.Participants)
                {
                    var user = await _userService.GetUserByEmail(participantEmail);
                    if (user != null)
                    {
                        await _notificationService.SendNotificationAsync(
                            userId: user.Id,
                            title: "Yeni Takım Etkinliği",
                            message: $"{calendarEvent.Title} takım etkinliğine davet edildiniz.",
                            notificationType: NotificationType.CalendarEventCreated,
                            relatedJobId: createdEvent.Id
                        );
                    }
                }

                return CreatedAtAction(nameof(GetEvent), new { id = createdEvent.Id }, createdEvent);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating team calendar event: {@CalendarEvent}", calendarEvent);
                return StatusCode(500, new { error = "Internal server error", message = "An error occurred while creating the team event." });
            }
        }
    }
}
