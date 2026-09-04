"""
Smart Horizon GCS — Geofence Action Toolbar
Subsystem: UI Layer (Geofence)
"""

from PySide6.QtCore import Qt, Signal
from PySide6.QtWidgets import (
    QComboBox,
    QFileDialog,
    QFrame,
    QHBoxLayout,
    QPushButton,
    QWidget,
)

from geofence.controller import get_geofence_controller
from geofence.geojson_service import GeoJSONService
from geofence.models import GeometryType, ZoneType
from geofence.service import get_geofence_service


class GeofenceToolbar(QFrame):
    """
    Tactical toolbar for initiating geofence drawings (Polygon, Circle, Corridor),
    finishing/cancelling sessions, and importing/exporting GeoJSON airspace definitions.
    """

    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        self.setObjectName("panel")
        self.setStyleSheet(
            "QFrame#panel { background-color: #0b111e; border: 1px solid #1e293b; border-radius: 4px; padding: 4px; }"
        )

        layout = QHBoxLayout(self)
        layout.setContentsMargins(6, 4, 6, 4)
        layout.setSpacing(6)

        # 1. Zone Type Selector
        self.combo_zone = QComboBox()
        self.combo_zone.addItem("⛔ NO-FLY ZONE", ZoneType.NO_FLY)
        self.combo_zone.addItem("⚠️ WARNING ZONE", ZoneType.WARNING)
        self.combo_zone.addItem("🛡️ SAFE CORRIDOR", ZoneType.SAFE)
        self.combo_zone.setStyleSheet(
            "background-color: #111827; border: 1px solid #334155; color: #f8fafc; font-weight: bold; padding: 4px;"
        )
        layout.addWidget(self.combo_zone)

        # 2. Draw Polygon
        self.btn_poly = QPushButton("📐 POLYGON")
        self.btn_poly.setStyleSheet(
            "background-color: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #fca5a5; font-weight: bold;"
        )
        self.btn_poly.clicked.connect(lambda: self._on_start_draw(GeometryType.POLYGON))
        layout.addWidget(self.btn_poly)

        # 3. Draw Circle
        self.btn_circle = QPushButton("⭕ CIRCLE")
        self.btn_circle.clicked.connect(lambda: self._on_start_draw(GeometryType.CIRCLE))
        layout.addWidget(self.btn_circle)

        # 4. Draw Corridor
        self.btn_corridor = QPushButton("🛣️ CORRIDOR")
        self.btn_corridor.clicked.connect(lambda: self._on_start_draw(GeometryType.CORRIDOR))
        layout.addWidget(self.btn_corridor)

        # 5. Finish Drawing
        self.btn_finish = QPushButton("✅ FINISH")
        self.btn_finish.setStyleSheet(
            "background-color: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; color: #6ee7b7; font-weight: bold;"
        )
        self.btn_finish.clicked.connect(self._on_finish_clicked)
        layout.addWidget(self.btn_finish)

        # 6. Cancel Drawing
        self.btn_cancel = QPushButton("❌ CANCEL")
        self.btn_cancel.clicked.connect(self._on_cancel_clicked)
        layout.addWidget(self.btn_cancel)

        # 7. Undo / Redo
        self.btn_undo = QPushButton("↩️ UNDO")
        self.btn_undo.clicked.connect(self._on_undo_clicked)
        layout.addWidget(self.btn_undo)

        # 8. Delete Selected
        self.btn_delete = QPushButton("🗑️ DELETE")
        self.btn_delete.clicked.connect(self._on_delete_clicked)
        layout.addWidget(self.btn_delete)

        # 9. GeoJSON Import / Export
        self.btn_export = QPushButton("📤 EXPORT GEOJSON")
        self.btn_export.clicked.connect(self._on_export_geojson)
        layout.addWidget(self.btn_export)

        self.btn_import = QPushButton("📥 IMPORT GEOJSON")
        self.btn_import.clicked.connect(self._on_import_geojson)
        layout.addWidget(self.btn_import)

        layout.addStretch()

    def _on_start_draw(self, geom_type: GeometryType) -> None:
        zone_type = self.combo_zone.currentData() or ZoneType.NO_FLY
        get_geofence_controller().start_drawing(zone_type, geom_type)

    def _on_finish_clicked(self) -> None:
        get_geofence_controller().finish_drawing()

    def _on_cancel_clicked(self) -> None:
        get_geofence_controller().cancel_drawing()

    def _on_undo_clicked(self) -> None:
        ctrl = get_geofence_controller()
        # If in drawing mode, undo drawing point; otherwise undo geofence edit
        geofence_state = ctrl.state_store.get_state().geofence_state
        if geofence_state.drawing_mode and geofence_state.drawing_points:
            ctrl.undo_drawing_point()
        else:
            ctrl.undo()

    def _on_delete_clicked(self) -> None:
        srv = get_geofence_service()
        selected = srv.get_selected()
        if selected:
            srv.delete_geofence(selected.id)

    def _on_export_geojson(self) -> None:
        geofences = get_geofence_service().get_all_geofences()
        filepath, _ = QFileDialog.getSaveFileName(
            self, "Export Airspace GeoJSON", "geofences.geojson", "GeoJSON Files (*.geojson *.json)"
        )
        if filepath:
            GeoJSONService.export_to_file(geofences, filepath)

    def _on_import_geojson(self) -> None:
        filepath, _ = QFileDialog.getOpenFileName(
            self, "Import Airspace GeoJSON", "", "GeoJSON Files (*.geojson *.json)"
        )
        if filepath:
            loaded = GeoJSONService.import_from_file(filepath)
            srv = get_geofence_service()
            for g in loaded:
                srv.create_geofence(
                    name=g.name,
                    zone_type=g.zone_type,
                    geometry_type=g.geometry_type,
                    coordinates=g.coordinates,
                    center=g.center,
                    radius=g.radius,
                    corridor_width=g.corridor_width,
                    altitude_min=g.altitude_min,
                    altitude_max=g.altitude_max,
                )
