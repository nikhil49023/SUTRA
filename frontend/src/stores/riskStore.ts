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
  warning_level: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
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
  provider_health: 'HEALTHY' | 'DEGRADED' | 'STALE' | 'OFFLINE';
  last_successful_sync: number;
  stale_warning: string | null;
}

export interface RiskAlert {
  alert_id: string;
  level: 'INFO' | 'WATCH' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  affected_cells: string[];
  max_risk_score: number;
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

export interface NationalDisasterZone {
  alert_id: string;
  agency: string;
  place_name: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  elevation_m: number;
  severity: 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN';
  disaster_type: 'FLASH_FLOOD' | 'CLOUDBURST' | 'LANDSLIDE_DEBRIS' | 'RIVER_BREACH' | 'URBAN_INUNDATION' | 'CYCLONIC_STORM' | 'DAM_DISCHARGE';
  headline: string;
  synopsis: string;
  ndrf_battalion: string;
  evacuation_status: string;
  rainfall_nowcast_mm_h: number;
  affected_population_est: number;
  published_at: number;
  valid_until: number;
  source_url: string;
}

export const DEFAULT_NATIONAL_DISASTER_ZONES: NationalDisasterZone[] = [
  {
    alert_id: 'IMD-NDRF-2026-BLR-01',
    agency: 'IMD_NWFC & NDRF_HQ',
    place_name: 'Bellandur / Varthur Basin, Bengaluru',
    district: 'Bengaluru Urban',
    state: 'Karnataka',
    latitude: 12.9345,
    longitude: 77.6912,
    elevation_m: 895.0,
    severity: 'RED',
    disaster_type: 'URBAN_INUNDATION',
    headline: 'RED ALERT: Severe convective storm surge causing rapid urban drainage backflow and arterial road submergence',
    synopsis: 'IMD Radar Doppler Bengaluru detects heavy precipitation band (>68mm/h). High runoff into Bellandur-Varthur lake catchment. Multi-UAV aerial reconnaissance and survivor marking requested by Karnataka SDMA.',
    ndrf_battalion: '10th Bn NDRF (Bengaluru Regional Response Centre)',
    evacuation_status: 'Level-2 Alert & Low-Lying Area Evacuation',
    rainfall_nowcast_mm_h: 72.4,
    affected_population_est: 65000,
    published_at: Date.now() / 1000 - 1200,
    valid_until: Date.now() / 1000 + 28800,
    source_url: 'https://mausam.imd.gov.in',
  },
  {
    alert_id: 'IMD-NDRF-2026-KED-02',
    agency: 'IMD_NWFC & NDMA_SACHET',
    place_name: 'Mandakini River Basin, Kedarnath Valley',
    district: 'Rudraprayag',
    state: 'Uttarakhand',
    latitude: 30.7352,
    longitude: 79.0669,
    elevation_m: 3583.0,
    severity: 'RED',
    disaster_type: 'CLOUDBURST',
    headline: 'RED ALERT: Cloudburst and Mandakini River catchment surge warning with heavy debris flow hazard',
    synopsis: 'Intense convective cloudburst recorded in Upper Garhwal Himalaya. Water level in Mandakini rising at 1.8m/hr. Severe risk to pilgrim transit bridges and base camps. High-altitude UAV reconnaissance required.',
    ndrf_battalion: '8th Bn NDRF (Dehradun / Joshimath SAR Team)',
    evacuation_status: 'Immediate Valley Floor Evacuation (NDMA Level-3)',
    rainfall_nowcast_mm_h: 88.5,
    affected_population_est: 18000,
    published_at: Date.now() / 1000 - 2400,
    valid_until: Date.now() / 1000 + 36000,
    source_url: 'https://mausam.imd.gov.in',
  },
  {
    alert_id: 'IMD-NDRF-2026-WAY-03',
    agency: 'IMD_NWFC & NDRF_OPS',
    place_name: 'Meppadi / Chooralmala Landslide Corridor',
    district: 'Wayanad',
    state: 'Kerala',
    latitude: 11.5300,
    longitude: 76.1300,
    elevation_m: 780.0,
    severity: 'RED',
    disaster_type: 'LANDSLIDE_DEBRIS',
    headline: 'RED ALERT: Extremely heavy monsoon downpour triggering widespread slope instability and river cut-off',
    synopsis: 'Cumulative 24h rainfall exceeded 280mm in Western Ghats escarpment. Iruvanipuzha river course altered by heavy mudslides. Bridge destroyed at Chooralmala. Autonomous thermal/visual multi-UAV survivor search required.',
    ndrf_battalion: '4th Bn NDRF (Arakkonam / Kozhikode Fast-Deploy Team)',
    evacuation_status: 'Complete High-Slope Zone Evacuation',
    rainfall_nowcast_mm_h: 64.0,
    affected_population_est: 32000,
    published_at: Date.now() / 1000 - 3600,
    valid_until: Date.now() / 1000 + 43200,
    source_url: 'https://mausam.imd.gov.in',
  },
  {
    alert_id: 'IMD-NDRF-2026-SHI-04',
    agency: 'IMD_NWFC',
    place_name: 'Beas River Gorge & Pandoh Basin',
    district: 'Mandi',
    state: 'Himachal Pradesh',
    latitude: 31.7080,
    longitude: 76.9320,
    elevation_m: 760.0,
    severity: 'ORANGE',
    disaster_type: 'FLASH_FLOOD',
    headline: 'ORANGE WARNING: Beas River discharge surge and NH-21 highway embankment erosion',
    synopsis: 'Upstream dam sluice discharge combined with intense squall lines in Kullu-Mandi corridor. Road communication severed at 3 points. Drone swarm standoff mapping needed for bridge structural integrity.',
    ndrf_battalion: '14th Bn NDRF (Nurpur / Mandi Detachment)',
    evacuation_status: 'Riverside Settlement Relocation Advisory',
    rainfall_nowcast_mm_h: 44.0,
    affected_population_est: 24000,
    published_at: Date.now() / 1000 - 7200,
    valid_until: Date.now() / 1000 + 21600,
    source_url: 'https://mausam.imd.gov.in',
  },
  {
    alert_id: 'IMD-NDRF-2026-GHY-05',
    agency: 'NDMA_SACHET & CWC',
    place_name: 'Brahmaputra Floodplains & Kaziranga Fringe',
    district: 'Kamrup / Golaghat',
    state: 'Assam',
    latitude: 26.6500,
    longitude: 93.3500,
    elevation_m: 65.0,
    severity: 'ORANGE',
    disaster_type: 'RIVER_BREACH',
    headline: 'ORANGE WARNING: Brahmaputra flowing 1.2m above danger level with embankment seepage in 4 blocks',
    synopsis: 'Central Water Commission reports severe flood wave. Over 35 villages marooned. Drone payloads deploying life-jacket drop beacons and relaying survivor GPS coordinates to SDRF boat rescue teams.',
    ndrf_battalion: '1st Bn NDRF (Guwahati Battalion HQ)',
    evacuation_status: 'Rescue Boat Operations & Relief Camp Staging',
    rainfall_nowcast_mm_h: 38.5,
    affected_population_est: 115000,
    published_at: Date.now() / 1000 - 10800,
    valid_until: Date.now() / 1000 + 50400,
    source_url: 'https://mausam.imd.gov.in',
  },
  {
    alert_id: 'IMD-NDRF-2026-PUN-06',
    agency: 'IMD_NWFC & SDMA',
    place_name: 'Mula-Mutha Confluence & Khadakwasla Catchment',
    district: 'Pune',
    state: 'Maharashtra',
    latitude: 18.5204,
    longitude: 73.8567,
    elevation_m: 560.0,
    severity: 'YELLOW',
    disaster_type: 'DAM_DISCHARGE',
    headline: 'YELLOW WATCH: Controlled dam spillway discharge of 25,000 cusecs leading to low-level bridge submergence',
    synopsis: 'Heavy ghat precipitation causing rapid reservoir storage filling. Riverside parking areas and low bridges closed. Precautionary monitoring by district disaster management authorities.',
    ndrf_battalion: '5th Bn NDRF (Pune / Talegaon Battalion HQ)',
    evacuation_status: 'Precautionary Watch & Riverbank Monitoring',
    rainfall_nowcast_mm_h: 22.0,
    affected_population_est: 45000,
    published_at: Date.now() / 1000 - 14400,
    valid_until: Date.now() / 1000 + 18000,
    source_url: 'https://mausam.imd.gov.in',
  },
];

interface RiskStoreState {
  temporalMap: TemporalRiskMap | null;
  activeHorizon: string; // '0h', '1h', '2h', '3h', '4h'
  forecast: ForecastHorizon | null;
  activeAlerts: RiskAlert[];
  recommendations: PrepositioningRecommendation[];
  chargingStations: ChargingStation[];
  disasterZones: NationalDisasterZone[];
  selectedZoneId: string | null;
  selectedZone: NationalDisasterZone | null;
  selectedCellId: string | null;
  selectedTheater: string;
  isLoading: boolean;

