"""
Smart Horizon GCS — AI Decision Support & Tactical Intelligence Workspace Panel
Subsystem: UI / AI Layer (Phase 10)
"""

from typing import Optional
from PySide6.QtCore import Qt, QTimer
from PySide6.QtWidgets import (
    QComboBox,
    QFrame,
    QHBoxLayout,
    QLabel,
    QPushButton,
    QSplitter,
    QVBoxLayout,
    QWidget,
)

from ai.ai_manager import AIManager, ai_manager
from state.ai_state import AIMode
from state.application_state import ApplicationState, StateStore, get_state_store
from .ai_command_panel import AICommandPanel
from .mission_advisor_panel import MissionAdvisorPanel
from .prediction_panel import PredictionPanel
from .target_panel import TargetPanel
from .threat_panel import ThreatPanel


class AIPanel(QWidget):
    """
    Main integrated tactical AI workspace hosting conversational advisor, predictive analytics,
    threat matrices, and operator approval controls.
    """

    def __init__(
        self,
        state_store: Optional[StateStore] = None,
        manager: Optional[AIManager] = None,
        parent=None,
    ) -> None:
        super().__init__(parent)
        self.state_store = state_store or get_state_store()
        self.manager = manager or ai_manager

        self._init_ui()

        # Periodic non-blocking AI analysis timer (2 Hz)
        self._timer = QTimer(self)
        self._timer.setInterval(1000)
        self._timer.timeout.connect(self._on_timer_tick)
        self._timer.start()

        self._unsub_state = self.state_store.subscribe(self._on_state_updated)

    def _init_ui(self) -> None:
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(8, 8, 8, 8)
        main_layout.setSpacing(6)

        # 1. Top Control Bar
        top_bar = QFrame()
        top_bar.setStyleSheet("QFrame { background-color: #0b111e; border: 1px solid #1e293b; border-radius: 4px; padding: 4px; }")
        tb_layout = QHBoxLayout(top_bar)
        tb_layout.setContentsMargins(6, 4, 6, 4)

        title = QLabel("🧠 SUTRA TACTICAL AI DECISION SUPPORT")
        title.setStyleSheet("color: #38bdf8; font-size: 11px; font-weight: bold;")
        tb_layout.addWidget(title)

        tb_layout.addStretch()

        mode_lbl = QLabel("MODE:")
        mode_lbl.setStyleSheet("color: #64748b; font-size: 9px; font-weight: bold;")
        tb_layout.addWidget(mode_lbl)

        self.mode_combo = QComboBox()
        for m in [AIMode.ADVISORY, AIMode.ASSISTED, AIMode.SIMULATION, AIMode.DISABLED]:
            self.mode_combo.addItem(m.value, m)
        self.mode_combo.setStyleSheet(
            "background-color: #090e1a; color: #38bdf8; border: 1px solid #334155; font-size: 9px; font-weight: bold; padding: 2px 8px; border-radius: 3px;"
        )
        tb_layout.addWidget(self.mode_combo)

        self.run_audit_btn = QPushButton("⚡ RUN AI AUDIT")
        self.run_audit_btn.setStyleSheet(
            "background-color: #0284c7; color: white; font-size: 9px; font-weight: bold; padding: 4px 10px; border-radius: 3px; border: none;"
        )
        self.run_audit_btn.clicked.connect(self._run_audit)
        tb_layout.addWidget(self.run_audit_btn)

        main_layout.addWidget(top_bar)

        # 2. Main Content Splitter
        splitter = QSplitter(Qt.Orientation.Horizontal, self)

        # Left Column (Assistant + Predictions)
        left_col = QWidget()
        l_layout = QVBoxLayout(left_col)
        l_layout.setContentsMargins(0, 0, 0, 0)
        l_layout.setSpacing(6)

        self.advisor_panel = MissionAdvisorPanel(self.state_store, self.manager, self)
        l_layout.addWidget(self.advisor_panel, stretch=2)

        self.pred_panel = PredictionPanel(self.state_store, self)
        l_layout.addWidget(self.pred_panel, stretch=1)

        splitter.addWidget(left_col)

        # Right Column (Decision Approval + Threat Matrix + Targets)
        right_col = QWidget()
        r_layout = QVBoxLayout(right_col)
        r_layout.setContentsMargins(0, 0, 0, 0)
        r_layout.setSpacing(6)

        self.cmd_panel = AICommandPanel(self.state_store, self.manager, self)
        r_layout.addWidget(self.cmd_panel, stretch=2)

        self.threat_panel = ThreatPanel(self.state_store, self)
        r_layout.addWidget(self.threat_panel, stretch=1)

        self.target_panel = TargetPanel(self.state_store, self)
        r_layout.addWidget(self.target_panel, stretch=1)

        splitter.addWidget(right_col)

        splitter.setStretchFactor(0, 3)
        splitter.setStretchFactor(1, 4)
        main_layout.addWidget(splitter, stretch=1)

    def _run_audit(self) -> None:
        self.manager.run_full_analysis()

    def _on_timer_tick(self) -> None:
        # Periodic predictive updates
        self.manager.run_full_analysis()

    def _on_state_updated(self, state: ApplicationState) -> None:
        pass

    def closeEvent(self, event) -> None:
        if self._timer.isActive():
            self._timer.stop()
        if hasattr(self, "_unsub_state"):
            self._unsub_state()
        event.accept()
