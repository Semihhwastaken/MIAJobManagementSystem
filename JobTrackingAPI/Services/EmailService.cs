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
    }
}
