"""
Smart Horizon GCS — AI Predictions & Subsystem Health Cards Panel
Subsystem: UI / AI Layer (Phase 10)
"""

from typing import Optional
from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QFrame,
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QVBoxLayout,
    QWidget,
)

from state.application_state import ApplicationState, StateStore, get_state_store


class PredictionPanel(QWidget):
    """
    Displays real-time regression predictions for battery endurance, mission ETA, and subsystem faults.
    """

    def __init__(self, state_store: Optional[StateStore] = None, parent=None) -> None:
        super().__init__(parent)
        self.state_store = state_store or get_state_store()

        self._init_ui()
        self._unsub_state = self.state_store.subscribe(self._on_state_updated)

    def _init_ui(self) -> None:
        layout = QVBoxLayout(self)
        layout.setContentsMargins(8, 8, 8, 8)
        layout.setSpacing(6)

        hdr = QLabel("PREDICTIVE TELEMETRY MODELS")
        hdr.setStyleSheet("color: #00f2fe; font-size: 11px; font-weight: 800; letter-spacing: 1px;")
        layout.addWidget(hdr)

        grid = QGridLayout()
        grid.setSpacing(6)

        # 1. Battery Card
        self.bat_card = self._create_card("BATTERY ENDURANCE", "Predicted Landing: --%", "Drain Rate: -- %/min")
        grid.addWidget(self.bat_card, 0, 0)

        # 2. ETA Card
        self.eta_card = self._create_card("MISSION ETA", "Completion: --:--", "Avg Speed: -- m/s")
        grid.addWidget(self.eta_card, 0, 1)

        # 3. Route Risk Card
        self.route_card = self._create_card("ROUTE KINEMATICS", "Risk Level: LOW", "Hazards: 0")
        grid.addWidget(self.route_card, 1, 0)

        # 4. Fault Card
        self.fault_card = self._create_card("FAULT PROBABILITY", "Status: NOMINAL", "Failures: 0 Detected")
        grid.addWidget(self.fault_card, 1, 1)

        layout.addLayout(grid)
        layout.addStretch()

    def _create_card(self, title: str, line1: str, line2: str) -> QFrame:
        card = QFrame()
        card.setStyleSheet(
            "QFrame { background-color: #090e1a; border: 1px solid #1e293b; border-radius: 4px; padding: 6px; }"
        )
        l = QVBoxLayout(card)
        l.setContentsMargins(6, 6, 6, 6)
        l.setSpacing(2)

        t_lbl = QLabel(title)
        t_lbl.setObjectName("title")
        t_lbl.setStyleSheet("color: #64748b; font-size: 8px; font-weight: bold;")
        l.addWidget(t_lbl)

        v1 = QLabel(line1)
        v1.setObjectName("line1")
        v1.setStyleSheet("color: #f1f5f9; font-size: 10px; font-weight: bold; font-family: monospace;")
        l.addWidget(v1)

        v2 = QLabel(line2)
        v2.setObjectName("line2")
        v2.setStyleSheet("color: #94a3b8; font-size: 9px;")
        l.addWidget(v2)

        return card

    def _on_state_updated(self, state: ApplicationState) -> None:
        ai = state.ai_state

        # Update Battery Card
        drone_id = state.telemetry_state.drone_id
        if drone_id in ai.battery_predictions:
            bp = ai.battery_predictions[drone_id]
            self.bat_card.findChild(QLabel, "line1").setText(f"Landing: {bp.predicted_landing_pct:.0f}% (RTH: {bp.predicted_rth_pct:.0f}%)")
            self.bat_card.findChild(QLabel, "line2").setText(f"Drain Rate: {bp.discharge_rate_pct_per_min:.1f}%/min ({bp.confidence*100:.0f}% conf)")

        # Update ETA Card
        if drone_id in ai.eta_predictions:
            ep = ai.eta_predictions[drone_id]
            mins = int(ep.eta_to_mission_end_sec // 60)
            secs = int(ep.eta_to_mission_end_sec % 60)
            self.eta_card.findChild(QLabel, "line1").setText(f"Completion: {mins:02d}:{secs:02d}")
            self.eta_card.findChild(QLabel, "line2").setText(f"Avg Speed: {ep.average_speed_mps:.1f} m/s ({ep.confidence*100:.0f}% conf)")

        # Update Route Risk Card
        if ai.route_prediction:
            rp = ai.route_prediction
            self.route_card.findChild(QLabel, "line1").setText(f"Risk Level: {rp.risk_level}")
            self.route_card.findChild(QLabel, "line2").setText(f"Hazards: {rp.hazard_count} Detected")

        # Update Fault Card
        f_count = len(ai.failure_predictions)
        status_str = "NOMINAL" if f_count == 0 else f"{f_count} WARNINGS"
        self.fault_card.findChild(QLabel, "line1").setText(f"Avionics: {status_str}")
        self.fault_card.findChild(QLabel, "line2").setText(f"Degradation Flags: {f_count}")

    def closeEvent(self, event) -> None:
        if hasattr(self, "_unsub_state"):
            self._unsub_state()
        event.accept()
