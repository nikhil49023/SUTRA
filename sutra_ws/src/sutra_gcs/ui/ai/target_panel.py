"""
Smart Horizon GCS — AI Target Tracker & Object Detection Panel
Subsystem: UI / AI Layer (Phase 10)
"""

from typing import Optional
from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QHeaderView,
    QLabel,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
)

from state.application_state import ApplicationState, StateStore, get_state_store


class TargetPanel(QWidget):
    """
    Displays multi-object spatial tracks (SAR victims, hazard flare targets, obstacles).
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

        hdr = QLabel("SPATIAL TARGET TRACKING")
        hdr.setStyleSheet("color: #00f2fe; font-size: 11px; font-weight: 800; letter-spacing: 1px;")
        layout.addWidget(hdr)

        self.table = QTableWidget(0, 5, self)
        self.table.setHorizontalHeaderLabels(["ID", "LABEL", "LAT / LON", "SPEED", "CONFIDENCE"])
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        self.table.verticalHeader().setVisible(False)
        self.table.setStyleSheet(
            "QTableWidget { background-color: #090e1a; border: 1px solid #1e293b; color: #f1f5f9; font-size: 9px; } "
            "QHeaderView::section { background-color: #0f172a; color: #94a3b8; border: 1px solid #1e293b; font-weight: bold; padding: 4px; }"
        )
        layout.addWidget(self.table)

        self.empty_lbl = QLabel("TARGET DATA UNAVAILABLE (NO SENSORS ATTACHED)")
        self.empty_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.empty_lbl.setStyleSheet("color: #64748b; font-size: 10px; font-weight: bold; padding: 12px;")
        layout.addWidget(self.empty_lbl)

    def _on_state_updated(self, state: ApplicationState) -> None:
        targets = state.ai_state.tracked_targets
        if not targets:
            self.table.setRowCount(0)
            self.empty_lbl.setVisible(True)
            self.table.setVisible(False)
            return

        self.empty_lbl.setVisible(False)
        self.table.setVisible(True)
        self.table.setRowCount(len(targets))

        for row, t in enumerate(targets):
            self.table.setItem(row, 0, QTableWidgetItem(t.target_id))
            self.table.setItem(row, 1, QTableWidgetItem(t.label))
            self.table.setItem(row, 2, QTableWidgetItem(f"{t.latitude:.5f}, {t.longitude:.5f}"))
            self.table.setItem(row, 3, QTableWidgetItem(f"{t.speed_mps:.1f} m/s"))
            self.table.setItem(row, 4, QTableWidgetItem(f"{t.confidence*100:.0f}%"))

    def closeEvent(self, event) -> None:
        if hasattr(self, "_unsub_state"):
            self._unsub_state()
        event.accept()
