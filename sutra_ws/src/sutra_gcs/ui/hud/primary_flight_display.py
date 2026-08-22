"""
Smart Horizon GCS — Primary Flight Display (PFD) Integrated Avionics Panel
Subsystem: UI / HUD Layer (Phase 9)
"""

from typing import Optional
from PySide6.QtCore import Qt, QTimer
from PySide6.QtWidgets import (
    QFrame,
    QHBoxLayout,
    QLabel,
    QPushButton,
    QVBoxLayout,
    QWidget,
)

from hud.alert_overlay import AlertOverlay
from hud.altitude_tape import AltitudeTape
from hud.battery_indicator import BatteryIndicator
from hud.connection_indicator import ConnectionIndicator
from hud.formation_indicator import FormationIndicator
from hud.geofence_indicator import GeofenceIndicator
from hud.gps_indicator import GPSIndicator
from hud.heading_tape import HeadingTape
from hud.horizon import ArtificialHorizonWidget
from hud.hud_controller import HUDController, hud_controller
from hud.hud_formatter import HUDFormatter
from hud.hud_theme import HUDTheme
from hud.mission_indicator import MissionIndicator
from hud.models import HUDModel, UnitSystem
from hud.speed_tape import SpeedTape
from hud.vertical_speed import VerticalSpeedIndicator


class PrimaryFlightDisplay(QFrame):
    """
    High-density tactical Primary Flight Display aggregating artificial horizon,
    moving compass, barometric/AGL tapes, variometers, and mission alerts into a single panel.
    """

    def __init__(
        self,
        controller: Optional[HUDController] = None,
        parent=None,
    ) -> None:
        super().__init__(parent)
        self.controller = controller or hud_controller
        self.unit_system = UnitSystem.METRIC

        self.setObjectName("pfd_panel")
        self.setStyleSheet(
            "QFrame#pfd_panel { background-color: #0b111e; border: 1px solid #1e293b; border-radius: 8px; }"
        )

        self._init_ui()

        # Subscribe to Controller
        self._unsub_controller = self.controller.subscribe(self.render_hud_model)

    def _init_ui(self) -> None:
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(8, 8, 8, 8)
        main_layout.setSpacing(6)

        # 1. Header Metrics Row (GPS, Battery, Link, Fence, Formation)
        header_row = QHBoxLayout()
        header_row.setSpacing(4)

        self.gps_ind = GPSIndicator(self)
        self.bat_ind = BatteryIndicator(self)
        self.conn_ind = ConnectionIndicator(self)
        self.geo_ind = GeofenceIndicator(self)
        self.form_ind = FormationIndicator(self)

        header_row.addWidget(self.gps_ind)
        header_row.addWidget(self.bat_ind)
        header_row.addWidget(self.conn_ind)
        header_row.addWidget(self.geo_ind)
        header_row.addWidget(self.form_ind)
        main_layout.addLayout(header_row)

        # 2. Heading Tape
        self.heading_tape = HeadingTape(self)
        main_layout.addWidget(self.heading_tape)

        # 3. Main Center Avionics Cluster (Speed Tape | Horizon | Altitude Tape | Variometer)
        center_cluster = QHBoxLayout()
        center_cluster.setSpacing(6)

        self.speed_tape = SpeedTape(self)
        self.horizon = ArtificialHorizonWidget(self)
        self.alt_tape = AltitudeTape(self)
        self.vs_ind = VerticalSpeedIndicator(self)

        center_cluster.addWidget(self.speed_tape)
        center_cluster.addWidget(self.horizon, stretch=1)
        center_cluster.addWidget(self.alt_tape)
        center_cluster.addWidget(self.vs_ind)
        main_layout.addLayout(center_cluster, stretch=1)

        # 4. Mission Progress Row
        self.mission_ind = MissionIndicator(self)
        main_layout.addWidget(self.mission_ind)

        # 5. Alert Overlay Banner
        self.alert_overlay = AlertOverlay(self)
        main_layout.addWidget(self.alert_overlay)

    def render_hud_model(self, model: HUDModel) -> None:
        """Updates all avionics instruments from normalized HUDModel."""
        # Top Indicators
        self.gps_ind.set_gps(model.gps_fix, model.satellites, model.hdop)
        self.bat_ind.set_battery(model.battery_percent, model.battery_voltage, model.rth_reserve_percent)
        self.conn_ind.set_connection(model.ws_state, model.mavlink_state, model.latency_ms)
        self.geo_ind.set_status(model.geofence_status)
        self.form_ind.set_formation(model.formation, model.formation_role, model.swarm_count)

        # Heading & Horizon
        self.heading_tape.set_heading(model.heading)
        self.horizon.update_attitude(model.pitch, model.roll, is_stale=model.is_stale)

        # Tapes
        self.speed_tape.set_speed(model.ground_speed, model.air_speed, self.unit_system)
        self.alt_tape.set_altitude(model.altitude_msl, model.altitude_agl, self.unit_system)
        self.vs_ind.set_vertical_speed(model.vertical_speed)

        # Mission
        self.mission_ind.set_mission(
            name=model.mission_name,
            cur_wp=model.current_waypoint,
            tot_wp=model.total_waypoints,
            dist_m=model.distance_to_waypoint,
            eta_sec=model.eta_seconds,
            progress=model.mission_progress,
        )

        # Alerts
        if model.is_link_lost:
            self.alert_overlay.set_alert("TELEMETRY LINK LOST", severity="CRITICAL")
        elif model.geofence_status.value == "BREACH":
            self.alert_overlay.set_alert("NO-FLY ZONE GEOFENCE BREACH", severity="EMERGENCY")
        elif model.is_stale:
            self.alert_overlay.set_alert("TELEMETRY DATA STALE", severity="WARNING")
        elif model.battery_percent < 20.0:
            self.alert_overlay.set_alert(f"BATTERY CRITICAL: {model.battery_percent:.0f}%", severity="CRITICAL")
        else:
            self.alert_overlay.clear()

    def closeEvent(self, event) -> None:
        if hasattr(self, "_unsub_controller"):
            self._unsub_controller()
        event.accept()

