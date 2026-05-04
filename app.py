import os
from flask import Flask, jsonify, render_template
from flask_login import LoginManager

from auth_routes import auth_bp
from config import Config
from models import Admin, db
from opp_routes import opp_bp


def create_app(config_class=Config) -> Flask:
    app = Flask(__name__, static_folder="static", template_folder="templates")
    app.config.from_object(config_class)

    db.init_app(app)

    login_manager = LoginManager()
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id: str):
        return db.session.get(Admin, int(user_id))

    @login_manager.unauthorized_handler
    def unauthorized():
        return jsonify({"status": "error", "error": "Authentication required"}), 401

    app.register_blueprint(auth_bp)
    app.register_blueprint(opp_bp)

    @app.route("/")
    def index():
        return render_template("admin.html")

    @app.route("/health")
    def health():
        return jsonify({"status": "ok"}), 200

    @app.errorhandler(404)
    def not_found(_e):
        return jsonify({"status": "error", "error": "Not found"}), 404

    @app.errorhandler(500)
    def server_error(_e):
        return jsonify({"status": "error", "error": "Internal server error"}), 500

    with app.app_context():
        db.create_all()

    return app


app = create_app()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="127.0.0.1", port=port, debug=True)
