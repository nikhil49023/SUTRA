"""
Smart Horizon GCS — Swarm Formation Control & Geometry Selection Panel
Subsystem: UI Layer (Fleet Management)
"""

from typing import Optional

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QCheckBox,
    QComboBox,
    QFrame,
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QPushButton,
    QSlider,
    QVBoxLayout,
    QWidget,
)

from fleet.formation_engine import get_formation_engine
from state.application_state import ApplicationState, StateStore, get_state_store


class FormationPanel(QFrame):
    """
    Tactical formation controller allowing real-time geometric re-configuration,
    inter-UAV spacing scaling, heading alignment mode, and guide overlays.
    """

    def __init__(self, state_store: Optional[StateStore] = None, parent=None) -> None:
        super().__init__(parent)
        self.state_store = state_store or get_state_store()
        self.formation_engine = get_formation_engine()

        self.setObjectName("panel")
        self.setStyleSheet(
            "QFrame#panel { background-color: #090e1a; border: 1px solid #1e293b; border-radius: 4px; padding: 6px; }"
        )

        layout = QVBoxLayout(self)
        layout.setContentsMargins(6, 6, 6, 6)
        layout.setSpacing(8)

        hdr_lbl = QLabel("SWARM FORMATION GEOMETRY")
        hdr_lbl.setStyleSheet(
            "color: #00f2fe; font-size: 10px; font-weight: bold; border-bottom: 1px solid #1e293b; padding-bottom: 4px;"
        )
        layout.addWidget(hdr_lbl)

        # 1. Formation Type Selector
        f_layout = QVBoxLayout()
        f_layout.setSpacing(2)
        f_lbl = QLabel("GEOMETRIC PATTERN:")
        f_lbl.setStyleSheet("color: #94a3b8; font-size: 9px; font-weight: bold;")
        f_layout.addWidget(f_lbl)

        self.combo_formation = QComboBox()
        self.combo_formation.setStyleSheet(
            "QComboBox { background-color: #050811; border: 1px solid #1e293b; color: #f8fafc; padding: 4px; font-weight: bold; font-size: 10px; }"
        )
        self.combo_formation.addItem("V-WEDGE (TACTICAL)", "V_FORMATION")
        self.combo_formation.addItem("DIAMOND (ESCORT)", "DIAMOND")
        self.combo_formation.addItem("LATERAL LINE (SWEEP)", "LINE")
        self.combo_formation.addItem("COLUMN (TRAIL)", "COLUMN")
        self.combo_formation.addItem("ECHELON LEFT (FLANK)", "ECHELON_LEFT")
        self.combo_formation.addItem("ECHELON RIGHT (FLANK)", "ECHELON_RIGHT")
        self.combo_formation.addItem("RADIAL CIRCLE (ORBIT)", "CIRCLE")
        self.combo_formation.addItem("2D MATRIX GRID (AREA)", "GRID")
        self.combo_formation.currentIndexChanged.connect(self._on_formation_changed)
        f_layout.addWidget(self.combo_formation)
        layout.addLayout(f_layout)

        # 2. Spacing Slider
        s_layout = QVBoxLayout()
        s_layout.setSpacing(2)
        self.lbl_spacing_val = QLabel("INTER-UAV SPACING: 25 METERS")
        self.lbl_spacing_val.setStyleSheet("color: #94a3b8; font-size: 9px; font-weight: bold;")
        s_layout.addWidget(self.lbl_spacing_val)

        self.slider_spacing = QSlider(Qt.Horizontal)
        self.slider_spacing.setRange(5, 100)
        self.slider_spacing.setValue(25)
        self.slider_spacing.setSingleStep(5)
        self.slider_spacing.setStyleSheet(
            "QSlider::groove:horizontal { height: 4px; background: #1e293b; border-radius: 2px; } "
            "QSlider::sub-page:horizontal { background: #00f2fe; border-radius: 2px; } "
            "QSlider::handle:horizontal { background: #f8fafc; border: 1px solid #00f2fe; width: 12px; margin-top: -4px; margin-bottom: -4px; border-radius: 6px; }"
        )
        self.slider_spacing.valueChanged.connect(self._on_spacing_changed)
        s_layout.addWidget(self.slider_spacing)
        layout.addLayout(s_layout)

        # 3. Toggles (Heading & Guides)
        t_layout = QVBoxLayout()
        t_layout.setSpacing(4)

        self.chk_follow_heading = QCheckBox("FOLLOW LEADER HEADING")
        self.chk_follow_heading.setChecked(True)
        self.chk_follow_heading.setStyleSheet("color: #cbd5e1; font-size: 9px; font-weight: bold;")
        self.chk_follow_heading.toggled.connect(self._on_toggle_heading)
        t_layout.addWidget(self.chk_follow_heading)

        self.chk_show_guides = QCheckBox("SHOW TACTICAL FORMATION GUIDES")
        self.chk_show_guides.setChecked(True)
        self.chk_show_guides.setStyleSheet("color: #cbd5e1; font-size: 9px; font-weight: bold;")
        self.chk_show_guides.toggled.connect(self._on_toggle_guides)
        t_layout.addWidget(self.chk_show_guides)

        layout.addLayout(t_layout)

        # 4. Action Buttons
        btn_layout = QHBoxLayout()
        self.btn_apply = QPushButton("⚡ APPLY GEOMETRY")
        self.btn_apply.setStyleSheet(
            "background-color: rgba(0, 242, 254, 0.2); border: 1px solid #00f2fe; color: #00f2fe; font-weight: bold; padding: 6px;"
        )
        self.btn_apply.clicked.connect(self._on_apply_clicked)
        btn_layout.addWidget(self.btn_apply)

        self.btn_reset = QPushButton("🔄 RESET")
        self.btn_reset.setStyleSheet(
            "background-color: rgba(148, 163, 184, 0.1); border: 1px solid #64748b; color: #cbd5e1; font-weight: bold; padding: 6px;"
        )
        self.btn_reset.clicked.connect(self._on_reset_clicked)
        btn_layout.addWidget(self.btn_reset)

        layout.addLayout(btn_layout)
        layout.addStretch()

        # Subscribe to State Store
        self._unsub_state = self.state_store.subscribe(self._on_state_updated)

    def _on_formation_changed(self) -> None:
        form_type = self.combo_formation.currentData()
        if form_type:
            spacing = float(self.slider_spacing.value())
            self.formation_engine.apply_formation(
                form_type, spacing, self.chk_follow_heading.isChecked()
            )

    def _on_spacing_changed(self, val: int) -> None:
        self.lbl_spacing_val.setText(f"INTER-UAV SPACING: {val} METERS")
        self.formation_engine.change_spacing(float(val))

    def _on_toggle_heading(self, checked: bool) -> None:
        from dataclasses import replace
        self.state_store.update_state(
            lambda s: replace(
                s,
                fleet_state=s.fleet_state.set_follow_leader_heading(checked),
            )
        )
        self.formation_engine.recalculate_followers()

    def _on_toggle_guides(self, checked: bool) -> None:
        from dataclasses import replace
        self.state_store.update_state(
            lambda s: replace(
                s,
                fleet_state=replace(s.fleet_state, show_guides=checked),
            )
        )

    def _on_apply_clicked(self) -> None:
        self._on_formation_changed()

    def _on_reset_clicked(self) -> None:
        self.slider_spacing.setValue(25)
        self.combo_formation.setCurrentIndex(0)

    def _on_state_updated(self, state: ApplicationState) -> None:
        pass

    def closeEvent(self, event) -> None:
        if hasattr(self, "_unsub_state"):
            self._unsub_state()
        event.accept()
