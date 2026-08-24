/**
 * Smart Horizon GCS — Persistent Map Instance Singleton
 * Ensures MapLibre GL instance is initialized ONCE and NEVER destroyed on tab changes.
 */

import maplibregl from 'maplibre-gl';

export interface CameraState {
  center: [number, number]; // [lon, lat]
  zoom: number;
  pitch: number;
  bearing: number;
}

class MapPersistenceManager {
  private mapInstance: maplibregl.Map | null = null;
  private containerElement: HTMLElement | null = null;
  private cameraState: CameraState = {
    center: [-122.419416, 37.774929],
    zoom: 15.5,
    pitch: 40,
    bearing: -15,
  };
  public isLoaded = false;
  private loadCallbacks: (() => void)[] = [];

  public getMap(): maplibregl.Map | null {
    return this.mapInstance;
  }

  public getCameraState(): CameraState {
    if (this.mapInstance) {
      const c = this.mapInstance.getCenter();
      return {
        center: [c.lng, c.lat],
        zoom: this.mapInstance.getZoom(),
        pitch: this.mapInstance.getPitch(),
        bearing: this.mapInstance.getBearing(),
      };
    }
    return this.cameraState;
  }

  public setCameraState(state: Partial<CameraState>): void {
    this.cameraState = { ...this.cameraState, ...state };
    if (this.mapInstance) {
      this.mapInstance.jumpTo({
        center: this.cameraState.center,
        zoom: this.cameraState.zoom,
        pitch: this.cameraState.pitch,
        bearing: this.cameraState.bearing,
      });
    }
  }

  public onMapLoaded(cb: () => void): void {
    if (this.isLoaded && this.mapInstance?.isStyleLoaded()) {
      cb();
    } else {
      this.loadCallbacks.push(cb);
    }
  }

  public initOrAttach(container: HTMLElement, onLoad?: () => void): maplibregl.Map {
    if (onLoad) {
      this.onMapLoaded(onLoad);
    }

    if (this.mapInstance) {
      // Re-attach existing canvas container if container changed
      if (this.containerElement !== container) {
        const mapContainer = this.mapInstance.getContainer();
        if (mapContainer && mapContainer.parentElement !== container) {
          container.appendChild(mapContainer);
        }
        this.containerElement = container;
        this.mapInstance.resize();
      }
      return this.mapInstance;
    }

    this.containerElement = container;

    // Dark Tactical OpenStreetMap raster style
    const darkStyle: maplibregl.StyleSpecification = {
      version: 8,
      sources: {
        'carto-dark': {
          type: 'raster',
          tiles: [
            'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
            'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
            'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
            'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
          ],
          tileSize: 256,
          attribution: '&copy; CARTO &copy; OpenStreetMap',
        },
      },
      layers: [
        {
          id: 'carto-dark-layer',
          type: 'raster',
          source: 'carto-dark',
          minzoom: 0,
          maxzoom: 20,
        },
      ],
    };

    this.mapInstance = new maplibregl.Map({
      container,
      style: darkStyle,
      center: this.cameraState.center,
      zoom: this.cameraState.zoom,
      pitch: this.cameraState.pitch,
      bearing: this.cameraState.bearing,
      attributionControl: false,
    });

    this.mapInstance.on('load', () => {
      this.isLoaded = true;
      const cbs = [...this.loadCallbacks];
      this.loadCallbacks = [];
      cbs.forEach((cb) => {
        try {
          cb();
        } catch (e) {
          console.error('Error in map load callback:', e);
        }
      });
    });

    this.mapInstance.on('moveend', () => {
      if (this.mapInstance) {
        const c = this.mapInstance.getCenter();
        this.cameraState = {
          center: [c.lng, c.lat],
          zoom: this.mapInstance.getZoom(),
          pitch: this.mapInstance.getPitch(),
          bearing: this.mapInstance.getBearing(),
        };
      }
    });

    return this.mapInstance;
  }
}

export const mapPersistence = new MapPersistenceManager();
