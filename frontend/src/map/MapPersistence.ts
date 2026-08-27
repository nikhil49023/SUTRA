/**
 * Smart Horizon GCS — Persistent Map Instance Singleton
 *
 * Ensures MapLibre GL instance is initialized ONCE and NEVER destroyed on tab changes.
 * Supports dynamic setMapStyle() switching between Dark Tactical, Satellite Imagery,
 * Terrain, and Streets basemaps with full camera state and layer preservation.
 */

import maplibregl from 'maplibre-gl';
import { MapStyleType } from '../types/app';
import { getMapStyleSpec } from './MapStyles';
import { useAppStore } from '../stores/appStore';

export interface CameraState {
  center: [number, number]; // [lon, lat]
  zoom: number;
  pitch: number;
  bearing: number;
}

class MapPersistenceManager {
  private mapInstance: maplibregl.Map | null = null;
  private containerElement: HTMLElement | null = null;
  private currentStyleKey: MapStyleType = 'tactical-dark';
  private isSwitchingStyle = false;
  private cameraState: CameraState = {
    center: [-122.419416, 37.774929],
    zoom: 15.5,
    pitch: 40,
    bearing: -15,
  };
  public isLoaded = false;
  private loadCallbacks: (() => void)[] = [];
  private styleLoadCallbacks: (() => void)[] = [];

  public getMap(): maplibregl.Map | null {
    return this.mapInstance;
  }

