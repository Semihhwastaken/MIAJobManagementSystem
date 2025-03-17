using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using JobTrackingAPI.Models;

namespace JobTrackingAPI.Models.Requests
{
    public class UpdateTeamDepartmentsRequest
    {
        [Required]
        public List<DepartmentStats>? Departments { get; set; }
    }
}
