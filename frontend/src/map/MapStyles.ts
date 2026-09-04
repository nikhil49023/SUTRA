/**
 * Smart Horizon GCS — Centralized Tactical Map Styles & Imagery Providers
 *
 * Central definition of all MapLibre GL raster basemaps:
 * 1. tactical-dark: High-contrast Dark OpenStreetMap (Carto Dark)
 * 2. satellite: High-Resolution Real Satellite Imagery (Esri World Imagery)
 * 3. terrain: Topographic Elevation Contours & Shaded Relief (Esri World Topo)
 * 4. streets: Standard Tactical Navigation Street Map (Carto Voyager)
 */

import maplibregl from 'maplibre-gl';
import { MapStyleType } from '../types/app';

export const MAP_STYLE_LABELS: Record<MapStyleType, { label: string; description: string; badge: string }> = {
  'tactical-dark': {
    label: 'Dark Tactical',
    description: 'Carto Dark Basemap with Tactical Contrast',
    badge: 'DARK',
  },
  satellite: {
    label: 'Satellite Imagery',
    description: 'Esri World Imagery High-Resolution Satellite',
    badge: 'SAT',
  },
  terrain: {
    label: 'Topographic Terrain',
    description: 'USGS & Esri Topographic Elevation & Relief',
    badge: 'TERR',
  },
  streets: {
    label: 'Tactical Streets',
    description: 'Carto Voyager Clean Street Navigation',
    badge: 'STR',
  },
};

export function getMapStyleSpec(styleKey: MapStyleType): maplibregl.StyleSpecification {
  switch (styleKey) {
    case 'satellite':
      return {
        version: 8,
        name: 'Smart Horizon Satellite Basemap',
        sources: {
          'satellite-tiles': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            maxzoom: 19,
            attribution: '&copy; Esri &copy; Maxar, Earthstar Geographics',
          },
        },
        layers: [
          {
            id: 'satellite-tiles-layer',
            type: 'raster',
            source: 'satellite-tiles',
            minzoom: 0,
            maxzoom: 19,
            paint: {
              'raster-opacity': 1.0,
            },
          },
        ],
      };

    case 'terrain':
      return {
        version: 8,
        name: 'Smart Horizon Terrain Basemap',
        sources: {
          'terrain-tiles': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            maxzoom: 19,
            attribution: '&copy; Esri &copy; OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'terrain-tiles-layer',
            type: 'raster',
            source: 'terrain-tiles',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      };

    case 'streets':
      return {
        version: 8,
        name: 'Smart Horizon Streets Basemap',
        sources: {
          'streets-tiles': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
              'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
              'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
              'https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            maxzoom: 20,
            attribution: '&copy; CARTO &copy; OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'streets-tiles-layer',
            type: 'raster',
            source: 'streets-tiles',
            minzoom: 0,
            maxzoom: 20,
          },
        ],
      };

    case 'tactical-dark':
    default:
      return {
        version: 8,
        name: 'SUTRA Dynamic Tactical Space',
        sources: {
          'carto-dark-tiles': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
              'https://b.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
              'https://c.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
              'https://d.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            maxzoom: 20,
            attribution: '&copy; CARTO &copy; OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'tactical-background',
            type: 'background',
            paint: {
              'background-color': '#070A0F',
            },
          },
          {
            id: 'carto-dark-tiles-layer',
            type: 'raster',
            source: 'carto-dark-tiles',
            minzoom: 0,
            maxzoom: 20,
            paint: {
              'raster-opacity': 0.85,
            },
          },
        ],
      };
  }
}
