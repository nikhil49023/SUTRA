"""
Smart Horizon GCS — Centralized Geofence Subsystem Service
Subsystem: Geofence Subsystem (Phase 4)
"""

import time
import uuid
from dataclasses import replace
from pathlib import Path
from typing import List, Optional, Tuple, Union

from services.event_bus import EventBus, get_event_bus
from services.logging_service import get_logger

from .models import Geofence, GeometryType, ZoneType
from .storage import GeofenceStorage


class GeofenceService:
    """
    Core business logic and lifecycle registry for airspace containment zones.
    All operations update GeofenceState in StateStore and emit event notifications.
    """

    def __init__(
        self,
        state_store=None,
        event_bus: Optional[EventBus] = None,
    ) -> None:
        if state_store is None:
            from state.application_state import get_state_store
            self.state_store = get_state_store()
        else:
            self.state_store = state_store
        self.event_bus = event_bus or get_event_bus()
        self.logger = get_logger("geofence_service")

        # Seed initial geofences if state is empty
        self._sync_to_app_state()

    def create_geofence(
        self,
        name: str = "New Airspace Zone",
        zone_type: ZoneType = ZoneType.NO_FLY,
        geometry_type: GeometryType = GeometryType.POLYGON,
        coordinates: Optional[List[Tuple[float, float]]] = None,
        center: Optional[Tuple[float, float]] = None,
        radius: float = 200.0,
        corridor_width: float = 50.0,
        altitude_min: float = 0.0,
        altitude_max: float = 120.0,
        priority: int = 3,
        enabled: bool = True,
        visible: bool = True,
        description: str = "",
    ) -> Geofence:
        """Instantiates and registers a new geofence."""
        g = Geofence(
            id=str(uuid.uuid4()),
            name=name,
            zone_type=zone_type,
            geometry_type=geometry_type,
            coordinates=coordinates or [],
            center=center,
            radius=radius,
            corridor_width=corridor_width,
            altitude_min=altitude_min,
            altitude_max=altitude_max,
            priority=priority,
            enabled=enabled,
            visible=visible,
            description=description,
            created_at=time.time(),
            updated_at=time.time(),
        )

        current = self.state_store.get_state().geofence_state
        new_list = list(current.geofences) + [g]

        self.state_store.update_state(
            lambda s: replace(
                s,
                geofence_state=replace(
                    s.geofence_state,
                    geofences=new_list,
                    selected_geofence_id=g.id,
                ),
            )
        )

        # Emit full geofence object so frontend can render it immediately
        self.event_bus.emit(
            "geofence.created",
            payload={
                "geofence": {
                    "id": g.id,
                    "name": g.name,
                    "zone_type": g.zone_type.value,
                    "geometry_type": g.geometry_type.value,
                    "coordinates": [list(c) for c in (g.coordinates or [])],
                    "center": list(g.center) if g.center else None,
                    "radius": g.radius,
                    "corridor_width": g.corridor_width,
                    "altitude_min": g.altitude_min,
                    "altitude_max": g.altitude_max,
                    "priority": g.priority,
                    "enabled": g.enabled,
                    "visible": g.visible,
                    "created_at": g.created_at,
                }
            },
            source="geofence_service",
        )
        return g

    def update_geofence(self, geofence_id: str, **kwargs) -> Optional[Geofence]:
        """Modifies attributes of an existing geofence."""
        current = self.state_store.get_state().geofence_state
        target = None
        new_list = []

        for g in current.geofences:
            if g.id == geofence_id:
                updated = replace(g, updated_at=time.time(), **kwargs)
                new_list.append(updated)
                target = updated
            else:
                new_list.append(g)

        if target is None and "name" in kwargs:
            target = Geofence(
                id=geofence_id,
                name=kwargs.get("name", "Zone"),
                zone_type=kwargs.get("zone_type", ZoneType.NO_FLY),
                geometry_type=kwargs.get("geometry_type", GeometryType.POLYGON),
                coordinates=kwargs.get("coordinates", []),
                center=kwargs.get("center"),
                radius=kwargs.get("radius", 200.0),
                corridor_width=kwargs.get("corridor_width", 50.0),
                altitude_min=kwargs.get("altitude_min", 0.0),
                altitude_max=kwargs.get("altitude_max", 120.0),
                priority=kwargs.get("priority", 3),
                enabled=kwargs.get("enabled", True),
                visible=kwargs.get("visible", True),
                created_at=time.time(),
                updated_at=time.time(),
            )
            new_list.append(target)

        if target:
            self.state_store.update_state(
                lambda s: replace(
                    s,
                    geofence_state=replace(s.geofence_state, geofences=new_list),
                )
            )
            self.event_bus.emit(
                "geofence.updated",
                payload={
                    "geofence_id": target.id,
                    "name": target.name,
                    "geofence": {
                        "id": target.id,
                        "name": target.name,
                        "zone_type": target.zone_type.value,
                        "geometry_type": target.geometry_type.value,
                        "coordinates": [list(c) for c in (target.coordinates or [])],
                        "center": list(target.center) if target.center else None,
                        "radius": target.radius,
                        "corridor_width": target.corridor_width,
                        "altitude_min": target.altitude_min,
                        "altitude_max": target.altitude_max,
                        "priority": target.priority,
                        "enabled": target.enabled,
                        "visible": target.visible,
                        "created_at": target.created_at,
                    },
                },
                source="geofence_service",
            )
            return target
        return None

    def delete_geofence(self, geofence_id: str) -> bool:
        """Removes a geofence by ID."""
        current = self.state_store.get_state().geofence_state
        new_list = [g for g in current.geofences if g.id != geofence_id]

        if len(new_list) == len(current.geofences):
            return False

        new_selected = None
        if current.selected_geofence_id == geofence_id:
            new_selected = new_list[0].id if new_list else None
        else:
            new_selected = current.selected_geofence_id

        self.state_store.update_state(
            lambda s: replace(
                s,
                geofence_state=replace(
                    s.geofence_state,
                    geofences=new_list,
                    selected_geofence_id=new_selected,
                ),
            )
        )

        self.event_bus.emit(
            "geofence.deleted",
            payload={"geofence_id": geofence_id},
            source="geofence_service",
        )
        return True

    def select_geofence(self, geofence_id: Optional[str]) -> Optional[Geofence]:
        """Selects a geofence for editing and inspection."""
        self.state_store.update_state(
            lambda s: replace(
                s,
                geofence_state=replace(
                    s.geofence_state,
                    selected_geofence_id=geofence_id,
                ),
            )
        )

        if geofence_id:
            self.event_bus.emit(
                "geofence.selected",
                payload={"geofence_id": geofence_id},
                source="geofence_service",
            )
            return self.get_geofence(geofence_id)
        return None

    def toggle_visibility(self, geofence_id: str) -> Optional[Geofence]:
        """Toggles visibility on the map."""
        g = self.get_geofence(geofence_id)
        if g:
            return self.update_geofence(geofence_id, visible=not g.visible)
        return None

    def get_geofence(self, geofence_id: str) -> Optional[Geofence]:
        """Returns geofence by ID."""
        for g in self.get_all_geofences():
            if g.id == geofence_id:
                return g
        return None

    def get_all_geofences(self) -> List[Geofence]:
        """Returns all registered geofences."""
        return self.state_store.get_state().geofence_state.geofences

    def get_selected(self) -> Optional[Geofence]:
        """Returns currently selected geofence."""
        return self.state_store.get_state().geofence_state.get_selected()

    def clear(self) -> None:
        """Clears all geofences."""
        self.state_store.update_state(
            lambda s: replace(
                s,
                geofence_state=replace(
                    s.geofence_state,
                    geofences=[],
                    selected_geofence_id=None,
                ),
            )
        )

    def save_all(self, filepath: Optional[Path] = None) -> Path:
        """Saves active geofences to disk."""
        return GeofenceStorage.save_all(self.get_all_geofences(), filepath)

    def load_all(self, filepath: Optional[Path] = None) -> List[Geofence]:
        """Loads geofences from disk and updates state."""
        loaded = GeofenceStorage.load_all(filepath)
        self.state_store.update_state(
            lambda s: replace(
                s,
                geofence_state=replace(
                    s.geofence_state,
                    geofences=loaded,
                    selected_geofence_id=loaded[0].id if loaded else None,
                ),
            )
        )
        return loaded

    def _sync_to_app_state(self) -> None:
        """Ensures GeofenceState is initialized."""
        # Add default demonstration NFZ if state is empty
        current = self.state_store.get_state().geofence_state
        if not current.geofences:
            demo_coords = [
                (37.7770, -122.4220),
                (37.7790, -122.4200),
                (37.7780, -122.4170),
                (37.7760, -122.4190),
            ]
            demo_nfz = Geofence(
                id="default-demo-nfz",
                name="Mission District NFZ",
                zone_type=ZoneType.NO_FLY,
                geometry_type=GeometryType.POLYGON,
                coordinates=demo_coords,
                altitude_min=0.0,
                altitude_max=120.0,
                description="Default demonstration restricted airspace polygon",
            )
            self.state_store.update_state(
                lambda s: replace(
                    s,
                    geofence_state=replace(
                        s.geofence_state,
                        geofences=[demo_nfz],
                    ),
                )
            )


# Global singleton
_global_geofence_service: Optional[GeofenceService] = None


def get_geofence_service() -> GeofenceService:
    """Returns global GeofenceService singleton."""
    global _global_geofence_service
    if _global_geofence_service is None:
        _global_geofence_service = GeofenceService()
    return _global_geofence_service
