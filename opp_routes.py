from flask import Blueprint, current_app, jsonify, request
from flask_login import current_user, login_required

from models import Opportunity, db

opp_bp = Blueprint("opportunities", __name__, url_prefix="/api/opportunities")


def _json_error(message: str, status: int = 400, **extra):
    payload = {"status": "error", "error": message}
    payload.update(extra)
    return jsonify(payload), status


REQUIRED_FIELDS = [
    ("name", "Opportunity name is required"),
    ("duration", "Duration is required"),
    ("start_date", "Start date is required"),
    ("description", "Description is required"),
    ("skills", "Skills are required"),
    ("category", "Category is required"),
    ("future_opportunities", "Future opportunities is required"),
]


def _extract_payload(data: dict):
    cleaned = {}
    for key, _ in REQUIRED_FIELDS:
        value = data.get(key)
        if isinstance(value, list):
            value = ", ".join(str(v).strip() for v in value if str(v).strip())
        cleaned[key] = (value or "").strip() if isinstance(value, str) else value

    for key, message in REQUIRED_FIELDS:
        if not cleaned.get(key):
            return None, _json_error(message, 400, field=key)

    category = (cleaned["category"] or "").strip().lower()
    if category not in current_app.config["ALLOWED_CATEGORIES"]:
        return None, _json_error(
            f"Invalid category. Must be one of: {', '.join(current_app.config['ALLOWED_CATEGORIES'])}",
            400, field="category",
        )
    cleaned["category"] = category

    max_app_raw = data.get("max_applicants")
    if max_app_raw in (None, "", []):
        cleaned["max_applicants"] = None
    else:
        try:
            cleaned["max_applicants"] = int(max_app_raw)
            if cleaned["max_applicants"] < 0:
                return None, _json_error("Maximum applicants cannot be negative", 400, field="max_applicants")
        except (ValueError, TypeError):
            return None, _json_error("Maximum applicants must be a number", 400, field="max_applicants")

    return cleaned, None


def _get_owned_opportunity(opp_id: int):
    opp = Opportunity.query.filter_by(id=opp_id, admin_id=current_user.id).first()
    return opp


@opp_bp.route("", methods=["GET"])
@login_required
def list_opportunities():
    items = (
        Opportunity.query
        .filter_by(admin_id=current_user.id)
        .order_by(Opportunity.created_at.desc())
        .all()
    )
    return jsonify({
        "status": "success",
        "data": [op.to_dict() for op in items],
        "count": len(items),
    }), 200


@opp_bp.route("", methods=["POST"])
@login_required
def create_opportunity():
    data = request.get_json(silent=True) or {}
    cleaned, error = _extract_payload(data)
    if error:
        return error

    op = Opportunity(
        name=cleaned["name"],
        duration=cleaned["duration"],
        start_date=cleaned["start_date"],
        description=cleaned["description"],
        skills=cleaned["skills"],
        category=cleaned["category"],
        future_opportunities=cleaned["future_opportunities"],
        max_applicants=cleaned["max_applicants"],
        admin_id=current_user.id,
    )
    db.session.add(op)
    db.session.commit()

    return jsonify({"status": "success", "message": "Opportunity created", "data": op.to_dict()}), 201


@opp_bp.route("/<int:opp_id>", methods=["GET"])
@login_required
def get_opportunity(opp_id: int):
    op = _get_owned_opportunity(opp_id)
    if not op:
        return _json_error("Opportunity not found", 404)
    return jsonify({"status": "success", "data": op.to_dict()}), 200


@opp_bp.route("/<int:opp_id>", methods=["PUT"])
@opp_bp.route("/<int:opp_id>/edit", methods=["POST", "PUT"])
@login_required
def update_opportunity(opp_id: int):
    op = _get_owned_opportunity(opp_id)
    if not op:
        return _json_error("Opportunity not found", 404)

    data = request.get_json(silent=True) or {}
    cleaned, error = _extract_payload(data)
    if error:
        return error

    op.name = cleaned["name"]
    op.duration = cleaned["duration"]
    op.start_date = cleaned["start_date"]
    op.description = cleaned["description"]
    op.skills = cleaned["skills"]
    op.category = cleaned["category"]
    op.future_opportunities = cleaned["future_opportunities"]
    op.max_applicants = cleaned["max_applicants"]
    db.session.commit()

    return jsonify({"status": "success", "message": "Opportunity updated", "data": op.to_dict()}), 200


@opp_bp.route("/<int:opp_id>", methods=["DELETE"])
@login_required
def delete_opportunity(opp_id: int):
    op = _get_owned_opportunity(opp_id)
    if not op:
        return _json_error("Opportunity not found", 404)
    db.session.delete(op)
    db.session.commit()
    return jsonify({"status": "success", "message": "Opportunity deleted"}), 200
