namespace JobTrackingAPI.Models
{
    public class SubscriptionPlan
    {
        public string? Id { get; set; }
        public string? Name { get; set; }
        public string? Description { get; set; }
        public decimal Price { get; set; }
        public string? PaymentLinkId { get; set; }
        public string? StripePriceId { get; set; }
        public string? StripeProductId { get; set; }
        public int MaxUsers { get; set; }
        public bool IncludesReporting { get; set; }
        public bool IncludesAdvancedFeatures { get; set; }
    }
}