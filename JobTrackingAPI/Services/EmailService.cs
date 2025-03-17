using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using System.Threading.Tasks;

namespace JobTrackingAPI.Services
{
    public class EmailService
    {
        private readonly string _smtpServer;
        private readonly int _smtpPort;
        private readonly string _smtpUsername;
        private readonly string _smtpPassword;

        public EmailService(string smtpServer, int smtpPort, string smtpUsername, string smtpPassword)
        {
            _smtpServer = smtpServer;
            _smtpPort = smtpPort;
            _smtpUsername = smtpUsername;
            _smtpPassword = smtpPassword;
        }

        public async Task SendVerificationEmailAsync(string toEmail, string verificationCode)
        {
            var email = new MimeMessage();
            email.From.Add(new MailboxAddress("MIA Task Management", _smtpUsername));
            email.To.Add(new MailboxAddress("", toEmail));
            email.Subject = "Email Doğrulama Kodu";

            var bodyBuilder = new BodyBuilder();
            bodyBuilder.HtmlBody = $@"
                <h2>MIA Task Management'a Hoş Geldiniz!</h2>
                <p>Doğrulama kodunuz: <strong>{verificationCode}</strong></p>
                <p>Bu kod 1 dakika içinde geçerliliğini yitirecektir.</p>
                <p>Eğer bu kaydı siz yapmadıysanız, lütfen bu e-postayı dikkate almayın.</p>";

            email.Body = bodyBuilder.ToMessageBody();

            using var smtp = new SmtpClient();
            await smtp.ConnectAsync(_smtpServer, _smtpPort, SecureSocketOptions.StartTls);
            await smtp.AuthenticateAsync(_smtpUsername, _smtpPassword);
            await smtp.SendAsync(email);
            await smtp.DisconnectAsync(true);
        }

        public async Task SendCalendarEventNotificationAsync(
            string toEmail, 
            string eventTitle, 
            string eventDescription, 
            string eventDate, 
            string eventTime,
            string creatorName,
            string? meetingLink = null)
        {
            var email = new MimeMessage();
            email.From.Add(new MailboxAddress("MIA Task Management", _smtpUsername));
            email.To.Add(new MailboxAddress("", toEmail));
            email.Subject = $"Yeni Etkinlik: {eventTitle}";

            var bodyBuilder = new BodyBuilder();
            
            // Etkinlik detayları ile HTML şablonu oluştur
            string meetingLinkHtml = !string.IsNullOrEmpty(meetingLink) 
                ? $@"<p><strong>Toplantı Linki:</strong> <a href='{meetingLink}'>{meetingLink}</a></p>" 
                : "";
            
            bodyBuilder.HtmlBody = $@"
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;'>
                    <h2 style='color: #3b82f6;'>Yeni Etkinlik Bildirimi</h2>
                    <p>Sayın kullanıcı,</p>
                    <p>{creatorName} tarafından oluşturulan <strong>{eventTitle}</strong> etkinliğine davet edildiniz.</p>
                    
                    <div style='background-color: #f8fafc; padding: 15px; border-radius: 5px; margin-top: 20px;'>
                        <h3 style='color: #334155; margin-top: 0;'>{eventTitle}</h3>
                        <p><strong>Tarih:</strong> {eventDate}</p>
                        <p><strong>Saat:</strong> {eventTime}</p>
                        <p><strong>Açıklama:</strong> {eventDescription}</p>
                        {meetingLinkHtml}
                    </div>
                    
                    <p style='margin-top: 20px;'>Etkinlik detaylarını görmek ve takvime eklemek için uygulamayı ziyaret edin.</p>
                    
                    <div style='margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #64748b; font-size: 12px;'>
                        <p>Bu e-posta MIA Task Management sistemi tarafından otomatik olarak gönderilmiştir.</p>
                    </div>
                </div>
            ";

            email.Body = bodyBuilder.ToMessageBody();

            using var smtp = new SmtpClient();
            await smtp.ConnectAsync(_smtpServer, _smtpPort, SecureSocketOptions.StartTls);
            await smtp.AuthenticateAsync(_smtpUsername, _smtpPassword);
            await smtp.SendAsync(email);
            await smtp.DisconnectAsync(true);
        }
    }
}
