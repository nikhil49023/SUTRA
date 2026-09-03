"""
Smart Horizon GCS — Mission Planning Actions Toolbar
Subsystem: UI Layer (Mission)
"""

from PySide6.QtCore import Qt, Signal
from PySide6.QtWidgets import (
    QFileDialog,
    QFrame,
    QHBoxLayout,
    QPushButton,
    QWidget,
)

from mission.mission_manager import get_mission_manager


class MissionToolbar(QFrame):
    """
    Action toolbar for mission lifecycle commands (New, Draw WP, Undo/Redo, Validate, Save/Load, Fit).
    """

    draw_mode_toggled = Signal(bool)
    fit_route_requested = Signal()

    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        self.setObjectName("panel")
        self.setStyleSheet(
            "QFrame#panel { background-color: #0b111e; border: 1px solid #1e293b; border-radius: 4px; padding: 4px; }"
        )

        layout = QHBoxLayout(self)
        layout.setContentsMargins(6, 4, 6, 4)
        layout.setSpacing(6)

        # 1. New Mission
        self.btn_new = QPushButton("📄 NEW")
        self.btn_new.clicked.connect(self._on_new_clicked)
        layout.addWidget(self.btn_new)

        # 2. Add / Draw Waypoint (Toggle)
        self.btn_draw = QPushButton("✏️ DRAW WP")
        self.btn_draw.setCheckable(True)
        self.btn_draw.clicked.connect(self._on_draw_toggled)
        layout.addWidget(self.btn_draw)

        # 3. Delete Selected Waypoint
        self.btn_delete = QPushButton("🗑️ DELETE")
        self.btn_delete.clicked.connect(self._on_delete_clicked)
        layout.addWidget(self.btn_delete)

        # 4. Undo / Redo
        self.btn_undo = QPushButton("↩️ UNDO")
        self.btn_undo.clicked.connect(self._on_undo_clicked)
        layout.addWidget(self.btn_undo)

        self.btn_redo = QPushButton("↪️ REDO")
        self.btn_redo.clicked.connect(self._on_redo_clicked)
        layout.addWidget(self.btn_redo)

        # 5. Clear All
        self.btn_clear = QPushButton("🧹 CLEAR")
        self.btn_clear.clicked.connect(self._on_clear_clicked)
        layout.addWidget(self.btn_clear)

        # 6. Validate
        self.btn_validate = QPushButton("🛡️ VALIDATE")
        self.btn_validate.setStyleSheet(
            "background-color: rgba(0, 242, 254, 0.15); border: 1px solid #00f2fe; color: #00f2fe; font-weight: bold;"
        )
        self.btn_validate.clicked.connect(self._on_validate_clicked)
        layout.addWidget(self.btn_validate)

        # 7. Save / Load
        self.btn_save = QPushButton("💾 SAVE")
        self.btn_save.clicked.connect(self._on_save_clicked)
        layout.addWidget(self.btn_save)

        self.btn_load = QPushButton("📂 LOAD")
        self.btn_load.clicked.connect(self._on_load_clicked)
        layout.addWidget(self.btn_load)

        # 8. Set Home
        self.btn_home = QPushButton("🏠 SET HOME")
        self.btn_home.clicked.connect(self._on_set_home_clicked)
        layout.addWidget(self.btn_home)

        # 9. Fit Route
        self.btn_fit = QPushButton("🎯 FIT ROUTE")
        self.btn_fit.clicked.connect(lambda: self.fit_route_requested.emit())
        layout.addWidget(self.btn_fit)

        layout.addStretch()

    def _on_new_clicked(self) -> None:
        get_mission_manager().create_mission()

    def _on_draw_toggled(self, checked: bool) -> None:
        if checked:
            self.btn_draw.setStyleSheet(
                "background-color: rgba(0, 242, 254, 0.3); border: 1px solid #00f2fe; color: #00f2fe; font-weight: bold;"
            )
        else:
            self.btn_draw.setStyleSheet("")
        self.draw_mode_toggled.emit(checked)

    def _on_delete_clicked(self) -> None:
        mgr = get_mission_manager()
        selected = mgr.get_selected_waypoint()
        if selected:
            mgr.delete_waypoint(selected.id)

    def _on_undo_clicked(self) -> None:
        get_mission_manager().undo()

    def _on_redo_clicked(self) -> None:
        get_mission_manager().redo()

    def _on_clear_clicked(self) -> None:
        get_mission_manager().clear_waypoints()

    def _on_validate_clicked(self) -> None:
        get_mission_manager().validate_mission()

    def _on_save_clicked(self) -> None:
        mgr = get_mission_manager()
        filepath, _ = QFileDialog.getSaveFileName(
            self, "Save Mission Plan", f"{mgr.get_mission().name.lower().replace(' ', '_')}.json", "JSON Files (*.json)"
        )
        if filepath:
            mgr.save_mission(filepath)

    def _on_load_clicked(self) -> None:
        filepath, _ = QFileDialog.getOpenFileName(
            self, "Load Mission Plan", "", "JSON Files (*.json *.plan)"
        )
        if filepath:
            get_mission_manager().load_mission(filepath)

    def _on_set_home_clicked(self) -> None:
        mgr = get_mission_manager()
        selected = mgr.get_selected_waypoint()
        if selected:
            mgr.set_home(selected.latitude, selected.longitude)
        else:
            # Use default GPS
            mgr.set_home(37.774929, -122.419416)
