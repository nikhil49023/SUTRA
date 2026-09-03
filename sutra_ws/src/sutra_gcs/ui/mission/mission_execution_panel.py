"""
Smart Horizon GCS — Master Autonomous Flight Execution & Simulation Workspace
Subsystem: UI Layer (Mission Execution)
"""

from typing import Optional

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QComboBox,
    QFrame,
    QHBoxLayout,
    QLabel,
    QPushButton,
    QSlider,
    QSplitter,
    QVBoxLayout,
    QWidget,
)

from engine.mission_engine import get_mission_engine
from map.map_widget import MapWidget
from state.application_state import ApplicationState, StateStore, get_state_store
from state.mission_state import MissionStateEnum

from .mission_status import MissionStatusWidget
from .mission_timeline import MissionTimelineWidget
from .preflight_panel import PreflightPanel


class MissionExecutionPanel(QWidget):
    """
    Tactical autonomous flight operations panel. Provides real-time execution controls,
    pre-flight gate verification, speed scaling, live timeline audit, and persistent map visualization.
    """

    def __init__(
        self,
        map_widget: MapWidget,
        state_store: Optional[StateStore] = None,
        parent=None,
    ) -> None:
        super().__init__(parent)
        self.map_widget = map_widget
        self.state_store = state_store or get_state_store()
        self.engine = get_mission_engine()

        layout = QVBoxLayout(self)
        layout.setContentsMargins(6, 6, 6, 6)
        layout.setSpacing(6)

        # 1. Action Toolbar
        toolbar = self._create_toolbar()
        layout.addWidget(toolbar)

        # 2. Main Workspace Splitter
        splitter = QSplitter(Qt.Horizontal)
        splitter.setStyleSheet("QSplitter::handle { background-color: #1e293b; width: 2px; }")

        # Left Container (Status + Preflight + Timeline)
        left_container = QWidget()
        left_layout = QVBoxLayout(left_container)
        left_layout.setContentsMargins(0, 0, 0, 0)
        left_layout.setSpacing(6)

        self.status_widget = MissionStatusWidget(self.state_store, self)
        left_layout.addWidget(self.status_widget)

        self.preflight_panel = PreflightPanel(self)
        left_layout.addWidget(self.preflight_panel)

        self.timeline_widget = MissionTimelineWidget(parent=self)
        left_layout.addWidget(self.timeline_widget, stretch=1)

        splitter.addWidget(left_container)

        # Right Panel Container (Hosts persistent MapWidget)
        self.map_container = QFrame()
        self.map_container.setObjectName("panel")
        self.map_container.setStyleSheet(
            "QFrame#panel { background-color: #050811; border: 1px solid #1e293b; border-radius: 4px; }"
        )
        self.map_container_layout = QVBoxLayout(self.map_container)
        self.map_container_layout.setContentsMargins(0, 0, 0, 0)

        splitter.addWidget(self.map_container)
        splitter.setStretchFactor(0, 4)
        splitter.setStretchFactor(1, 6)

        layout.addWidget(splitter, stretch=1)

        # Subscribe to State Store for dynamic button enabling
        self._unsub_state = self.state_store.subscribe(self._on_state_updated)

    def _create_toolbar(self) -> QFrame:
        bar = QFrame()
        bar.setObjectName("panel")
        bar.setStyleSheet(
            "QFrame#panel { background-color: #0b111e; border: 1px solid #1e293b; border-radius: 4px; padding: 4px; }"
        )
        layout = QHBoxLayout(bar)
        layout.setContentsMargins(6, 4, 6, 4)
        layout.setSpacing(6)

        # Validate
        self.btn_validate = QPushButton("🛡️ VALIDATE")
        self.btn_validate.setStyleSheet(
            "background-color: rgba(0, 242, 254, 0.15); border: 1px solid #00f2fe; color: #00f2fe; font-weight: bold;"
        )
        self.btn_validate.clicked.connect(self._on_validate_clicked)
        layout.addWidget(self.btn_validate)

        # Start / Launch
        self.btn_start = QPushButton("🚀 START MISSION")
        self.btn_start.setStyleSheet(
            "background-color: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; color: #6ee7b7; font-weight: bold; padding: 6px;"
        )
        self.btn_start.clicked.connect(self._on_start_clicked)
        layout.addWidget(self.btn_start)

        # Pause / Resume
        self.btn_pause = QPushButton("⏸️ PAUSE")
        self.btn_pause.clicked.connect(self._on_pause_clicked)
        layout.addWidget(self.btn_pause)

        self.btn_resume = QPushButton("▶️ RESUME")
        self.btn_resume.clicked.connect(self._on_resume_clicked)
        layout.addWidget(self.btn_resume)

        # RTL
        self.btn_rtl = QPushButton("🏠 RTL")
        self.btn_rtl.setStyleSheet(
            "background-color: rgba(245, 158, 11, 0.2); border: 1px solid #f59e0b; color: #fde68a; font-weight: bold;"
        )
        self.btn_rtl.clicked.connect(self._on_rtl_clicked)
        layout.addWidget(self.btn_rtl)

        # Abort
        self.btn_abort = QPushButton("🛑 ABORT")
        self.btn_abort.setStyleSheet(
            "background-color: rgba(239, 68, 68, 0.25); border: 1px solid #ef4444; color: #fca5a5; font-weight: bold;"
        )
        self.btn_abort.clicked.connect(self._on_abort_clicked)
        layout.addWidget(self.btn_abort)

        # Reset
        self.btn_reset = QPushButton("🔄 RESET")
        self.btn_reset.clicked.connect(self._on_reset_clicked)
        layout.addWidget(self.btn_reset)

        # Simulation Speed Multiplier
        layout.addWidget(QLabel("SPEED:"))
        self.combo_speed = QComboBox()
        self.combo_speed.addItem("1x Realtime", 1.0)
        self.combo_speed.addItem("2x Fast", 2.0)
        self.combo_speed.addItem("5x Hyper", 5.0)
        self.combo_speed.currentIndexChanged.connect(self._on_speed_changed)
        layout.addWidget(self.combo_speed)

        # Fit Route
        self.btn_fit = QPushButton("🎯 FIT ROUTE")
        self.btn_fit.clicked.connect(self.map_widget.fit_route)
        layout.addWidget(self.btn_fit)

        layout.addStretch()
        return bar

    def _on_validate_clicked(self) -> None:
        self.engine.validate_mission()
        self.preflight_panel.run_audit()

    def _on_start_clicked(self) -> None:
        self.engine.start()

    def _on_pause_clicked(self) -> None:
        self.engine.pause()

    def _on_resume_clicked(self) -> None:
        self.engine.resume()

    def _on_rtl_clicked(self) -> None:
        self.engine.rtl()

    def _on_abort_clicked(self) -> None:
        self.engine.abort()

    def _on_reset_clicked(self) -> None:
        self.engine.reset()

    def _on_speed_changed(self) -> None:
        val = self.combo_speed.currentData() or 1.0
        self.engine.execution_engine.speed_multiplier = val

    def _on_state_updated(self, state: ApplicationState) -> None:
        curr = state.mission_state.state

        # Update button states based on FSM rules
        self.btn_start.setEnabled(curr in {MissionStateEnum.READY, MissionStateEnum.PLANNING, MissionStateEnum.IDLE})
        self.btn_pause.setEnabled(curr == MissionStateEnum.MISSION)
        self.btn_resume.setEnabled(curr == MissionStateEnum.HOLD)
        self.btn_rtl.setEnabled(curr in {MissionStateEnum.MISSION, MissionStateEnum.HOLD})
        self.btn_abort.setEnabled(curr in {MissionStateEnum.MISSION, MissionStateEnum.HOLD, MissionStateEnum.TAKEOFF, MissionStateEnum.RTL})
        self.btn_reset.setEnabled(curr in {MissionStateEnum.COMPLETE, MissionStateEnum.ABORTED, MissionStateEnum.EMERGENCY})

    def closeEvent(self, event) -> None:
        if hasattr(self, "_unsub_state"):
            self._unsub_state()
        event.accept()
