"""
Smart Horizon GCS — Pre-Flight Checklist & Airspace Clearance Audit Dialog
Subsystem: UI Layer (Mission Execution)
"""

from typing import Optional

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QFrame,
    QHBoxLayout,
    QLabel,
    QProgressBar,
    QPushButton,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
)

from engine.mission_engine import get_mission_engine
from engine.models import PreflightItemStatus


class PreflightPanel(QFrame):
    """
    Comprehensive Pre-Flight Readiness Checklist and Airworthiness Gate audit view.
    """

    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        self.setObjectName("panel")
        self.setStyleSheet(
            "QFrame#panel { background-color: #090e1a; border: 1px solid #1e293b; border-radius: 4px; padding: 6px; }"
        )

        layout = QVBoxLayout(self)
        layout.setContentsMargins(6, 6, 6, 6)
        layout.setSpacing(6)

        hdr_lbl = QLabel("PRE-FLIGHT READINESS AUDIT")
        hdr_lbl.setStyleSheet(
            "color: #00f2fe; font-size: 10px; font-weight: bold; border-bottom: 1px solid #1e293b; padding-bottom: 4px;"
        )
        layout.addWidget(hdr_lbl)

        # Audit Table
        self.table = QTableWidget()
        self.table.setColumnCount(3)
        self.table.setHorizontalHeaderLabels(["CHECK ITEM", "STATUS", "DETAILS"])
        self.table.setEditTriggers(QTableWidget.NoEditTriggers)
        self.table.horizontalHeader().setStretchLastSection(True)
        self.table.setStyleSheet(
            "QTableWidget { background-color: #050811; border: 1px solid #1e293b; gridline-color: #1e293b; font-size: 10px; } "
            "QHeaderView::section { background-color: #0b111e; color: #94a3b8; padding: 4px; font-weight: bold; border: 1px solid #1e293b; font-size: 9px; }"
        )
        layout.addWidget(self.table)

        # Action Buttons
        btn_layout = QHBoxLayout()
        self.btn_run_audit = QPushButton("🛡️ RUN PRE-FLIGHT AUDIT")
        self.btn_run_audit.setStyleSheet(
            "background-color: rgba(0, 242, 254, 0.15); border: 1px solid #00f2fe; color: #00f2fe; font-weight: bold; padding: 6px;"
        )
        self.btn_run_audit.clicked.connect(self.run_audit)
        btn_layout.addWidget(self.btn_run_audit)

        layout.addLayout(btn_layout)

        # Run initial audit
        self.run_audit()

    def run_audit(self) -> None:
        """Executes full pre-flight checklist."""
        engine = get_mission_engine()
        report = engine.generate_preflight()

        self.table.setRowCount(len(report.items))
        for i, item in enumerate(report.items):
            item_name = QTableWidgetItem(item.name)
            item_status = QTableWidgetItem(item.status.value)
            item_msg = QTableWidgetItem(item.message)

            for it in (item_name, item_status):
                it.setTextAlignment(Qt.AlignCenter)

            if item.status == PreflightItemStatus.PASS:
                item_status.setForeground(Qt.GlobalColor.green)
            elif item.status == PreflightItemStatus.WARNING:
                item_status.setForeground(Qt.GlobalColor.yellow)
            else:
                item_status.setForeground(Qt.GlobalColor.red)

            self.table.setItem(i, 0, item_name)
            self.table.setItem(i, 1, item_status)
            self.table.setItem(i, 2, item_msg)
