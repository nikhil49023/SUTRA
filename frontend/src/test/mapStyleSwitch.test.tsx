/**
 * Smart Horizon GCS — Map Style Switching & Basemap Layer Restoration Tests
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useAppStore } from '../stores/appStore';
import { mapPersistence } from '../map/MapPersistence';
import { getMapStyleSpec, MAP_STYLE_LABELS } from '../map/MapStyles';
import { SettingsPanel } from '../components/settings/SettingsPanel';
import { MapView } from '../map/MapView';
import { useGeofenceStore } from '../stores/geofenceStore';
import { useMissionStore } from '../stores/missionStore';
import { useFleetStore } from '../stores/fleetStore';
import { MapStyleType } from '../types/app';

describe('SMART HORIZON GCS — Satellite & Map Style Switching Pipeline', () => {
  beforeEach(() => {
    localStorage.clear();
    useAppStore.setState({
      mapStyle: 'tactical-dark',
      mapStyleLoading: false,
    });
  });

  it('TEST 1: Central map styles specifications provide valid MapLibre StyleSpecifications', () => {
    const darkSpec = getMapStyleSpec('tactical-dark');
    expect(darkSpec.version).toBe(8);
    expect(darkSpec.sources['carto-dark-tiles']).toBeDefined();

    const satSpec = getMapStyleSpec('satellite');
    expect(satSpec.version).toBe(8);
    expect(satSpec.sources['satellite-tiles']).toBeDefined();
    expect(satSpec.sources['satellite-tiles'].type).toBe('raster');
    const satTiles = (satSpec.sources['satellite-tiles'] as any).tiles;
    expect(satTiles[0]).toContain('World_Imagery');

    const terrainSpec = getMapStyleSpec('terrain');
    expect(terrainSpec.version).toBe(8);
    expect(terrainSpec.sources['terrain-tiles']).toBeDefined();

    const streetsSpec = getMapStyleSpec('streets');
    expect(streetsSpec.version).toBe(8);
    expect(streetsSpec.sources['streets-tiles']).toBeDefined();
  });

  it('TEST 2: Selecting SATELLITE in Settings updates mapStyle in store and triggers state change', () => {
    render(<SettingsPanel />);

    const select = screen.getByDisplayValue('Carto Dark Tactical');
    fireEvent.change(select, { target: { value: 'satellite' } });

    expect(useAppStore.getState().mapStyle).toBe('satellite');
    expect(localStorage.getItem('sh_gcs_map_style_preference')).toBe('satellite');
  });

  it('TEST 3: mapPersistence.setMapStyle switches style and notifies style load listeners', async () => {
    const map = mapPersistence.initOrAttach(document.createElement('div'));
    expect(map).toBeDefined();

    let styleLoadFired = false;
    const unsub = mapPersistence.onStyleLoaded(() => {
      styleLoadFired = true;
    });

    const success = await mapPersistence.setMapStyle('satellite');
    expect(success).toBe(true);
    expect(mapPersistence.getMapStyle()).toBe('satellite');
    expect(styleLoadFired).toBe(true);

    unsub();
  });

  it('TEST 4: Rapid toggling between styles does not crash or corrupt state', async () => {
    const styles: MapStyleType[] = ['satellite', 'streets', 'terrain', 'tactical-dark', 'satellite'];
    for (const s of styles) {
      const res = await mapPersistence.setMapStyle(s);
      expect(res).toBe(true);
      expect(mapPersistence.getMapStyle()).toBe(s);
    }
  });

  it('TEST 5: Camera state is preserved across map style switching', async () => {
    mapPersistence.setCameraState({
      center: [-122.4194, 37.7749],
      zoom: 16.2,
      pitch: 45,
      bearing: -20,
    });

    await mapPersistence.setMapStyle('satellite');
    const cam = mapPersistence.getCameraState();
    expect(cam.center[0]).toBeCloseTo(-122.4194, 3);
    expect(cam.center[1]).toBeCloseTo(37.7749, 3);
  });

  it('TEST 6: MapView renders basemap style indicator and allows quick switching', () => {
    useAppStore.setState({ mapStyle: 'satellite' });
    render(<MapView />);

    // Bottom left map indicator shows SAT
    expect(screen.getByText('SAT')).toBeInTheDocument();

    // Open style switcher popup
    const layersBtn = screen.getByTitle(/Basemap: Satellite/i);
    fireEvent.click(layersBtn);

    expect(screen.getByText('Basemap Style')).toBeInTheDocument();
    expect(screen.getByText('Dark Tactical')).toBeInTheDocument();
    expect(screen.getByText('Terrain')).toBeInTheDocument();
    expect(screen.getByText('Streets')).toBeInTheDocument();

    // Click Terrain
    const terrainBtn = screen.getByText('Terrain');
    fireEvent.click(terrainBtn);

    expect(useAppStore.getState().mapStyle).toBe('terrain');
  });

  it('TEST 7: Geofences, Waypoints, and Fleet state remain intact across style switches', async () => {
    useGeofenceStore.setState({
      geofences: [
        {
          id: 'gf-test-1',
          name: 'Test NFZ',
          zone_type: 'NO_FLY',
          geometry_type: 'POLYGON',
          coordinates: [
            [37.77, -122.42],
            [37.78, -122.42],
            [37.78, -122.41],
          ],
          altitude_min: 0,
          altitude_max: 120,
          enabled: true,
          visible: true,
        },
      ],
    });

    useMissionStore.setState({
      waypoints: [
        { id: 'wp-1', index: 1, latitude: 37.775, longitude: -122.419, altitude: 30, speed: 5 },
        { id: 'wp-2', index: 2, latitude: 37.778, longitude: -122.415, altitude: 35, speed: 6 },
      ],
    });

    useFleetStore.setState({
      drones: {
        'drone-1': {
          drone_id: 'drone-1',
          callsign: 'Alpha Leader',
          role: 'LEADER',
          latitude: 37.775,
          longitude: -122.419,
          altitude: 30,
          speed: 8.0,
          battery: 95,
          heading: 90,
          pitch: 0,
          roll: 0,
          connection_status: 'CONNECTED',
          flight_mode: 'GUIDED',
          is_leader: true,
          formation_index: 0,
        },
      },
    });

    // Switch from Dark to Satellite
    await mapPersistence.setMapStyle('satellite');

    // Verify application state wasn't mutated or wiped
    expect(useGeofenceStore.getState().geofences.length).toBe(1);
    expect(useMissionStore.getState().waypoints.length).toBe(2);
    expect(Object.keys(useFleetStore.getState().drones).length).toBe(1);

    // Switch from Satellite back to Streets
    await mapPersistence.setMapStyle('streets');
    expect(useGeofenceStore.getState().geofences.length).toBe(1);
    expect(useMissionStore.getState().waypoints.length).toBe(2);
  });
});