  fetchRiskData: () => Promise<void>;
  fetchDisasterZones: () => Promise<void>;
  setActiveHorizon: (horizon: string) => void;
  selectCell: (cellId: string | null) => void;
  selectTheater: (name: string, lat: number, lon: number) => Promise<void>;
  selectDisasterZone: (alertId: string) => Promise<void>;
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
  disasterZones: DEFAULT_NATIONAL_DISASTER_ZONES,
  selectedZoneId: 'IMD-NDRF-2026-BLR-01',
  selectedZone: DEFAULT_NATIONAL_DISASTER_ZONES[0],
  selectedCellId: null,
  selectedTheater: 'Bellandur / Varthur Basin, Bengaluru (Karnataka)',
  isLoading: false,

  fetchRiskData: async () => {
    set({ isLoading: true });
    try {
      wsClient.sendEnvelope('risk.get_temporal_map', {});
      wsClient.sendEnvelope('forecast.get_forecast', {});
      wsClient.sendEnvelope('prepositioning.get_recommendations', {});
      wsClient.sendEnvelope('risk.get_disaster_zones', {});
      set({ isLoading: false });
    } catch (e) {
      console.warn('Risk data fetch fallback:', e);
      set({ isLoading: false });
    }
  },

  fetchDisasterZones: async () => {
    try {
      wsClient.sendEnvelope('risk.get_disaster_zones', {});
    } catch (e) {
      console.warn('Failed to fetch disaster zones:', e);
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

  selectDisasterZone: async (alertId: string) => {
    const { disasterZones } = get();
    const zone = disasterZones.find((z) => z.alert_id === alertId);
    if (zone) {
      set({ selectedZoneId: alertId, selectedZone: zone, selectedTheater: `${zone.place_name} (${zone.state})`, isLoading: true });
    } else {
      set({ selectedZoneId: alertId, isLoading: true });
    }

    try {
      wsClient.sendEnvelope('risk.select_disaster_zone', { alert_id: alertId });
      set({ isLoading: false });
    } catch (e) {
      console.error('Failed to select disaster zone:', e);
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
