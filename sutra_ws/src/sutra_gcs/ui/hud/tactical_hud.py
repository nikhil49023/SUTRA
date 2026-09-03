"""
Smart Horizon GCS — Tactical HUD Workspace with Multi-Drone Fleet Strip & Fullscreen Mode
Subsystem: UI / HUD Layer (Phase 9)
"""

from typing import Dict, Optional
from PySide6.QtCore import Qt
from PySide6.QtGui import QKeySequence, QShortcut
from PySide6.QtWidgets import (
    QFrame,
    QHBoxLayout,
    QLabel,
    QPushButton,
    QVBoxLayout,
    QWidget,
)

from hud.hud_controller import HUDController, hud_controller
from hud.models import HUDModel
from state.application_state import ApplicationState, StateStore, get_state_store
from .primary_flight_display import PrimaryFlightDisplay


class TacticalHUD(QWidget):
    """
    Dedicated full-screen tactical flight deck workspace with interactive aircraft selection strip.
    """

    def __init__(
        self,
        state_store: Optional[StateStore] = None,
        controller: Optional[HUDController] = None,
        parent=None,
    ) -> None:
        super().__init__(parent)
        self.state_store = state_store or get_state_store()
        self.controller = controller or hud_controller
        self._is_fullscreen = False
        self._drone_buttons: Dict[str, QPushButton] = {}

        self._init_ui()

        # Keyboard Shortcut to exit fullscreen (ESC)
        self._esc_shortcut = QShortcut(QKeySequence(Qt.Key.Key_Escape), self)
        self._esc_shortcut.activated.connect(self._exit_fullscreen)

        # Subscribe to StateStore for fleet changes
        self._unsub_state = self.state_store.subscribe(self._on_fleet_state_updated)

    def _init_ui(self) -> None:
        layout = QVBoxLayout(self)
        layout.setContentsMargins(12, 12, 12, 12)
        layout.setSpacing(8)

        # 1. Top Action Toolbar & Swarm Selector Strip
        toolbar = QHBoxLayout()
        toolbar.setSpacing(8)

        title_lbl = QLabel("TACTICAL HUD & PFD")
        title_lbl.setStyleSheet("color: #00f2fe; font-weight: 800; font-size: 13px; letter-spacing: 1px;")
        toolbar.addWidget(title_lbl)
        toolbar.addSpacing(12)

        # Fleet Selector Buttons Container
        self.fleet_container = QHBoxLayout()
        self.fleet_container.setSpacing(6)
        toolbar.addLayout(self.fleet_container)

        toolbar.addStretch()

        # Fullscreen Toggle Button
        self.fs_btn = QPushButton("⛶ FULLSCREEN")
        self.fs_btn.setStyleSheet(
            "background-color: #1e293b; color: #38bdf8; border: 1px solid #334155; padding: 4px 10px; border-radius: 4px; font-weight: bold;"
        )
        self.fs_btn.clicked.connect(self._toggle_fullscreen)
        toolbar.addWidget(self.fs_btn)

        layout.addLayout(toolbar)

        # 2. Main PFD Instrument
        self.pfd = PrimaryFlightDisplay(controller=self.controller, parent=self)
        layout.addWidget(self.pfd, stretch=1)

    def _on_fleet_state_updated(self, state: ApplicationState) -> None:
        drones = state.fleet_state.get_all_drones()

        # Rebuild fleet strip if drone list changed
        current_ids = set(self._drone_buttons.keys())
        new_ids = {d.drone_id for d in drones}

        if current_ids != new_ids:
            # Clear old buttons
            for btn in self._drone_buttons.values():
                btn.deleteLater()
            self._drone_buttons.clear()

            for d in drones:
                btn = QPushButton(f"{d.callsign.split()[0]} ({d.battery:.0f}%)")
                btn.setCheckable(True)
                btn.setChecked(d.drone_id == self.controller.selected_drone_id)
                btn.setStyleSheet(
                    "QPushButton { background-color: #0f172a; color: #94a3b8; border: 1px solid #1e293b; padding: 3px 8px; border-radius: 3px; font-size: 10px; font-weight: bold; } "
                    "QPushButton:checked { background-color: #0284c7; color: #ffffff; border-color: #38bdf8; }"
                )
                btn.clicked.connect(lambda checked=False, d_id=d.drone_id: self._select_drone(d_id))
                self.fleet_container.addWidget(btn)
                self._drone_buttons[d.drone_id] = btn

    def _select_drone(self, drone_id: str) -> None:
        self.controller.set_selected_drone(drone_id)
        for d_id, btn in self._drone_buttons.items():
            btn.setChecked(d_id == drone_id)

    def _toggle_fullscreen(self) -> None:
        if not self._is_fullscreen:
            self.setWindowFlags(Qt.WindowType.Window)
            self.showFullScreen()
            self._is_fullscreen = True
            self.fs_btn.setText("🗗 EXIT FULLSCREEN (ESC)")
        else:
            self._exit_fullscreen()

    def _exit_fullscreen(self) -> None:
        if self._is_fullscreen:
            self.setWindowFlags(Qt.WindowType.Widget)
            self.showNormal()
            self._is_fullscreen = False
            self.fs_btn.setText("⛶ FULLSCREEN")

    def closeEvent(self, event) -> None:
        if hasattr(self, "_unsub_state"):
            self._unsub_state()
        event.accept()

