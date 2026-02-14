from flask import Blueprint, request, jsonify, current_app, make_response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from .db import get_session
from .models import User, LoginChallenge
from .security import random_salt, sha256_commitment, b2hex, hex2b, jwt_encode, jwt_decode
import subprocess
import json
import os
import uuid

bp = Blueprint("api", __name__)


def _json():
    if request.is_json:
        return request.get_json(force=True, silent=True) or {}
    return {}


def _call_verifier(receipt_b64: str) -> dict:
    """Call verifier CLI as a subprocess. Expected JSON on stdout.
    Contract: verifier-cli --receipt-b64 <base64> outputs {"commitment_hex":"...","nonce_hex":"..."}
    """
    settings = current_app.config['SETTINGS']
    bin_path = settings.VERIFIER_BIN
    try:
        result = subprocess.run([
            bin_path, "--receipt-b64", receipt_b64
        ], capture_output=True, text=True, check=True)
        return json.loads(result.stdout)
    except subprocess.CalledProcessError as e:
        return {"error": f"verifier_error: {e.stderr}"}
    except FileNotFoundError:
        return {"error": "verifier_not_found"}


def _call_prover(email: str, salt_hex: str, nonce_hex: str, password: str) -> dict:
    """Call prover CLI as a subprocess. Expected JSON on stdout.
    Contract: prover-cli --email <email> --salt-hex <hex> --nonce-hex <hex> --password <pw>
    """
    settings = current_app.config['SETTINGS']
    bin_path = settings.PROVER_BIN
    try:
        result = subprocess.run(
            [
                bin_path,
                "--email",
                email,
                "--salt-hex",
                salt_hex,
                "--nonce-hex",
                nonce_hex,
                "--password",
                password,
            ],
            capture_output=True,
            text=True,
            check=True,
        )
        return json.loads(result.stdout)
    except subprocess.CalledProcessError as e:
        return {"error": f"prover_error: {e.stderr}"}
    except FileNotFoundError:
        return {"error": "prover_not_found"}


@bp.route("/register/init", methods=["POST"])
def register_init():
    data = _json()
    email = (data.get("email") or "").strip().lower()
    if not email:
        return jsonify({"error": "email_required"}), 400
    salt = random_salt()
    return jsonify({
        "email": email,
        "salt_hex": b2hex(salt)
    })


@bp.route("/register/commit", methods=["POST"])
def register_commit():
    data = _json()
    email = (data.get("email") or "").strip().lower()
    salt_hex = data.get("salt_hex")
    commitment_hex = data.get("commitment_hex")
    if not email or not salt_hex or not commitment_hex:
        return jsonify({"error": "missing_fields"}), 400

    salt = hex2b(salt_hex)
    commitment = hex2b(commitment_hex)

    with get_session() as s:
        user = s.scalar(select(User).where(User.email == email))
        if user is None:
            user = User(email=email, salt=salt, commitment=commitment)
            s.add(user)
        else:
            user.salt = salt
            user.commitment = commitment
        try:
            s.commit()
        except IntegrityError:
            s.rollback()
            return jsonify({"error": "email_conflict"}), 409

    return jsonify({"status": "ok"})


@bp.route("/login/init", methods=["POST"])
def login_init():
    data = _json()
    email = (data.get("email") or "").strip().lower()
    if not email:
        return jsonify({"error": "email_required"}), 400

    with get_session() as s:
        user = s.scalar(select(User).where(User.email == email))
        if user is None:
            return jsonify({"error": "user_not_found"}), 404
        ch = LoginChallenge.new(user.id, ttl_seconds=120)
        s.add(ch)
        s.commit()
        return jsonify({
            "challenge_id": str(ch.id),
            "salt_hex": b2hex(user.salt),
            "nonce_hex": b2hex(ch.nonce),
            "email": email,
        })


