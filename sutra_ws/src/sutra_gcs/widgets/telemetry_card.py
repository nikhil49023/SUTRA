"""
Smart Horizon GCS — Reusable Live Telemetry Card Widget
Subsystem: UI Layer (Widgets)
"""

from PySide6.QtCore import Qt
from PySide6.QtWidgets import QFrame, QGridLayout, QLabel, QVBoxLayout


class TelemetryCard(QFrame):
    """
    Grid-aligned multi-parameter telemetry display card.
    """

    def __init__(self, title: str = "AVIONICS READOUT", parent=None) -> None:
        super().__init__(parent)
        self.setObjectName("card")
        self.setStyleSheet(
            "QFrame#card { background-color: #0b111e; border: 1px solid #1e293b; border-radius: 4px; padding: 6px; }"
        )

        layout = QVBoxLayout(self)
        layout.setContentsMargins(8, 6, 8, 6)
        layout.setSpacing(6)

        title_lbl = QLabel(title.upper())
        title_lbl.setStyleSheet(
            "color: #00f2fe; font-size: 10px; font-weight: bold; border-bottom: 1px solid #1e293b; padding-bottom: 2px;"
        )
        layout.addWidget(title_lbl)

        grid = QGridLayout()
        grid.setContentsMargins(0, 0, 0, 0)
        grid.setSpacing(6)

        # Field definitions
        self.fields = {}
        items = [
            ("ALT AGL", "alt_agl", "0.0 m", 0, 0),
            ("GND SPD", "speed", "0.0 m/s", 0, 1),
            ("V SPEED", "climb", "0.0 m/s", 1, 0),
            ("HEADING", "heading", "000°", 1, 1),
            ("BATTERY", "battery", "100.0%", 2, 0),
            ("PITCH/ROLL", "att", "0.0°/0.0°", 2, 1),
        ]

        for label_text, key, initial_val, r, c in items:
            cell_frame = QFrame()
            cell_layout = QVBoxLayout(cell_frame)
            cell_layout.setContentsMargins(0, 0, 0, 0)
            cell_layout.setSpacing(1)

            lbl = QLabel(label_text)
            lbl.setStyleSheet("color: #64748b; font-size: 8px; font-weight: bold;")
            cell_layout.addWidget(lbl)

            val = QLabel(initial_val)
            val.setStyleSheet("color: #f8fafc; font-size: 12px; font-weight: bold;")
            cell_layout.addWidget(val)

            grid.addWidget(cell_frame, r, c)
            self.fields[key] = val

        layout.addLayout(grid)

    def update_telemetry(
        self,
        alt_agl: float,
        speed: float,
        climb: float,
        heading: float,
        battery: float,
        pitch: float,
        roll: float,
    ) -> None:
        """Updates all telemetry fields dynamically."""
        self.fields["alt_agl"].setText(f"{alt_agl:.1f} m")
        self.fields["speed"].setText(f"{speed:.1f} m/s")
        self.fields["climb"].setText(f"{climb:+.1f} m/s")
        self.fields["heading"].setText(f"{int(heading):03d}°")
        self.fields["battery"].setText(f"{battery:.1f}%")
        self.fields["att"].setText(f"{pitch:.1f}°/{roll:.1f}°")

        # Dynamic battery coloring
        bat_color = "#10b981" if battery > 40 else ("#f59e0b" if battery > 20 else "#ef4444")
        self.fields["battery"].setStyleSheet(f"color: {bat_color}; font-size: 12px; font-weight: bold;")
