"""
Smart Horizon GCS — Left Sidebar Navigation Component
Subsystem: UI Layer
"""

from typing import Dict, Optional

from PySide6.QtCore import Qt, Signal
from PySide6.QtWidgets import (
    QFrame,
    QLabel,
    QPushButton,
    QVBoxLayout,
    QWidget,
)


class LeftSidebar(QFrame):
    """
    Vertical tactical navigation sidebar supporting quick module switching.
    """

    navigation_requested = Signal(str)

    NAV_ITEMS = [
        ("DASHBOARD", "dashboard", "📊"),
        ("MISSION", "mission", "🗺️"),
        ("GIS INTELLIGENCE", "gis", "🌐"),
        ("FLEET", "fleet", "🚁"),
        ("LIVE OPERATIONS", "live_ops", "⚡"),
        ("AI INTEL", "ai", "🧠"),
        ("SETTINGS", "settings", "⚙️"),
    ]

    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        self.setObjectName("panel")
        self.setFixedWidth(190)
        self.setStyleSheet(
            "QFrame#panel { background-color: #090e1a; border-right: 1px solid #1e293b; }"
        )

        layout = QVBoxLayout(self)
        layout.setContentsMargins(8, 12, 8, 12)
        layout.setSpacing(4)

        # Section Header
        hdr_lbl = QLabel("OPERATIONS CENTER")
        hdr_lbl.setStyleSheet(
            "color: #64748b; font-size: 8px; font-weight: bold; letter-spacing: 1px; padding-left: 6px; padding-bottom: 6px;"
        )
        layout.addWidget(hdr_lbl)

        # Navigation Buttons
        self.buttons: Dict[str, QPushButton] = {}
        self.active_key = "dashboard"

        for label_text, key, icon in self.NAV_ITEMS:
            btn = QPushButton(f"{icon}  {label_text}")
            btn.setObjectName("nav_btn_active" if key == "dashboard" else "nav_btn")
            btn.setCursor(Qt.PointingHandCursor)
            btn.clicked.connect(lambda checked=False, k=key: self._on_btn_clicked(k))
            layout.addWidget(btn)
            self.buttons[key] = btn

        layout.addStretch()

        # System Health Indicator Box
        health_frame = QFrame()
        health_frame.setStyleSheet(
            "background-color: #0b111e; border: 1px solid #1e293b; border-radius: 4px; padding: 6px;"
        )
        h_layout = QVBoxLayout(health_frame)
        h_layout.setContentsMargins(6, 6, 6, 6)
        h_layout.setSpacing(3)

        sys_lbl = QLabel("SYSTEM HEALTH: OPTIMAL")
        sys_lbl.setStyleSheet("color: #10b981; font-size: 8px; font-weight: bold;")
        h_layout.addWidget(sys_lbl)

        radio_lbl = QLabel("TELEMETRY: 57600 BAUD")
        radio_lbl.setStyleSheet("color: #94a3b8; font-size: 8px;")
        h_layout.addWidget(radio_lbl)

        layout.addWidget(health_frame)

    def _on_btn_clicked(self, key: str) -> None:
        self.set_active(key)
        self.navigation_requested.emit(key)

    def set_active(self, key: str) -> None:
        """Updates active styling on navigation items."""
        self.active_key = key
        for k, btn in self.buttons.items():
            if k == key:
                btn.setStyleSheet(
                    "text-align: left; padding: 10px 14px; border-left: 3px solid #00f2fe; background-color: rgba(0, 242, 254, 0.12); color: #00f2fe; font-size: 11px; font-weight: bold; border-radius: 3px;"
                )
            else:
                btn.setStyleSheet(
                    "text-align: left; padding: 10px 14px; border: none; background-color: transparent; color: #94a3b8; font-size: 11px; font-weight: bold; border-radius: 3px;"
                )
