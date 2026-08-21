"""
Smart Horizon GCS — Reusable Alert Item Card Widget
Subsystem: UI Layer (Widgets)
"""

from PySide6.QtCore import Qt, Signal
from PySide6.QtWidgets import QFrame, QHBoxLayout, QLabel, QPushButton, QVBoxLayout

from state.alert_state import Alert, AlertSeverity


class AlertCard(QFrame):
    """
    Compact tactical alert notification card with severity color badge,
    context description, and acknowledgement button.
    """

    acknowledged_clicked = Signal(str)

    def __init__(self, alert: Alert, parent=None) -> None:
        super().__init__(parent)
        self.alert_id = alert.alert_id
        self.setObjectName("card")

        color_map = {
            AlertSeverity.INFO: "#38bdf8",
            AlertSeverity.WARNING: "#f59e0b",
            AlertSeverity.CRITICAL: "#ef4444",
            AlertSeverity.EMERGENCY: "#dc2626",
        }
        accent = color_map.get(alert.severity, "#94a3b8")

        self.setStyleSheet(
            f"QFrame#card {{ background-color: #0b111e; border: 1px solid {accent}; border-left: 4px solid {accent}; border-radius: 4px; padding: 4px; }}"
        )

        layout = QVBoxLayout(self)
        layout.setContentsMargins(6, 4, 6, 4)
        layout.setSpacing(2)

        # Header: Severity + Title + Ack button
        hdr_layout = QHBoxLayout()
        hdr_layout.setContentsMargins(0, 0, 0, 0)

        badge = QLabel(f"[{alert.severity.value}]")
        badge.setStyleSheet(f"color: {accent}; font-weight: 800; font-size: 9px;")
        hdr_layout.addWidget(badge)

        title_lbl = QLabel(alert.title)
        title_lbl.setStyleSheet("color: #f8fafc; font-weight: bold; font-size: 10px;")
        hdr_layout.addWidget(title_lbl)
        hdr_layout.addStretch()

        if not alert.acknowledged:
            ack_btn = QPushButton("ACK")
            ack_btn.setStyleSheet(
                "background-color: #1e293b; color: #94a3b8; border: 1px solid #334155; font-size: 8px; padding: 2px 6px; border-radius: 2px;"
            )
            ack_btn.clicked.connect(lambda: self.acknowledged_clicked.emit(self.alert_id))
            hdr_layout.addWidget(ack_btn)
        else:
            ack_lbl = QLabel("✓ ACKED")
            ack_lbl.setStyleSheet("color: #10b981; font-size: 8px; font-weight: bold;")
            hdr_layout.addWidget(ack_lbl)

        layout.addLayout(hdr_layout)

        # Message & Source
        msg_lbl = QLabel(alert.message)
        msg_lbl.setStyleSheet("color: #94a3b8; font-size: 9px;")
        msg_lbl.setWordWrap(True)
        layout.addWidget(msg_lbl)

        src_lbl = QLabel(f"Source: {alert.source}" + (f" | Drone: {alert.drone_id}" if alert.drone_id else ""))
        src_lbl.setStyleSheet("color: #64748b; font-size: 8px;")
        layout.addWidget(src_lbl)
