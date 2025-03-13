using Stripe;
using System.Threading.Tasks;
using Stripe.Checkout;

namespace JobTrackingAPI.Services
{
    public interface IStripeService
    {
        Task<string> GetPaymentLinkUrlAsync(string paymentLinkId);
        Task<Customer> CreateCustomerAsync(string email, string name);
        Task<string> CreateSubscriptionSessionAsync(string customerId, string priceId);
        Task<Session> CreateCheckoutSessionAsync(
            string planType,
            string userId,
            string userEmail,
            string successUrl,
            string cancelUrl);

        Task<bool> CancelSubscriptionAsync(string subscriptionId);
    }
}