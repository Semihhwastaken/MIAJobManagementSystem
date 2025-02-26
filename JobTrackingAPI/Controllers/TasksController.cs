using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using MongoDB.Bson;
using JobTrackingAPI.Models;
using JobTrackingAPI.Settings;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using Microsoft.Extensions.Logging;
using JobTrackingAPI.Services;
using JobTrackingAPI.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace JobTrackingAPI.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class TasksController : ControllerBase
    {
        private readonly ITasksService _tasksService;
        private readonly IPerformanceService _performanceService;
        private readonly IHubContext<NotificationHub> _notificationHub;

        public TasksController(
            ITasksService tasksService,
            IPerformanceService performanceService,
            IHubContext<NotificationHub> notificationHub)
        {
            _tasksService = tasksService;
            _performanceService = performanceService;
            _notificationHub = notificationHub;
        }

        [HttpPost]
        public async Task<ActionResult<TaskItem>> CreateTask([FromBody] TaskItem task)
        {
            try
            {
                var createdTask = await _tasksService.CreateTask(task);
                
                // Notify assigned user
                if (!string.IsNullOrEmpty(task.AssignedTo))
                {
                    await _notificationHub.Clients.User(task.AssignedTo).SendAsync(
                        "ReceiveNotification",
                        new { type = "NewTask", message = $"Yeni görev atandı: {task.Title}" }
                    );
                }

                return CreatedAtAction(nameof(GetTask), new { id = createdTask.Id }, createdTask);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}/complete")]
        public async Task<ActionResult> CompleteTask(string id)
        {
            try
            {
                var task = await _tasksService.GetTask(id);
                if (task == null)
                    return NotFound();

                task.Status = "Completed";
                task.CompletedDate = DateTime.UtcNow;
                await _tasksService.UpdateTask(id, task);

                // Update performance score for task completion
                if (!string.IsNullOrEmpty(task.AssignedTo))
                {
                    await _performanceService.UpdatePerformanceScore(task.AssignedTo, task, true);
                }

                return Ok(new { message = "Task completed successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<ActionResult> UpdateTask(string id, [FromBody] TaskItem updatedTask)
        {
            try
            {
                var existingTask = await _tasksService.GetTask(id);
                if (existingTask == null)
                    return NotFound();

                // Check if task became overdue
                if (existingTask.Status != "Completed" && 
                    DateTime.UtcNow > existingTask.DueDate && 
                    existingTask.Status != "Overdue")
                {
                    updatedTask.Status = "Overdue";
                    
                    // Update performance score for overdue task
                    if (!string.IsNullOrEmpty(existingTask.AssignedTo))
                    {
                        await _performanceService.UpdatePerformanceScore(
                            existingTask.AssignedTo, 
                            existingTask, 
                            false
                        );
                    }
                }

                await _tasksService.UpdateTask(id, updatedTask);
                return Ok(updatedTask);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<TaskItem>>> GetTasks()
        {
            var tasks = await _tasksService.GetTasks();
            return Ok(tasks);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<TaskItem>> GetTask(string id)
        {
            var task = await _tasksService.GetTask(id);
            if (task == null)
                return NotFound();

            return Ok(task);
        }

        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<TaskItem>>> GetUserTasks(string userId)
        {
            var tasks = await _tasksService.GetTasksByUserId(userId);
            return Ok(tasks);
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteTask(string id)
        {
            try
            {
                await _tasksService.DeleteTask(id);
                return Ok(new { message = "Task deleted successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
<<<<<<< HEAD
=======

        [HttpGet("dashboard")]
        [Authorize]
        public async Task<ActionResult<DashboardStats>> GetDashboardStats()
        {
            try
            {
                var score = await _performanceService.GetUserPerformanceScore(userId);
                return Ok(score);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
<<<<<<< HEAD
        }
  
=======
>>>>>>> 80a2d6f305c7dd4fa02dc5127a55e9d653b3d9f8
        }
    }
}