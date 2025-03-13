using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging;
using JobTrackingAPI.Settings;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Stripe;
using Stripe.Checkout;
using System.Linq;

namespace JobTrackingAPI.Services
{
    public class StripeService : IStripeService
    {
        private readonly StripeSettings _settings;
        private readonly ILogger<StripeService> _logger;

        public StripeService(
            IOptions<StripeSettings> settings,
            ILogger<StripeService> logger)
        {
            _settings = settings.Value;
            _logger = logger;
            StripeConfiguration.ApiKey = _settings.SecretKey;
        }

        public async Task<Session> CreateCheckoutSessionAsync(
            string planType,
            string userId,
            string userEmail,
            string successUrl,
            string cancelUrl)
        {
            try
            {
                // Get price ID based on plan type
                string priceId = GetPriceIdForPlan(planType);

                var options = new SessionCreateOptions
                {
                    PaymentMethodTypes = new List<string> { "card" },
                    CustomerEmail = userEmail,
                    ClientReferenceId = userId, // Store user ID for webhook
                    LineItems = new List<SessionLineItemOptions>
                    {
                        new SessionLineItemOptions
                        {
                            Price = priceId,
                            Quantity = 1
                        }
                    },
                    Mode = "subscription",
                    SuccessUrl = successUrl,
                    CancelUrl = cancelUrl,
                    Metadata = new Dictionary<string, string>
                    {
                        { "userId", userId },
                        { "planType", planType }
                    }
                };

                var service = new SessionService();
                var session = await service.CreateAsync(options);

                _logger.LogInformation("Created checkout session {SessionId} for user {UserId}", session.Id, userId);
                return session;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating checkout session for user {UserId}", userId);
                throw;
            }
        }

        public async Task<bool> CancelSubscriptionAsync(string subscriptionId)
        {
            try
            {
                var service = new SubscriptionService();
                var subscription = await service.CancelAsync(subscriptionId, new SubscriptionCancelOptions());

                return subscription.Status == "canceled";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error canceling subscription {SubscriptionId}", subscriptionId);
                throw;
            }
        }

        public async Task<Customer> CreateCustomerAsync(string email, string name)
        {
            try
            {
                var options = new CustomerCreateOptions
                {
                    Email = email,
                    Name = name
                };

                var service = new CustomerService();
                return await service.CreateAsync(options);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating Stripe customer for email {Email}", email);
                throw;
            }
        }

        public async Task<string> CreateSubscriptionSessionAsync(string customerId, string priceId)
        {
            try
            {
                var options = new SubscriptionCreateOptions
                {
                    Customer = customerId,
                    Items = new List<SubscriptionItemOptions>
                    {
                        new SubscriptionItemOptions
                        {
                            Price = priceId
                        }
                    }
                };

                var service = new SubscriptionService();
                var subscription = await service.CreateAsync(options);

                return subscription.Id;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating subscription for customer {CustomerId}", customerId);
                throw;
            }
        }

        public async Task<string> GetPaymentLinkUrlAsync(string paymentLinkId)
        {
            try
            {
                var service = new PaymentLinkService();
                var paymentLink = await service.GetAsync(paymentLinkId);

                return paymentLink.Url;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting payment link {PaymentLinkId}", paymentLinkId);
                throw;
            }
        }

        private string GetPriceIdForPlan(string planType)
{
            if (string.IsNullOrEmpty(planType))
                throw new ArgumentNullException(nameof(planType));

            return planType.ToLower() switch
            {
                "pro" => _settings.ProPlanPriceId!,
                "enterprise" => _settings.EnterprisePlanPriceId!,
                _ => _settings.ProPlanPriceId! // Default to Pro plan
            };
        }
    }
}