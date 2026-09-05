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
import { useRiskStore } from './stores/riskStore';
import { useAIStore } from './stores/aiStore';
import { useGISStore } from './stores/gisStore';
import { useDefensiveUpgradesStore } from './stores/defensiveUpgradesStore';
import { useCommunicationStore } from './stores/communicationStore';
import { useAlertStore } from './stores/alertStore';

if (typeof window !== 'undefined') {
  (window as any).__useFleetStore = useFleetStore;
  (window as any).__useGeofenceStore = useGeofenceStore;
  (window as any).__useGeofenceNotificationStore = useGeofenceNotificationStore;
  (window as any).__useMissionStore = useMissionStore;
  (window as any).__useTelemetryStore = useTelemetryStore;
  (window as any).__useAppStore = useAppStore;
  (window as any).__useRiskStore = useRiskStore;
  (window as any).__useAIStore = useAIStore;
  (window as any).__useGISStore = useGISStore;
  (window as any).__useDefensiveUpgradesStore = useDefensiveUpgradesStore;
  (window as any).__useCommunicationStore = useCommunicationStore;
  (window as any).__useAlertStore = useAlertStore;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
