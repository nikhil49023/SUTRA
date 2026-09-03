import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import './index.css';
import { useFleetStore } from './stores/fleetStore';
import { useGeofenceStore } from './stores/geofenceStore';
import { useGeofenceNotificationStore } from './geofence/GeofenceNotificationStore';
import { useMissionStore } from './stores/missionStore';
import { useTelemetryStore } from './stores/telemetryStore';
import { useAppStore } from './stores/appStore';

if (typeof window !== 'undefined') {
  (window as any).__useFleetStore = useFleetStore;
  (window as any).__useGeofenceStore = useGeofenceStore;
  (window as any).__useGeofenceNotificationStore = useGeofenceNotificationStore;
  (window as any).__useMissionStore = useMissionStore;
  (window as any).__useTelemetryStore = useTelemetryStore;
  (window as any).__useAppStore = useAppStore;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
