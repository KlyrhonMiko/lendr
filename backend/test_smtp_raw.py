import smtplib
import socket

host = "smtp.mailtrap.io"
port = 587

print(f"Testing connection to {host}:{port}...")
try:
    with smtplib.SMTP(host, port, timeout=10) as server:
        server.set_debuglevel(1)
        print("Connected. sending EHLO...")
        server.ehlo()
        print("Starting TLS...")
        server.starttls()
        print("TLS started. sending EHLO again...")
        server.ehlo()
        print("SUCCESS: Connection and TLS established.")
except Exception as e:
    print(f"FAILURE: {e}")
except socket.timeout:
    print("FAILURE: Connection timed out.")
