export type MapStyleMode = 'TACTICAL_DARK' | 'SATELLITE' | 'TERRAIN' | 'STREETS';

export interface MapStyleConfig {
  id: MapStyleMode;
  name: string;
  url: string | any;
}

export const MAP_STYLES: Record<MapStyleMode, MapStyleConfig> = {
  TACTICAL_DARK: {
    id: 'TACTICAL_DARK',
    name: 'Tactical Dark',
    url: {
      version: 8,
      sources: {
        'carto-dark': {
          type: 'raster',
          tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '&copy; CartoDB &copy; OpenStreetMap'
        }
      },
      layers: [
        {
          id: 'carto-dark-layer',
          type: 'raster',
          source: 'carto-dark',
          minzoom: 0,
          maxzoom: 19
        }
      ]
    }
  },
  SATELLITE: {
    id: 'SATELLITE',
    name: 'Esri Satellite',
    url: {
      version: 8,
      sources: {
        'esri-sat': {
          type: 'raster',
          tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
          tileSize: 256,
          attribution: '&copy; Esri &copy; DigitalGlobe'
        }
      },
      layers: [
        {
          id: 'esri-sat-layer',
          type: 'raster',
          source: 'esri-sat',
          minzoom: 0,
          maxzoom: 19
        }
      ]
    }
  },
  TERRAIN: {
    id: 'TERRAIN',
    name: 'OpenTopo Terrain',
    url: {
      version: 8,
      sources: {
        'opentopo': {
          type: 'raster',
          tiles: ['https://a.tile.opentopomap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '&copy; OpenTopoMap'
        }
      },
      layers: [
        {
          id: 'opentopo-layer',
          type: 'raster',
          source: 'opentopo',
          minzoom: 0,
          maxzoom: 17
        }
      ]
    }
  },
  STREETS: {
    id: 'STREETS',
    name: 'OpenStreetMap Streets',
    url: {
      version: 8,
      sources: {
        'osm-streets': {
          type: 'raster',
          tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '&copy; OpenStreetMap'
        }
      },
      layers: [
        {
          id: 'osm-streets-layer',
          type: 'raster',
          source: 'osm-streets',
          minzoom: 0,
          maxzoom: 19
        }
      ]
    }
  }
};
