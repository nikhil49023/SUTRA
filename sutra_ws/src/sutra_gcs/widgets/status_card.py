"""
Smart Horizon GCS — Reusable Status Metric Card Widget
Subsystem: UI Layer (Widgets)
"""

from PySide6.QtCore import Qt
from PySide6.QtWidgets import QFrame, QHBoxLayout, QLabel, QVBoxLayout


class StatusCard(QFrame):
    """
    Compact tactical status card displaying a titled metric, primary value,
    status indicator dot, and secondary description.
    """

    def __init__(
        self,
        title: str,
        initial_value: str = "--",
        unit: str = "",
        status_color: str = "#00f2fe",
        parent=None,
    ) -> None:
        super().__init__(parent)
        self.setObjectName("card")
        self.setStyleSheet(
            "QFrame#card { background-color: #0b111e; border: 1px solid #1e293b; border-radius: 4px; padding: 6px; }"
        )

        layout = QVBoxLayout(self)
        layout.setContentsMargins(8, 6, 8, 6)
        layout.setSpacing(2)

        # Header with Title and Dot
        header_layout = QHBoxLayout()
        header_layout.setContentsMargins(0, 0, 0, 0)

        self.dot_label = QLabel("●")
        self.dot_label.setStyleSheet(f"color: {status_color}; font-size: 8px;")
        header_layout.addWidget(self.dot_label)

        self.title_label = QLabel(title.upper())
        self.title_label.setStyleSheet(
            "color: #94a3b8; font-size: 9px; font-weight: bold; letter-spacing: 0.5px;"
        )
        header_layout.addWidget(self.title_label)
        header_layout.addStretch()

        layout.addLayout(header_layout)

        # Value and Unit
        val_layout = QHBoxLayout()
        val_layout.setContentsMargins(0, 0, 0, 0)
        val_layout.setSpacing(4)

        self.value_label = QLabel(initial_value)
        self.value_label.setStyleSheet(
            f"color: {status_color}; font-size: 15px; font-weight: 800;"
        )
        val_layout.addWidget(self.value_label)

        self.unit_label = QLabel(unit)
        self.unit_label.setStyleSheet("color: #64748b; font-size: 10px; font-weight: 600;")
        val_layout.addWidget(self.unit_label)
        val_layout.addStretch()

        layout.addLayout(val_layout)

    def set_value(self, value: str, status_color: str = None) -> None:
        """Updates the metric value and optionally changes the accent color."""
        self.value_label.setText(str(value))
        if status_color:
            self.value_label.setStyleSheet(
                f"color: {status_color}; font-size: 15px; font-weight: 800;"
            )
            self.dot_label.setStyleSheet(f"color: {status_color}; font-size: 8px;")
