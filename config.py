import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-change-me-in-production-please")
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'qatar_admin.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    REMEMBER_COOKIE_DURATION = 60 * 60 * 24 * 30
    PERMANENT_SESSION_LIFETIME = 60 * 60 * 24 * 7

    PASSWORD_RESET_EXPIRY_HOURS = 1
    ALLOWED_CATEGORIES = ["technology", "business", "design", "marketing", "data", "other"]
