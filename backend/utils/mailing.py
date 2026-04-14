import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from core.config import settings
from utils.logging import get_logger

logger = get_logger("utils.mailing")

def send_email(to_email: str, subject: str, body: str, html_body: str | None = None):
    """
    Send an email using SMTP settings from the configuration.
    """
    if not settings.SMTP_HOST:
        logger.warning("SMTP_HOST not configured. Email to %s skipped.", to_email)
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        msg["To"] = to_email

        # Add plain text body
        msg.attach(MIMEText(body, "plain"))

        # Add HTML body if provided
        if html_body:
            msg.attach(MIMEText(html_body, "html"))

        # Connect and send
        # Connect and send
        if settings.SMTP_SSL or settings.SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=settings.SMTP_TIMEOUT)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=settings.SMTP_TIMEOUT)

        try:
            if not (settings.SMTP_SSL or settings.SMTP_PORT == 465) and settings.SMTP_TLS:
                logger.info("Starting TLS (STARTTLS)")
                server.starttls()
            
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                logger.info("Attempting SMTP login for user=%s", settings.SMTP_USER)
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            
            server.send_message(msg)
            server.quit()
        except Exception:
            # Ensure the connection is closed even on failure before re-raising
            try:
                server.close()
            except Exception:
                pass
            raise
        
        logger.info("Email sent successfully to %s: %s", to_email, subject)
        return True

    except Exception as e:
        logger.error("Failed to send email to %s: %s", to_email, str(e))
        return False
