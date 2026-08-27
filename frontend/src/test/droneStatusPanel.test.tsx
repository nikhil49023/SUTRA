/**
 * Smart Horizon GCS — Drone Status Panel Contextual Visibility & Preference Tests
 */

import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useDroneStatusPanelStore } from '../stores/droneStatusPanelStore';
import { useAppStore } from '../stores/appStore';
import { useFleetStore } from '../stores/fleetStore';
import { useMapStore } from '../stores/mapStore';
import { MultiDroneDebugPanel } from '../hud/MultiDroneDebugPanel';

describe('SMART HORIZON GCS — Drone Status Panel Contextual Visibility', () => {
  beforeEach(() => {
    localStorage.clear();
    useDroneStatusPanelStore.getState().resetToDefaults();
    useAppStore.setState({ activeSection: 'COMMAND' });
    useMapStore.setState({ interactionMode: 'SELECT' });
    useFleetStore.setState({
      drones: {
        'drone-1': {
          drone_id: 'drone-1',
          callsign: 'Alpha Leader',
          role: 'LEADER',
          latitude: 37.7749,
          longitude: -122.4194,
          altitude: 30,
          speed: 8.5,
          battery: 92,
          heading: 90,
          pitch: 0,
          roll: 0,
          connection_status: 'CONNECTED',
          flight_mode: 'GUIDED',
          is_leader: true,
          formation_index: 0,
          target_latitude: 37.775,
          target_longitude: -122.42,
        },
        'drone-2': {
          drone_id: 'drone-2',
          callsign: 'Bravo Wingman',
          role: 'WINGMAN',
          latitude: 37.7748,
          longitude: -122.4192,
          altitude: 30,
          speed: 8.5,
          battery: 88,
          heading: 90,
          pitch: 0,
          roll: 0,
          connection_status: 'CONNECTED',
          flight_mode: 'GUIDED',
          is_leader: false,
          formation_index: 1,
          target_latitude: 37.775,
          target_longitude: -122.419,
        },
      },
    });
  });

  it('TEST 1: Default state is EXPANDED for Dashboard (COMMAND), MISSION, and FLEET', () => {
    const store = useDroneStatusPanelStore.getState();
    expect(store.getModeForSection('COMMAND')).toBe('EXPANDED');
    expect(store.getModeForSection('LIVEOPS')).toBe('EXPANDED');
    expect(store.getModeForSection('MISSION')).toBe('EXPANDED');
    expect(store.getModeForSection('FLEET')).toBe('EXPANDED');
  });

  it('TEST 2: Default state is COLLAPSED for GEOFENCE, GIS, AI, SETTINGS, and LOGS', () => {
    const store = useDroneStatusPanelStore.getState();
    expect(store.getModeForSection('GEOFENCE')).toBe('COLLAPSED');
    expect(store.getModeForSection('GIS')).toBe('COLLAPSED');
    expect(store.getModeForSection('AI')).toBe('COLLAPSED');
    expect(store.getModeForSection('SETTINGS')).toBe('COLLAPSED');
    expect(store.getModeForSection('LOGS')).toBe('COLLAPSED');
  });

  it('TEST 3: Renders full expanded card on Dashboard with operational data', () => {
    useAppStore.setState({ activeSection: 'COMMAND' });
    render(<MultiDroneDebugPanel />);

    expect(screen.getByText('DRONE STATUS & HUD')).toBeInTheDocument();
    expect(screen.getByText('Fleet Status')).toBeInTheDocument();
    expect(screen.getByText('Moving')).toBeInTheDocument();
    expect(screen.getByText('Drone Positions')).toBeInTheDocument();
    expect(screen.getByText(/Alpha/)).toBeInTheDocument();
  });

  it('TEST 4: Renders minimal collapsed pill on GIS view without acting as a wall', () => {
    useAppStore.setState({ activeSection: 'GIS' });
    render(<MultiDroneDebugPanel />);

    expect(screen.queryByText('Fleet Status')).not.toBeInTheDocument();
    expect(screen.getByText('DRONE STATUS')).toBeInTheDocument();
    expect(screen.getByText('2/2 MOVING')).toBeInTheDocument();
  });

  it('TEST 5: Clicking collapsed pill expands the panel and remembers section preference', () => {
    useAppStore.setState({ activeSection: 'GIS' });
    render(<MultiDroneDebugPanel />);

    const pillButton = screen.getByTitle(/Click to expand Drone Status/i);
    fireEvent.click(pillButton);

    expect(useDroneStatusPanelStore.getState().getModeForSection('GIS')).toBe('EXPANDED');
    expect(screen.getByText('DRONE STATUS & HUD')).toBeInTheDocument();
  });

  it('TEST 6: Clicking collapse icon in header collapses the panel and remembers preference', () => {
    useAppStore.setState({ activeSection: 'COMMAND' });
    render(<MultiDroneDebugPanel />);

    const collapseBtn = screen.getByTitle('Collapse to minimal pill');
    fireEvent.click(collapseBtn);

    expect(useDroneStatusPanelStore.getState().getModeForSection('COMMAND')).toBe('COLLAPSED');
    expect(screen.queryByText('Fleet Status')).not.toBeInTheDocument();
    expect(screen.getByText('DRONE STATUS')).toBeInTheDocument();
  });

  it('TEST 7: Geofence drawing mode automatically switches contextual section to GEOFENCE (collapsed)', () => {
    useAppStore.setState({ activeSection: 'COMMAND' });
    useMapStore.setState({ interactionMode: 'DRAW_GEOFENCE' });

    render(<MultiDroneDebugPanel />);

    // Geofence defaults to COLLAPSED so drawing area is not covered
    expect(screen.queryByText('Fleet Status')).not.toBeInTheDocument();
    expect(screen.getByText('DRONE STATUS')).toBeInTheDocument();
  });

  it('TEST 8: Per-section user preference is preserved across navigation', () => {
    const store = useDroneStatusPanelStore.getState();

    // User expands GIS
    store.setModeForSection('GIS', 'EXPANDED');
    // User collapses Mission
    store.setModeForSection('MISSION', 'COLLAPSED');

    expect(store.getModeForSection('GIS')).toBe('EXPANDED');
    expect(store.getModeForSection('MISSION')).toBe('COLLAPSED');
    expect(store.getModeForSection('COMMAND')).toBe('EXPANDED');
    expect(store.getModeForSection('AI')).toBe('COLLAPSED');
  });

  it('TEST 9: Keyboard shortcut (Ctrl+D) toggles panel mode', () => {
    useAppStore.setState({ activeSection: 'COMMAND' });
    render(<MultiDroneDebugPanel />);

    expect(screen.getByText('Fleet Status')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'd', ctrlKey: true });
    expect(useDroneStatusPanelStore.getState().getModeForSection('COMMAND')).toBe('COLLAPSED');
  });
});