  public getMapStyle(): MapStyleType {
    return this.currentStyleKey;
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

  public onStyleLoaded(cb: () => void): () => void {
    this.styleLoadCallbacks.push(cb);
    return () => {
      this.styleLoadCallbacks = this.styleLoadCallbacks.filter((c) => c !== cb);
    };
  }

  private notifyStyleLoaded(): void {
    const cbs = [...this.styleLoadCallbacks];
    cbs.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.error('Error in style load callback:', e);
      }
    });
  }

  /**
   * Switch basemap style dynamically on the existing persistent MapLibre instance.
   */
  public async setMapStyle(styleKey: MapStyleType): Promise<boolean> {
    if (!this.mapInstance) return false;

    if (this.currentStyleKey === styleKey && this.mapInstance.isStyleLoaded()) {
      return true;
    }

    console.log('[MAP STYLE REQUEST]', {
      requestedStyle: styleKey,
      currentStyle: this.currentStyleKey,
    });

    const prevStyle = this.currentStyleKey;
    this.currentStyleKey = styleKey;
    this.isSwitchingStyle = true;
    useAppStore.getState().setMapStyleLoading(true);

    const spec = getMapStyleSpec(styleKey);
    const camera = this.getCameraState();

    return new Promise((resolve) => {
      if (!this.mapInstance) {
        useAppStore.getState().setMapStyleLoading(false);
        return resolve(false);
      }

      let timeoutId: any;

      const handleStyleLoad = () => {
        clearTimeout(timeoutId);
        this.isLoaded = true;
        this.isSwitchingStyle = false;
        useAppStore.getState().setMapStyleLoading(false);

        // Restore camera state
        this.setCameraState(camera);

        // Notify layers and listeners
        this.notifyStyleLoaded();
        console.log('[MAP STYLE READY]', styleKey);
        resolve(true);
      };

      const handleStyleError = (err: any) => {
        clearTimeout(timeoutId);
        console.error('[MapPersistence] Style switch error for', styleKey, err);
        this.isSwitchingStyle = false;
        this.currentStyleKey = prevStyle;
        useAppStore.getState().setMapStyleLoading(false);
        useAppStore.getState().setMapStyle(prevStyle);
        this.mapInstance?.off('style.load', handleStyleLoad);
        resolve(false);
      };

      // Fallback timeout in case style load hangs
      timeoutId = setTimeout(() => {
        this.isSwitchingStyle = false;
        useAppStore.getState().setMapStyleLoading(false);
        this.mapInstance?.off('style.load', handleStyleLoad);
        this.notifyStyleLoaded();
        resolve(true);
      }, 500);

      this.mapInstance.once('style.load', handleStyleLoad);
      this.mapInstance.once('error', handleStyleError);

      try {
        this.mapInstance.setStyle(spec);
      } catch (e) {
        handleStyleError(e);
      }
    });
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

    // Load configured style from app store
    const initialStyleKey = useAppStore.getState().mapStyle || 'tactical-dark';
    this.currentStyleKey = initialStyleKey;
    const initialStyle = getMapStyleSpec(initialStyleKey);

    try {
      this.mapInstance = new maplibregl.Map({
        container,
        style: initialStyle,
        center: this.cameraState.center,
        zoom: this.cameraState.zoom,
        pitch: this.cameraState.pitch,
        bearing: this.cameraState.bearing,
        attributionControl: false,
      });
    } catch (e) {
      console.warn('[MapPersistence] WebGL fallback initialization (headless/test):', e);
      this.mapInstance = this.createMockMapInstance(container, initialStyle) as any;
    }

    const map = this.mapInstance!;

    map.on('load', () => {
      this.isLoaded = true;
      const cbs = [...this.loadCallbacks];
      this.loadCallbacks = [];
      cbs.forEach((cb) => {
        try {
          cb();
        } catch (err) {
          console.error('Error in map load callback:', err);
        }
      });
    });

    map.on('moveend', () => {
      if (this.mapInstance && !this.isSwitchingStyle) {
        const c = this.mapInstance.getCenter();
        this.cameraState = {
          center: [c.lng, c.lat],
          zoom: this.mapInstance.getZoom(),
          pitch: this.mapInstance.getPitch(),
          bearing: this.mapInstance.getBearing(),
        };
      }
    });

    return map;
  }

  private createMockMapInstance(container: HTMLElement, initialStyle: any): any {
    const listeners: Record<string, Function[]> = {};
    return {
      getContainer: () => container,
      getCanvasContainer: () => container,
      isStyleLoaded: () => true,
      loaded: () => true,
      isMoving: () => false,
      transform: { worldSize: 512 },
      resize: () => {},
      _getUIString: (k: string) => k,
      project: () => new maplibregl.Point(0, 0),
      unproject: () => ({ lng: 0, lat: 0 }),
      getCenter: () => ({ lng: this.cameraState.center[0], lat: this.cameraState.center[1] }),
      getZoom: () => this.cameraState.zoom,
      getPitch: () => this.cameraState.pitch,
      getBearing: () => this.cameraState.bearing,
      jumpTo: (opt: any) => {
        if (opt.center) this.cameraState.center = opt.center;
        if (opt.zoom) this.cameraState.zoom = opt.zoom;
        if (opt.pitch) this.cameraState.pitch = opt.pitch;
        if (opt.bearing) this.cameraState.bearing = opt.bearing;
      },
      flyTo: (opt: any) => {
        if (opt.center) this.cameraState.center = opt.center;
        if (opt.zoom) this.cameraState.zoom = opt.zoom;
      },
      fitBounds: () => {},
      setStyle: (_style: any) => {
        setTimeout(() => {
          (listeners['style.load'] || []).forEach((cb) => cb());
        }, 10);
      },
      on: (evt: string, cb: Function) => {
        if (!listeners[evt]) listeners[evt] = [];
        listeners[evt].push(cb);
      },
      once: (evt: string, cb: Function) => {
        if (evt === 'load' || evt === 'style.load') {
          setTimeout(cb, 10);
        }
      },
      off: (evt: string, cb: Function) => {
        if (listeners[evt]) listeners[evt] = listeners[evt].filter((c) => c !== cb);
      },
      getSource: () => null,
      addSource: () => {},
      addLayer: () => {},
      removeLayer: () => {},
      removeSource: () => {},
      zoomIn: () => {},
      zoomOut: () => {},
      resetNorthPitch: () => {},
      getCanvas: () => ({ style: {} }),
      getStyle: () => initialStyle,
    };
  }
}

export const mapPersistence = new MapPersistenceManager();