@bp.route("/login/complete", methods=["POST"])
def login_complete():
    data = _json()
    email = (data.get("email") or "").strip().lower()
    challenge_id = data.get("challenge_id")
    receipt_b64 = data.get("receipt_b64")
    if not (email and challenge_id and receipt_b64):
        return jsonify({"error": "missing_fields"}), 400

    try:
        ch_id = uuid.UUID(challenge_id)
    except ValueError:
        return jsonify({"error": "invalid_challenge_id"}), 400

    with get_session() as s:
        user = s.scalar(select(User).where(User.email == email))
        if user is None:
            return jsonify({"error": "user_not_found"}), 404
        ch = s.get(LoginChallenge, ch_id)
        if ch is None or ch.user_id != user.id:
            return jsonify({"error": "challenge_not_found"}), 404
        from datetime import datetime, timezone
        if ch.consumed:
            return jsonify({"error": "challenge_consumed"}), 400
        # Handle both timezone-aware and naive datetimes for backward compatibility
        now = datetime.now(timezone.utc)
        expires = ch.expires_at if ch.expires_at.tzinfo else ch.expires_at.replace(tzinfo=timezone.utc)
        if expires < now:
            return jsonify({"error": "challenge_expired"}), 400

        res = _call_verifier(receipt_b64)
        if "error" in res:
            return jsonify(res), 400
        commitment_hex = res.get("commitment_hex")
        nonce_hex = res.get("nonce_hex")
        if not commitment_hex or not nonce_hex:
            return jsonify({"error": "verifier_bad_output"}), 400

        if hex2b(nonce_hex) != ch.nonce:
            return jsonify({"error": "nonce_mismatch"}), 400
        if hex2b(commitment_hex) != user.commitment:
            return jsonify({"error": "commitment_mismatch"}), 400

        ch.consumed = True
        s.commit()

        settings = current_app.config['SETTINGS']
        token = jwt_encode(settings.JWT_SECRET, sub=email, minutes=settings.JWT_EXPIRES_MIN)
        resp = make_response(jsonify({"status": "ok"}))
        resp.set_cookie(
            settings.JWT_COOKIE_NAME,
            token,
            httponly=True,
            samesite="Lax",
            secure=settings.JWT_COOKIE_SECURE,
            max_age=settings.JWT_EXPIRES_MIN * 60,
            path="/",
        )
        return resp


@bp.route("/login/prove", methods=["POST"])
def login_prove():
    settings = current_app.config['SETTINGS']
    if not settings.ALLOW_INSECURE_PROVER:
        return jsonify({"error": "prover_disabled"}), 403

    data = _json()
    email = (data.get("email") or "").strip().lower()
    challenge_id = data.get("challenge_id")
    password = data.get("password")
    if not (email and challenge_id and password):
        return jsonify({"error": "missing_fields"}), 400

    try:
        ch_id = uuid.UUID(challenge_id)
    except ValueError:
        return jsonify({"error": "invalid_challenge_id"}), 400

    with get_session() as s:
        user = s.scalar(select(User).where(User.email == email))
        if user is None:
            return jsonify({"error": "user_not_found"}), 404
        ch = s.get(LoginChallenge, ch_id)
        if ch is None or ch.user_id != user.id:
            return jsonify({"error": "challenge_not_found"}), 404
        from datetime import datetime, timezone
        if ch.consumed:
            return jsonify({"error": "challenge_consumed"}), 400
        now = datetime.now(timezone.utc)
        expires = ch.expires_at if ch.expires_at.tzinfo else ch.expires_at.replace(tzinfo=timezone.utc)
        if expires < now:
            return jsonify({"error": "challenge_expired"}), 400

        res = _call_prover(email, b2hex(user.salt), b2hex(ch.nonce), password)
        if "error" in res:
            return jsonify(res), 400
        return jsonify(res)


@bp.route("/me", methods=["GET"])
def me():
    settings = current_app.config['SETTINGS']
    token = request.cookies.get(settings.JWT_COOKIE_NAME)
    if not token:
        return jsonify({"authenticated": False}), 401
    claims = jwt_decode(settings.JWT_SECRET, token)
    if not claims:
        return jsonify({"authenticated": False}), 401
    return jsonify({"authenticated": True, "sub": claims.get("sub")})


@bp.route("/logout", methods=["POST"])
def logout():
    settings = current_app.config['SETTINGS']
    resp = make_response(jsonify({"status": "ok"}))
    resp.delete_cookie(settings.JWT_COOKIE_NAME, path="/")
    return resp


# For `flask --app app.routes run`
from flask import Flask  # noqa

app = Flask(__name__)
app.config['SETTINGS'] = __import__('app.config', fromlist=['Settings']).Settings()
from .db import init_db  # noqa
init_db(app.config['SETTINGS'].DATABASE_URL)
app.register_blueprint(bp, url_prefix='/api')
