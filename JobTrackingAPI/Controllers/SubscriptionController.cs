using Microsoft.AspNetCore.Mvc;
using JobTrackingAPI.Services;
using Microsoft.Extensions.Options;
using JobTrackingAPI.Settings;
using Stripe;
using System.IO;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using System;
using System.Linq;
using Stripe.Checkout;
using JobTrackingAPI.Models; // Add this for User model
using MongoDB.Driver; // Add this for Builders

namespace JobTrackingAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SubscriptionController : ControllerBase
    {
        private readonly IStripeService _stripeService;
        private readonly IUserService _userService;
        private readonly ILogger<SubscriptionController> _logger;
        private readonly string _webhookSecret;
        private readonly IActivityService _activityService; // Yeni eklenen

        public SubscriptionController(
            IStripeService stripeService,
            IUserService userService,
            IOptions<StripeSettings> stripeSettings,
            ILogger<SubscriptionController> logger,
            IActivityService activityService) // Yeni eklenen
        {
            _stripeService = stripeService;
            _userService = userService;
            _logger = logger;
            _webhookSecret = stripeSettings.Value.WebhookSecret ?? throw new ArgumentNullException(nameof(stripeSettings), "Webhook secret is not configured");
            _activityService = activityService;
        }

        [HttpPost("create-checkout-session")]
        [Authorize]
        public async Task<IActionResult> CreateCheckoutSession([FromBody] CreateCheckoutSessionRequest request)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var user = await _userService.GetUserById(userId);
                if (user == null)
                {
                    return NotFound(new { message = "User not found" });
                }

                // Create a checkout session based on the plan type
                var session = await _stripeService.CreateCheckoutSessionAsync(
                    request.PlanType,
                    userId,
                    user.Email,
                    request.SuccessUrl,
                    request.CancelUrl);

                return Ok(new { sessionId = session.Id });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating checkout session");
                return StatusCode(500, new { message = "Error creating checkout session", error = ex.Message });
            }
        }

        [HttpPost("webhook")]
        public async Task<IActionResult> HandleWebhook()
        {
            var json = await new StreamReader(HttpContext.Request.Body).ReadToEndAsync();
            _logger.LogInformation("Received webhook: {WebhookJson}", json);

            try
            {
                var stripeEvent = EventUtility.ConstructEvent(
                    json,
                    Request.Headers["Stripe-Signature"],
                    _webhookSecret);

                _logger.LogInformation("Webhook event type: {EventType}", stripeEvent.Type);

                // Handle specific event types
                switch (stripeEvent.Type)
                {
                    case "checkout.session.completed":
                        var session = stripeEvent.Data.Object as Session;
                        if (session != null)
                        {
                            await HandleCheckoutSessionCompleted(session);
                        }
                        break;

                    case "customer.subscription.created":
                    case "customer.subscription.updated":
                        var subscription = stripeEvent.Data.Object as Stripe.Subscription;
                        if (subscription != null)
                        {
                            await HandleSubscriptionEvent(subscription);
                        }
                        break;

                    case "payment_intent.succeeded":
                        var paymentIntent = stripeEvent.Data.Object as PaymentIntent;
                        _logger.LogInformation("Payment succeeded for intent {PaymentIntentId}", paymentIntent?.Id);
                        break;

                        // Add more event handlers as needed
                }

                return Ok();
            }
            catch (StripeException e)
            {
                _logger.LogError(e, "Stripe webhook error");
                return BadRequest(new { message = e.Message });
            }
            catch (Exception e)
            {
                _logger.LogError(e, "Webhook processing error");
                return StatusCode(500, new { message = "Webhook processing error", error = e.Message });
            }
        }

        [HttpGet("subscription-status")]
        [Authorize]
        public async Task<IActionResult> GetSubscriptionStatus()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var user = await _userService.GetUserById(userId);
            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            return Ok(new
            {
                subscriptionPlan = user.SubscriptionPlan ?? "free",
                subscriptionId = user.SubscriptionId,
                subscriptionDate = user.SubscriptionDate,
                subscriptionExpiryDate = user.SubscriptionExpiryDate
            });
        }

        [HttpGet("payment-link/{planType}")]
        [Authorize]
        public async Task<IActionResult> GetPaymentLink(string planType)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var user = await _userService.GetUserById(userId);
                if (user == null)
                {
                    return NotFound(new { message = "User not found" });
                }

                // Base URL for redirecting after payment
                var appSettings = HttpContext.RequestServices.GetService(typeof(IOptions<MongoDbSettings>)) as IOptions<MongoDbSettings>;
                var baseUrl = appSettings?.Value.BaseUrl ?? "http://localhost:5173";

                // Create success and cancel URLs
                var successUrl = $"{baseUrl}/subscription/success";
                var cancelUrl = $"{baseUrl}/subscription/cancel";

                // Create checkout session
                var session = await _stripeService.CreateCheckoutSessionAsync(
                    planType,
                    userId,
                    user.Email,
                    successUrl,
                    cancelUrl);

                return Ok(new
                {
                    paymentUrl = session.Url,
                    sessionId = session.Id,
                    redirectUrl = successUrl
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating payment link for {PlanType}", planType);
                return StatusCode(500, new { message = "Error generating payment link", error = ex.Message });
            }
        }

        [HttpPost("cancel")]
        [Authorize]
        public async Task<IActionResult> CancelSubscription()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var user = await _userService.GetUserById(userId);
                if (user == null)
                {
                    return NotFound(new { message = "User not found" });
                }

                if (string.IsNullOrEmpty(user.SubscriptionId))
                {
                    return BadRequest(new { message = "No active subscription found" });
                }

                // Stripe üzerinden aboneliği iptal et
                var result = await _stripeService.CancelSubscriptionAsync(user.SubscriptionId);
                if (!result)
                {
                    return StatusCode(500, new { message = "Failed to cancel subscription with Stripe" });
                }

                // Kullanıcı bilgisini güncelle
                var update = Builders<User>.Update
                    .Set(u => u.SubscriptionPlan, "basic")
                    .Set(u => u.SubscriptionStatus, "canceled")
                    .Set(u => u.SubscriptionId, string.Empty)
                    .Set(u => u.SubscriptionExpiryDate, DateTime.UtcNow);

                await _userService.UpdateUser(userId, update);
                
                // Aktivite loglaması eklendi
                await _activityService.LogUserActivity(userId, "cancelled their subscription");

                _logger.LogInformation("Subscription canceled for user {UserId}", userId);

                return Ok(new { message = "Subscription canceled successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error canceling subscription");
                return StatusCode(500, new { message = "Error canceling subscription", error = ex.Message });
            }
        }

        [HttpPost("ensure-subscription-updated")]
        [Authorize]
        public async Task<IActionResult> EnsureSubscriptionUpdated([FromBody] EnsureSubscriptionRequest request)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var user = await _userService.GetUserById(userId);
                if (user == null)
                {
                    return NotFound(new { message = "User not found" });
                }

                // If the user already has an updated subscription, just return success
                if (!string.IsNullOrEmpty(user.SubscriptionId) && user.SubscriptionPlan == request.PlanType)
                {
                    return Ok(new { message = "Subscription already up to date", subscriptionPlan = user.SubscriptionPlan });
                }

                // Generate a temporary subscription ID if none exists
                string subscriptionId = user.SubscriptionId;
                if (string.IsNullOrEmpty(subscriptionId))
                {
                    subscriptionId = $"manual_{Guid.NewGuid()}";
                }

                // Manually update the subscription as a fallback
                await _userService.UpdateUserSubscriptionAsync(userId, request.PlanType, subscriptionId);

                _logger.LogInformation("Manually updated subscription for user {UserId} to plan {PlanType}", userId, request.PlanType);

                return Ok(new
                {
                    message = "Subscription updated successfully",
                    subscriptionPlan = request.PlanType
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error ensuring subscription update");
                return StatusCode(500, new { message = "Error updating subscription", error = ex.Message });
            }
        }

        private async Task HandleCheckoutSessionCompleted(Session session)
        {
            try
            {
                _logger.LogInformation("Processing checkout session {SessionId}", session.Id);

                if (session.ClientReferenceId == null)
                {
                    _logger.LogWarning("No client reference ID in session {SessionId}", session.Id);
                    return;
                }

                var userId = session.ClientReferenceId;
                var planType = session.Metadata.GetValueOrDefault("planType") ?? "pro";
                var subscriptionId = session.SubscriptionId;

                if (string.IsNullOrEmpty(subscriptionId))
                {
                    _logger.LogWarning("No subscription ID in session {SessionId}", session.Id);
                    return;
                }

                await _userService.UpdateUserSubscriptionAsync(userId, planType, subscriptionId);
                
                // Aktivite loglaması eklendi
                await _activityService.LogUserActivity(userId, $"upgraded to {planType} plan");
                
                _logger.LogInformation("Updated subscription for user {UserId} to plan {PlanType}", userId, planType);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error handling checkout session {SessionId}", session.Id);
                throw;
            }
        }

        private async Task HandleSubscriptionEvent(Stripe.Subscription subscription)
        {
            try
            {
                _logger.LogInformation("Processing subscription {SubscriptionId}", subscription.Id);

                // Get metadata from the subscription
                var metadata = subscription.Metadata;
                var userId = metadata.GetValueOrDefault("userId");

                if (string.IsNullOrEmpty(userId))
                {
                    _logger.LogWarning("No user ID in subscription metadata for {SubscriptionId}", subscription.Id);
                    return;
                }

                // Get the plan information
                var planType = "free";
                if (subscription.Items?.Data?.Count > 0)
                {
                    var item = subscription.Items.Data[0];
                    var plan = item.Plan;
                    planType = plan.Nickname?.ToLower() ?? "pro";
                }

                // Update the user's subscription information
                await _userService.UpdateUserSubscriptionAsync(userId, planType, subscription.Id);
                _logger.LogInformation("Updated subscription for user {UserId} to plan {PlanType}", userId, planType);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error handling subscription {SubscriptionId}", subscription.Id);
                throw;
            }
        }
    }

    public class CreateCheckoutSessionRequest
    {
        public string PlanType { get; set; } = "pro";
        public required string SuccessUrl { get; set; }
        public required string CancelUrl { get; set; }
    }

    public class EnsureSubscriptionRequest
    {
        public string PlanType { get; set; } = "pro";
    }
}