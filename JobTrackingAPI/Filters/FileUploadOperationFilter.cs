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
                var schema = operation.RequestBody.Content[fileUploadMime].Schema;
                
                // Eğer "file" parametresi zaten eklenmemişse ekle
                if (!schema.Properties.ContainsKey("file"))
                {
                    schema.Properties.Add("file", new OpenApiSchema
                    {
                        Type = "string",
                        Format = "binary"
                    });
                }
            }
        }
    }
}
