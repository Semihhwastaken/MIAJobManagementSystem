using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace JobTrackingAPI.Filters
{
    public class FileUploadOperationFilter : IOperationFilter
    {
        public void Apply(OpenApiOperation operation, OperationFilterContext context)
        {
            if (operation == null || context == null) return;

            var fileUploadMime = "multipart/form-data";
            if (operation.RequestBody?.Content.Any(x => x.Key.Equals(fileUploadMime, StringComparison.InvariantCultureIgnoreCase)) == true)
            {
                operation.RequestBody.Required = true;
                operation.RequestBody.Content[fileUploadMime].Schema.Properties.Add("file", new OpenApiSchema
                {
                    Type = "string",
                    Format = "binary"
                });
            }
        }
    }
}
