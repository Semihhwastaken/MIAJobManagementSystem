namespace JobTrackingAPI.Settings
{
    public class StripeSettings
    {
        public string SecretKey { get; set; }
        public string PublishableKey { get; set; }
        public string WebhookSecret { get; set; }
        public string ProPlanPriceId { get; set; }
        public string EnterprisePlanPriceId { get; set; }
    }
}