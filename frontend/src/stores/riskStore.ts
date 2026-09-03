import { create } from 'zustand';
import { wsClient } from '../communication/WebSocketClient';

export interface FactorScore {
  name: string;
  raw_value: number;
  normalized_score: number;
  weight: number;
  weighted_contribution: number;
  description: string;
}

export interface RiskGridCell {
  cell_id: string;
  latitude: number;
  longitude: number;
  bounds: [number, number, number, number];
  elevation_m: number;
  forecast_rainfall_rate_mm_h: number;
  accumulated_rainfall_mm: number;
  wind_speed_mps: number;
  flood_susceptibility: number;
  population_exposure: number;
  infrastructure_exposure: number;
  accessibility_index: number;
  uav_coverage_count: number;
  survivor_count: number;
  confirmed_flooded: boolean;
  confirmed_debris: boolean;
  risk_score: number;
  category: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' | 'CRITICAL';
  confidence: number;
  factors: FactorScore[];
  primary_explanation: string;
  last_updated: number;
  horizon_offset_hours: number;
}

export interface GeospatialRiskGrid {
  grid_id: string;
  resolution_m: number;
  center_lat: number;
  center_lon: number;
  rows: number;
  cols: number;
  cell_count: number;
  cells: RiskGridCell[];
  timestamp: number;
  horizon_offset_hours: number;
}

export interface TemporalRiskMap {
  reference_time: number;
  horizons: Record<string, GeospatialRiskGrid>;
}

export interface ForecastObservation {
  timestamp: number;
  valid_from: number;
  valid_until: number;
  latitude: number;
  longitude: number;
  rainfall_mm: number;
  rainfall_rate_mm_h: number;
  precipitation_probability: number;
  wind_speed_mps: number;
  wind_gusts_mps: number;
  wind_direction_deg: number;
  temperature_c: number;
  humidity_pct: number;
  pressure_hpa: number;
  warning_level: 'NONE' | 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
  warning_headline: string;
  source: string;
  source_timestamp: number;
  confidence: number;
  freshness_s: number;
  is_stale: boolean;
}

export interface ForecastHorizon {
  reference_time: number;
  horizon_hours: number;
  observations: ForecastObservation[];
  provider_name: string;
  provider_health: string;
  stale_warning: string | null;
}

export interface RiskAlert {
  alert_id: string;
  timestamp: number;
  severity: 'INFO' | 'WATCH' | 'WARNING' | 'CRITICAL';
  cell_id: string;
  latitude: number;
  longitude: number;
  risk_score: number;
  title: string;
  message: string;
  primary_factor: string;
  lead_time_hours: number;
  acknowledged: boolean;
}

export interface PrepositioningRecommendation {
  recommendation_id: string;
  target_zone_id: string;
  target_risk_score: number;
  lead_time_hours: number;
  recommended_drone_ids: string[];
  recommended_station_id: string | null;
  staging_latitude: number;
  staging_longitude: number;
  staging_name: string;
  estimated_flight_time_s: number;
  estimated_energy_consumption_pct: number;
  safe_battery_margin_pct: number;
  rationale: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXECUTED';
  created_at: number;
}

export interface ChargingStation {
  station_id: string;
  name: string;
  latitude: number;
  longitude: number;
  elevation_m: number;
  total_bays: number;
  occupied_bays: number;
  available_bays: number;
  battery_capacity_pct: number;
  power_source: string;
  status: 'READY' | 'CHARGING' | 'DEPLOYING' | 'MAINTENANCE' | 'OFFLINE';
}

interface RiskStoreState {
  temporalMap: TemporalRiskMap | null;
  activeHorizon: string; // '0h', '1h', '2h', '3h', '4h'
  forecast: ForecastHorizon | null;
  activeAlerts: RiskAlert[];
  recommendations: PrepositioningRecommendation[];
  chargingStations: ChargingStation[];
  selectedCellId: string | null;
  selectedTheater: string;
  isLoading: boolean;

  fetchRiskData: () => Promise<void>;
  setActiveHorizon: (horizon: string) => void;
  selectCell: (cellId: string | null) => void;
  selectTheater: (name: string, lat: number, lon: number) => Promise<void>;
  injectDisasterScenario: (eventType: string, boost: number) => Promise<void>;
  executePrepositioning: (recId: string) => Promise<boolean>;
  rejectPrepositioning: (recId: string) => Promise<boolean>;
}

export const useRiskStore = create<RiskStoreState>((set, get) => ({
  temporalMap: null,
  activeHorizon: '0h',
  forecast: null,
  activeAlerts: [],
  recommendations: [],
  chargingStations: [],
  selectedCellId: null,
  selectedTheater: 'NHCE Bengaluru (Grand Finale)',
  isLoading: false,

  fetchRiskData: async () => {
    set({ isLoading: true });
    try {
      wsClient.sendEnvelope('risk.get_temporal_map', {});
      wsClient.sendEnvelope('forecast.get_forecast', {});
      wsClient.sendEnvelope('prepositioning.get_recommendations', {});
      set({ isLoading: false });
    } catch (e) {
      console.warn('Risk data fetch fallback:', e);
      set({ isLoading: false });
    }
  },

  setActiveHorizon: (horizon: string) => {
    set({ activeHorizon: horizon });
  },

  selectCell: (cellId: string | null) => {
    set({ selectedCellId: cellId });
  },

  selectTheater: async (name: string, lat: number, lon: number) => {
    set({ selectedTheater: name, isLoading: true });
    try {
      wsClient.sendEnvelope('risk.set_theater', {
        name,
        latitude: lat,
        longitude: lon,
      });
      set({ isLoading: false });
    } catch (e) {
      console.error('Failed to set theater:', e);
      set({ isLoading: false });
    }
  },

  injectDisasterScenario: async (eventType: string, boost: number) => {
    try {
      wsClient.sendEnvelope('forecast.inject_event', {
        event_type: eventType,
        severity: 'CRITICAL',
        message: `Dynamic storm escalation: ${eventType}`,
        rainfall_boost: boost,
      });
    } catch (e) {
      console.error('Failed to inject scenario:', e);
    }
  },

  executePrepositioning: async (recId: string) => {
    try {
      wsClient.sendEnvelope('prepositioning.execute', { recommendation_id: recId });
      return true;
    } catch (e) {
      console.error('Failed to execute recommendation:', e);
      return false;
    }
  },

  rejectPrepositioning: async (recId: string) => {
    try {
      wsClient.sendEnvelope('prepositioning.reject', { recommendation_id: recId });
      return true;
    } catch (e) {
      console.error('Failed to reject recommendation:', e);
      return false;
    }
  },
}));
