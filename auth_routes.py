import re
import secrets
from datetime import timedelta

from flask import Blueprint, current_app, jsonify, request, url_for
from flask_login import current_user, login_required, login_user, logout_user

from models import Admin, PasswordResetToken, db, utcnow

auth_bp = Blueprint("auth", __name__, url_prefix="/api")

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def _is_valid_email(email: str) -> bool:
    return bool(email) and bool(EMAIL_RE.match(email))


def _json_error(message: str, status: int = 400, **extra):
    payload = {"status": "error", "error": message}
    payload.update(extra)
    return jsonify(payload), status


@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json(silent=True) or {}
    full_name = (data.get("full_name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    confirm_password = data.get("confirm_password") or ""

    if not full_name:
        return _json_error("Please enter your full name", 400, field="full_name")
    if not _is_valid_email(email):
        return _json_error("Please enter a valid email address", 400, field="email")
    if len(password) < 8:
        return _json_error("Password must be at least 8 characters", 400, field="password")
    if password != confirm_password:
        return _json_error("Passwords do not match", 400, field="confirm_password")

    if Admin.query.filter_by(email=email).first():
        return _json_error("An account with this email already exists", 409, field="email")

    admin = Admin(full_name=full_name, email=email)
    admin.set_password(password)
    db.session.add(admin)
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Account created successfully",
        "admin": admin.to_dict(),
    }), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    remember = bool(data.get("remember"))

    if not email or not password:
        return _json_error("Invalid email or password", 401)

    admin = Admin.query.filter_by(email=email).first()
    if not admin or not admin.check_password(password):
        return _json_error("Invalid email or password", 401)

    login_user(admin, remember=remember)

    from flask import session
    session.permanent = remember

    return jsonify({
        "status": "success",
        "message": "Logged in successfully",
        "admin": admin.to_dict(),
    }), 200


@auth_bp.route("/logout", methods=["POST"])
@login_required
def logout():
    logout_user()
    return jsonify({"status": "success", "message": "Logged out"}), 200


@auth_bp.route("/session", methods=["GET"])
def session_info():
    if current_user.is_authenticated:
        return jsonify({"status": "success", "authenticated": True, "admin": current_user.to_dict()}), 200
    return jsonify({"status": "success", "authenticated": False}), 200


@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()

    generic_response = jsonify({
        "status": "success",
        "message": "If that email is registered, a password reset link has been sent.",
    })

    if not _is_valid_email(email):
        return generic_response, 200

    admin = Admin.query.filter_by(email=email).first()
    if admin:
        token_value = secrets.token_urlsafe(48)
        expires_at = utcnow() + timedelta(hours=current_app.config["PASSWORD_RESET_EXPIRY_HOURS"])
        reset = PasswordResetToken(token=token_value, admin_id=admin.id, expires_at=expires_at)
        db.session.add(reset)
        db.session.commit()

        reset_link = url_for("auth.reset_password_page", token=token_value, _external=True)
        current_app.logger.info(
            "[PASSWORD RESET] Email: %s  Link: %s  (expires in %s hour(s))",
            admin.email, reset_link, current_app.config["PASSWORD_RESET_EXPIRY_HOURS"],
        )
        print(f"\n=== PASSWORD RESET LINK ===\nFor: {admin.email}\nLink: {reset_link}\n===========================\n", flush=True)

    return generic_response, 200


@auth_bp.route("/reset-password/<token>", methods=["GET"])
def reset_password_page(token: str):
    reset = PasswordResetToken.query.filter_by(token=token).first()
    if not reset or not reset.is_valid():
        return jsonify({
            "status": "error",
            "error": "This reset link is invalid or has expired.",
        }), 400
    return jsonify({
        "status": "success",
        "message": "Token is valid. Submit a POST request to this URL with the new password.",
        "email": reset.admin.email,
    }), 200


@auth_bp.route("/reset-password/<token>", methods=["POST"])
def reset_password_submit(token: str):
    reset = PasswordResetToken.query.filter_by(token=token).first()
    if not reset or not reset.is_valid():
        return _json_error("This reset link is invalid or has expired.", 400)

    data = request.get_json(silent=True) or {}
    password = data.get("password") or ""
    confirm = data.get("confirm_password") or ""

    if len(password) < 8:
        return _json_error("Password must be at least 8 characters", 400, field="password")
    if password != confirm:
        return _json_error("Passwords do not match", 400, field="confirm_password")

    admin = reset.admin
    admin.set_password(password)
    reset.used = True
    db.session.commit()
    return jsonify({"status": "success", "message": "Password reset successfully"}), 200
