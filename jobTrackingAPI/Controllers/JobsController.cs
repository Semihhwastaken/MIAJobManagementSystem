using System.Collections.Generic;
using System.Threading.Tasks;
using JobTrackingAPI.Models;
using JobTrackingAPI.Services;
using Microsoft.AspNetCore.Mvc;

namespace JobTrackingAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class JobsController : ControllerBase
    {
        private readonly JobService _jobService;

        public JobsController(JobService jobService)
        {
            _jobService = jobService;
        }

        [HttpGet]
        public async Task<ActionResult<List<Job>>> GetAll()
        {
            var jobs = await _jobService.GetAllAsync();
            return Ok(jobs);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Job>> Get(string id)
        {
            var job = await _jobService.GetByIdAsync(id);
            if (job == null)
            {
                return NotFound();
            }
            return Ok(job);
        }

        [HttpPost]
        public async Task<ActionResult<Job>> Create(Job job)
        {
            await _jobService.CreateAsync(job);
            return CreatedAtAction(nameof(Get), new { id = job.Id }, job);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, Job job)
        {
            var existingJob = await _jobService.GetByIdAsync(id);
            if (existingJob == null)
            {
                return NotFound();
            }
            
            job.Id = id;
            await _jobService.UpdateAsync(id, job);
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            var job = await _jobService.GetByIdAsync(id);
            if (job == null)
            {
                return NotFound();
            }

            await _jobService.DeleteAsync(id);
            return NoContent();
        }

        [HttpGet("user/{userId}")]
        public async Task<ActionResult<List<Job>>> GetByUserId(string userId)
        {
            var jobs = await _jobService.GetJobsByUserIdAsync(userId);
            return Ok(jobs);
        }
    }
}
