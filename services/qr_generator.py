# services/qr_generator.py
import qrcode
from PIL import Image
import base64
from io import BytesIO

def generate_qr_base64(url: str) -> str:
    """
    Generates a QR code for the given URL and returns it as a base64 PNG string.
    """
    # Create QR code
    qr = qrcode.QRCode(
        version=1,
        box_size=6,
        border=2
    )
    qr.add_data(url)
    qr.make(fit=True)

    # Convert to PIL image
    img = qr.make_image(fill_color="black", back_color="white").convert("RGB")

    # Save image to in-memory buffer
    buffer = BytesIO()
    img.save(buffer, format="PNG")

    # Encode to base64
    qr_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return qr_base64
