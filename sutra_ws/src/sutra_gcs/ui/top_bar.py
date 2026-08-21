"""
Smart Horizon GCS — Top Bar Header Component
Subsystem: UI Layer
"""

import time
from typing import Optional

from PySide6.QtCore import Qt, QTimer
from PySide6.QtWidgets import (
    QFrame,
    QHBoxLayout,
    QLabel,
    QPushButton,
    QWidget,
)

from config.settings import Settings, get_settings
from services.event_bus import EventBus, EventNames, get_event_bus
from services.logging_service import get_logger
from state.alert_state import Alert, AlertSeverity
from state.application_state import ApplicationState, StateStore, get_state_store


class TopBar(QFrame):
    """
    Tactical Operations Header displaying global mission status, swarm telemetry summary,
    real-time clock, FPS counter, and Master Emergency Kill switch.
    """

    def __init__(
        self,
        state_store: Optional[StateStore] = None,
        event_bus: Optional[EventBus] = None,
        settings: Optional[Settings] = None,
        parent=None,
    ) -> None:
        super().__init__(parent)
        self.state_store = state_store or get_state_store()
        self.event_bus = event_bus or get_event_bus()
        self.settings = settings or get_settings()
        self.logger = get_logger("top_bar")

        self.setObjectName("panel")
        self.setFixedHeight(44)
        self.setStyleSheet(
            "QFrame#panel { background-color: #090e1a; border-bottom: 1px solid #1e293b; }"
        )

        layout = QHBoxLayout(self)
        layout.setContentsMargins(12, 4, 12, 4)
        layout.setSpacing(12)

        # 1. Brand & Title
        brand_layout = QHBoxLayout()
        brand_layout.setSpacing(6)

        pulse_dot = QLabel("●")
        pulse_dot.setStyleSheet("color: #00f2fe; font-size: 10px;")
        brand_layout.addWidget(pulse_dot)

        brand_lbl = QLabel(self.settings.APP_NAME.upper())
        brand_lbl.setStyleSheet(
            "color: #00f2fe; font-size: 12px; font-weight: 800; letter-spacing: 1px;"
        )
        brand_layout.addWidget(brand_lbl)

        ver_lbl = QLabel(f"v{self.settings.APP_VERSION}")
        ver_lbl.setStyleSheet(
            "color: #64748b; font-size: 9px; background-color: #111827; padding: 2px 4px; border-radius: 3px;"
        )
        brand_layout.addWidget(ver_lbl)

        layout.addLayout(brand_layout)
        layout.addSpacing(8)

        # 2. Mission Status Pill
        self.mission_lbl = QLabel("MISSION: DEFAULT [IDLE]")
        self.mission_lbl.setStyleSheet(
            "color: #94a3b8; font-size: 10px; font-weight: bold; background-color: #0b111e; border: 1px solid #1e293b; padding: 3px 8px; border-radius: 3px;"
        )
        layout.addWidget(self.mission_lbl)

        # 3. Connected Drone Count Pill
        self.drones_lbl = QLabel("DRONES: 0 ACTIVE")
        self.drones_lbl.setStyleSheet(
            "color: #38bdf8; font-size: 10px; font-weight: bold; background-color: #0b111e; border: 1px solid #1e293b; padding: 3px 8px; border-radius: 3px;"
        )
        layout.addWidget(self.drones_lbl)

        # 4. GPS & Satellites Pill
        self.gps_lbl = QLabel("GPS: 3D FIX (18 SAT)")
        self.gps_lbl.setStyleSheet(
            "color: #10b981; font-size: 10px; font-weight: bold; background-color: #0b111e; border: 1px solid #1e293b; padding: 3px 8px; border-radius: 3px;"
        )
        layout.addWidget(self.gps_lbl)

        # 5. Swarm Battery Average Pill
        self.battery_lbl = QLabel("BATTERY: 100%")
        self.battery_lbl.setStyleSheet(
            "color: #10b981; font-size: 10px; font-weight: bold; background-color: #0b111e; border: 1px solid #1e293b; padding: 3px 8px; border-radius: 3px;"
        )
        layout.addWidget(self.battery_lbl)

        # 6. Comms Link Pill
        self.comms_lbl = QLabel("LINK: CONNECTED (10 Hz)")
        self.comms_lbl.setStyleSheet(
            "color: #10b981; font-size: 10px; font-weight: bold; background-color: #0b111e; border: 1px solid #1e293b; padding: 3px 8px; border-radius: 3px;"
        )
        layout.addWidget(self.comms_lbl)

        layout.addStretch()

        # 7. FPS Counter & Clock
        self.fps_lbl = QLabel("60 FPS")
        self.fps_lbl.setStyleSheet("color: #64748b; font-size: 9px; font-weight: bold;")
        layout.addWidget(self.fps_lbl)

        self.clock_lbl = QLabel(time.strftime("%H:%M:%S UTC"))
        self.clock_lbl.setStyleSheet(
            "color: #e2e8f0; font-size: 11px; font-weight: bold; font-family: monospace;"
        )
        layout.addWidget(self.clock_lbl)

        # 8. Emergency Kill Button
        self.emergency_btn = QPushButton("🛑 EMERGENCY")
        self.emergency_btn.setObjectName("emergency_btn")
        self.emergency_btn.setStyleSheet(
            "background-color: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #fca5a5; font-weight: 800; padding: 4px 12px; border-radius: 4px;"
        )
        self.emergency_btn.clicked.connect(self._on_emergency_clicked)
        layout.addWidget(self.emergency_btn)

        # 1-Second Timer for Clock & Metrics Update
        self.timer = QTimer(self)
        self.timer.timeout.connect(self._on_timer_tick)
        self.timer.start(1000)

        # Subscribe to State Store
        self._unsub_state = self.state_store.subscribe(self._on_state_updated)

    def _on_timer_tick(self) -> None:
        self.clock_lbl.setText(time.strftime("%H:%M:%S UTC"))

    def _on_state_updated(self, state: ApplicationState) -> None:
        # Update mission summary
        m = state.mission_state
        self.mission_lbl.setText(f"MISSION: {m.mission_name.upper()} [{m.state.value}]")

        # Update drone count
        drones = state.fleet_state.get_all_drones()
        count = len(drones)
        self.drones_lbl.setText(f"DRONES: {count} ACTIVE")

        # Update battery average
        if drones:
            avg_bat = sum(d.battery for d in drones) / len(drones)
            bat_color = "#10b981" if avg_bat > 40 else ("#f59e0b" if avg_bat > 20 else "#ef4444")
            self.battery_lbl.setText(f"BATTERY: {avg_bat:.0f}%")
            self.battery_lbl.setStyleSheet(
                f"color: {bat_color}; font-size: 10px; font-weight: bold; background-color: #0b111e; border: 1px solid #1e293b; padding: 3px 8px; border-radius: 3px;"
            )

        # Update GPS
        telem = state.telemetry_state
        self.gps_lbl.setText(f"GPS: {telem.satellites} SAT (FIX: {telem.gps_fix}D)")

    def _on_emergency_clicked(self) -> None:
        """Triggers emergency safety interlock."""
        self.logger.critical("EMERGENCY ALL-STOP TRIGGERED FROM TOPBAR", extra={"source": "top_bar"})

        # 1. Create EMERGENCY alert
        emergency_alert = Alert(
            severity=AlertSeverity.EMERGENCY,
            title="EMERGENCY ABORT ENGAGED",
            message="Operator initiated emergency all-stop. Motors disarmed and RTL override active.",
            source="top_bar_button",
        )
        self.state_store.update_state(
            lambda s: s.alert_state.add_alert(emergency_alert) and s  # or functional update
        )

        # 2. Emit system emergency event on EventBus
        self.event_bus.emit(
            "system.emergency",
            payload={"action": "EMERGENCY_STOP", "timestamp": time.time()},
            source="top_bar",
        )
        self.event_bus.emit(
            EventNames.ALERT_CREATED,
            payload={"alert_id": emergency_alert.alert_id, "severity": "EMERGENCY"},
            source="top_bar",
        )

    def closeEvent(self, event) -> None:
        if hasattr(self, "_unsub_state"):
            self._unsub_state()
        event.accept()
