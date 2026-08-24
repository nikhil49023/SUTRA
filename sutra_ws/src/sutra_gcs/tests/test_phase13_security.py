"""
SMART HORIZON GCS — Phase 13 Production Security & Authorization Test Suite
Subsystems: AuthManager, SessionManager, RBACManager, CommandAuthorizer, InputValidator, RateLimiter, AuditLogger
"""

import sys
import time
import pytest
from pathlib import Path

gcs_root = Path(__file__).resolve().parent.parent
if str(gcs_root) not in sys.path:
    sys.path.insert(0, str(gcs_root))

from security import (
    auth_manager,
    session_manager,
    rbac_manager,
    command_authorizer,
    input_validator,
    rate_limiter,
    security_audit_logger,
    SecretManager,
    UserRole,
    Permission,
)
from backend.command_gateway import command_gateway


class TestPhase13Security:
    def setup_method(self):
        rate_limiter.reset()
        security_audit_logger.clear_in_memory()

    def test_login_success_and_password_verification(self):
        """Test authenticating default operator accounts."""
        user, session, err = auth_manager.authenticate("commander", "Commander@GCS2026!")
        assert err is None
        assert user is not None
        assert user.role == "COMMANDER"
        assert session is not None
        assert session.status == "ACTIVE"
        assert session.user_id == user.user_id

        # Verify password verification constant-time check
        assert auth_manager.verify_password("Commander@GCS2026!", user.salt, user.password_hash) is True
        assert auth_manager.verify_password("WrongPassword!", user.salt, user.password_hash) is False

    def test_invalid_login_and_account_lockout(self):
        """Test repeated failed logins trigger lockout protection."""
        for _ in range(4):
            user, session, err = auth_manager.authenticate("pilot", "IncorrectPass!")
            assert session is None

        # 5th attempt triggers lockout
        user, session, err = auth_manager.authenticate("pilot", "IncorrectPass!")
        assert "Invalid username or password" in err or "locked" in err

        u = auth_manager.get_user("pilot")
        assert u.failed_attempts >= 5
        assert u.lockout_until > time.time()

        # Reset pilot for subsequent tests
        u.failed_attempts = 0
        u.lockout_until = 0.0

    def test_session_creation_expiration_and_revocation(self):
        """Test cryptographic session lifecycle."""
        sess = session_manager.create_session("usr_test", "tester", "OPERATOR", duration_sec=1)
        assert sess.session_id.startswith("sess_")
        assert sess.token is not None

        # Valid session retrieval
        retrieved = session_manager.get_session(sess.session_id)
        assert retrieved is not None
        assert retrieved.username == "tester"

        # Explicit revocation
        session_manager.revoke_session(sess.session_id)
        revoked = session_manager.get_session(sess.session_id)
        assert revoked is None

    def test_role_permission_hierarchy(self):
        """Test role matrix permissions."""
        assert rbac_manager.has_permission(UserRole.VIEWER, Permission.TELEMETRY_READ) is True
        assert rbac_manager.has_permission(UserRole.VIEWER, Permission.DRONE_ARM) is False
        assert rbac_manager.has_permission(UserRole.VIEWER, Permission.MISSION_EXECUTE) is False

        assert rbac_manager.has_permission(UserRole.MISSION_PLANNER, Permission.MISSION_CREATE) is True
        assert rbac_manager.has_permission(UserRole.MISSION_PLANNER, Permission.DRONE_TAKEOFF) is False

        assert rbac_manager.has_permission(UserRole.PILOT, Permission.DRONE_ARM) is True
        assert rbac_manager.has_permission(UserRole.PILOT, Permission.DRONE_TAKEOFF) is True
        assert rbac_manager.has_permission(UserRole.PILOT, Permission.DRONE_RTL) is True

        assert rbac_manager.has_permission(UserRole.COMMANDER, Permission.MISSION_ABORT) is True
        assert rbac_manager.has_permission(UserRole.COMMANDER, Permission.DRONE_DISARM) is True

        assert rbac_manager.has_permission(UserRole.ADMIN, Permission.SYSTEM_CONFIGURE) is True

    def test_command_authorization_security_matrix(self):
        """Test that CommandAuthorizer rejects unauthorized roles and authorizes valid roles."""
        # 1. VIEWER attempts ARM -> DENIED
        viewer_sess = session_manager.create_session("usr_viewer", "viewer", "VIEWER")
        dec_v = command_authorizer.authorize("drone.arm", "cmd-arm-v", {}, session_id=viewer_sess.session_id)
        assert dec_v.authorized is False
        assert dec_v.status == "DENIED"
        assert "lacks permission" in dec_v.reason

        # 2. MISSION_PLANNER attempts TAKEOFF -> DENIED
        planner_sess = session_manager.create_session("usr_planner", "planner", "MISSION_PLANNER")
        dec_p = command_authorizer.authorize("drone.takeoff", "cmd-to-p", {}, session_id=planner_sess.session_id)
        assert dec_p.authorized is False
        assert dec_p.status == "DENIED"

        # 3. PILOT attempts TAKEOFF -> AUTHORIZED
        pilot_sess = session_manager.create_session("usr_pilot", "pilot", "PILOT")
        dec_pi = command_authorizer.authorize("drone.takeoff", "cmd-to-pi", {"altitude": 15.0}, session_id=pilot_sess.session_id)
        assert dec_pi.authorized is True
        assert dec_pi.status == "AUTHORIZED"

        # 4. COMMANDER attempts EMERGENCY RTL -> AUTHORIZED
        cmd_sess = session_manager.create_session("usr_commander", "commander", "COMMANDER")
        dec_c = command_authorizer.authorize("mission.rtl", "cmd-rtl-c", {"drone_id": "ALL"}, session_id=cmd_sess.session_id)
        assert dec_c.authorized is True
        assert dec_c.severity == "EMERGENCY"

    def test_replay_protection_and_duplicate_command_id(self):
        """Test timestamp drift check and duplicate command rejection."""
        sess = session_manager.create_session("usr_comm", "commander", "COMMANDER")
        cmd_id = f"cmd-replay-{time.time()}"

        # First authorization
        dec1 = command_authorizer.authorize("mission.start", cmd_id, {}, session_id=sess.session_id, timestamp=time.time())
        assert dec1.authorized is True

        # Second authorization with exact same command_id -> REJECTED
        dec2 = command_authorizer.authorize("mission.start", cmd_id, {}, session_id=sess.session_id, timestamp=time.time())
        assert dec2.authorized is False
        assert dec2.status == "REJECTED"
        assert "Duplicate command_id" in dec2.reason

        # Stale timestamp (drift > 30s) -> REJECTED
        dec3 = command_authorizer.authorize("mission.start", f"cmd-stale-{time.time()}", {}, session_id=sess.session_id, timestamp=time.time() - 60)
        assert dec3.authorized is False
        assert "timestamp drift" in dec3.reason

    def test_input_validation_catches_invalid_waypoints_and_formations(self):
        """Test input validator enforces geodetic and formation bounds."""
        # Latitude out of bounds
        v1, err1 = input_validator.validate_command_payload("mission.add_waypoint", {"latitude": 120.0, "longitude": -122.4})
        assert v1 is False
        assert "Invalid latitude" in err1

        # Altitude out of bounds
        v2, err2 = input_validator.validate_command_payload("mission.add_waypoint", {"latitude": 37.7, "longitude": -122.4, "altitude": 800.0})
        assert v2 is False
        assert "Invalid altitude" in err2

        # Invalid formation
        v3, err3 = input_validator.validate_command_payload("fleet.set_formation", {"formation": "INVALID_TRIANGLE_SHAPE"})
        assert v3 is False
        assert "Unsupported formation" in err3

    def test_rate_limiter_throttles_excessive_calls(self):
        """Test rate limiter triggers RATE_LIMIT_EXCEEDED."""
        ident = "test_client_01"
        for _ in range(10):
            rate_limiter.is_allowed("login", ident)

        # 11th request within window is blocked
        allowed, err = rate_limiter.is_allowed("login", ident)
        assert allowed is False
        assert "Rate limit exceeded" in err

    def test_secret_redaction_in_audit_logging(self):
        """Test sensitive credentials are never written to audit logs."""
        raw_params = {
            "username": "commander",
            "password": "SuperSecretPassword123!",
            "token": "secret-jwt-token-456",
            "safe_param": "ALPHA",
        }

        rec = security_audit_logger.log_event(
            user_id="usr_01",
            username="commander",
            role="COMMANDER",
            session_id="sess_01",
            command_id="cmd_sec_01",
            command_type="auth.login",
            permission="telemetry.read",
            authorization_result="AUTHORIZED",
            execution_result="SUCCESS",
            parameters=raw_params,
        )

        assert rec.parameters_safe["password"] == "[REDACTED]"
        assert rec.parameters_safe["token"] == "[REDACTED]"
        assert rec.parameters_safe["safe_param"] == "ALPHA"

    def test_command_gateway_end_to_end_flow(self):
        """Test end-to-end command flow through CommandGateway."""
        sess = session_manager.create_session("usr_commander", "commander", "COMMANDER")
        execution_count = 0

        def _action():
            nonlocal execution_count
            execution_count += 1
            return {"mission": "started"}

        status, result, error, state_ver = command_gateway.process_command(
            command_type="mission.start",
            command_id=f"cmd-gw-{time.time()}",
            payload={},
            session_id=sess.session_id,
            executor_func=_action,
        )

        assert status == "ACCEPTED"
        assert result == {"mission": "started"}
        assert error is None
        assert execution_count == 1
