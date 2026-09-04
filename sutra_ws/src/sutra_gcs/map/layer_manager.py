"""
SUTRA GCS — Map Layer & Base Tile Manager
"""

from typing import Dict, Any, List


class MapLayerManager:
    """Manages GIS tile providers (Dark, Satellite, OpenTopo, Street)."""

    TILE_PROVIDERS = {
        "dark": "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        "satellite": "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{y}",
        "terrain": "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
        "street": "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    }

    @classmethod
    def get_tile_url(cls, layer_name: str) -> str:
        return cls.TILE_PROVIDERS.get(layer_name.lower(), cls.TILE_PROVIDERS["dark"])


layer_manager = MapLayerManager()
