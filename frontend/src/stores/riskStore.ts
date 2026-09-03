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
  slope_deg?: number;
  forecast_rainfall_rate_mm_h: number;
  accumulated_rainfall_mm: number;
  wind_speed_mps: number;
  flood_susceptibility: number;
  building_instability_index?: number;
  comm_link_quality?: number;
  drone_transit_energy_cost?: number;
  airspace_clearance_index?: number;
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
  issued_at?: number;
  feed_status?: 'LIVE' | 'SIMULATION' | 'STALE' | 'OFFLINE_MESH_CACHE';
  verification_hash?: string;
}

export interface ForecastHorizon {
  reference_time: number;
  horizon_hours: number;
  observations: ForecastObservation[];
  provider_name: string;
  provider_health: 'HEALTHY' | 'DEGRADED' | 'STALE' | 'OFFLINE';
  feed_status?: 'LIVE' | 'SIMULATION' | 'STALE' | 'OFFLINE_MESH_CACHE';
  feed_latency_ms?: number;
  last_successful_sync: number;
  stale_warning: string | null;
  offline_mesh_mode?: boolean;
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
  reserved_drones?: string[];
}

export interface RiskMissionSynthesisPlan {
  plan_id: string;
  alert_id: string;
  place_name: string;
  district: string;
  state: string;
  risk_score: number;
  risk_category: string;
  search_area_km2: number;
  search_polygon_coords: [number, number][];
  num_drones_required: number;
  assigned_drone_ids: string[];
  battery_required_pct: number;
  safe_battery_margin_pct: number;
  staging_location_name: string;
  staging_coords: [number, number];
  charging_station_id: string;
  mission_waypoints: any[];
  status: 'SYNTHESIZED' | 'DISPATCHED' | 'EXECUTING' | 'REPLANNED' | 'COMPLETED';
  generated_at: number;
  replanning_history?: any[];
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
  confidence?: number;
  verification_sig?: string;
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
    confidence: 0.96,
    verification_sig: 'SIG-IMD-BLR-894A',
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
    confidence: 0.98,
    verification_sig: 'SIG-NDMA-KED-993F',
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
    confidence: 0.95,
    verification_sig: 'SIG-NDRF-WAY-741C',
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
    confidence: 0.91,
    verification_sig: 'SIG-IMD-MND-320D',
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
    confidence: 0.93,
    verification_sig: 'SIG-CWC-GHY-118E',
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
    confidence: 0.88,
    verification_sig: 'SIG-SDMA-PUN-550A',
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
  synthesisPlan: RiskMissionSynthesisPlan | null;
  offlineMeshMode: boolean;
  replanningLog: any[];
  isLoading: boolean;

  fetchRiskData: () => Promise<void>;
  fetchDisasterZones: () => Promise<void>;
  setActiveHorizon: (horizon: string) => void;
  selectCell: (cellId: string | null) => void;
  selectTheater: (name: string, lat: number, lon: number) => Promise<void>;
  selectDisasterZone: (alertId: string) => Promise<void>;
  synthesizeMission: (alertId: string) => Promise<RiskMissionSynthesisPlan | null>;
  triggerDynamicReplanning: (hazardCellId: string, hazardType?: string, reportingDroneId?: string) => Promise<boolean>;
  reserveChargingBayAndSwap: (droneId: string, currentBatPct?: number) => Promise<boolean>;
  toggleOfflineMeshMode: () => Promise<void>;
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
  chargingStations: [
    {
      station_id: 'STATION-01',
      name: 'Tactical Fast-Deploy Station Alpha (48V Solar Hybrid)',
      latitude: 12.9330,
      longitude: 77.6890,
      elevation_m: 905.0,
      total_bays: 4,
      occupied_bays: 1,
      available_bays: 3,
      battery_capacity_pct: 92.0,
      power_source: 'SOLAR_HYBRID_48V',
      status: 'READY',
      reserved_drones: [],
    }
  ],
  disasterZones: DEFAULT_NATIONAL_DISASTER_ZONES,
  selectedZoneId: 'IMD-NDRF-2026-BLR-01',
  selectedZone: DEFAULT_NATIONAL_DISASTER_ZONES[0],
  selectedCellId: null,
  selectedTheater: 'Bellandur / Varthur Basin, Bengaluru (Karnataka)',
  synthesisPlan: null,
  offlineMeshMode: false,
  replanningLog: [],
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

  synthesizeMission: async (alertId: string) => {
    const { selectedZone } = get();
    const zone = selectedZone || DEFAULT_NATIONAL_DISASTER_ZONES[0];
    
    // Optimistic synthesis plan formulation
    const dummyPlan: RiskMissionSynthesisPlan = {
      plan_id: `plan_${Date.now().toString(16).slice(-6)}`,
      alert_id: alertId,
      place_name: zone.place_name,
      district: zone.district,
      state: zone.state,
      risk_score: 84.5,
      risk_category: 'CRITICAL',
      search_area_km2: 0.045,
      search_polygon_coords: [
        [zone.latitude - 0.0015, zone.longitude - 0.0015],
        [zone.latitude - 0.0015, zone.longitude + 0.0015],
        [zone.latitude + 0.0015, zone.longitude + 0.0015],
        [zone.latitude + 0.0015, zone.longitude - 0.0015],
      ],
      num_drones_required: 3,
      assigned_drone_ids: ['drone_alpha', 'drone_bravo', 'drone_charlie'],
      battery_required_pct: 46.5,
      safe_battery_margin_pct: 53.5,
      staging_location_name: 'North Ridge Safe Staging Pad (915m MSL)',
      staging_coords: [zone.latitude + 0.004, zone.longitude + 0.002],
      charging_station_id: 'STATION-01',
      mission_waypoints: [
        { index: 0, type: 'TAKEOFF_STAGING', alt: 25.0, action: 'STAGING_ASCENT' },
        { index: 1, type: 'SEARCH_CORRIDOR_A', alt: 30.0, action: 'TRI_MODAL_SCAN' },
        { index: 2, type: 'SEARCH_CORRIDOR_B', alt: 30.0, action: 'SURVIVOR_GEO_RAYCAST' },
        { index: 3, type: 'SEARCH_CORRIDOR_C', alt: 28.0, action: 'DEBRIS_MAPPING' },
        { index: 4, type: 'RETURN_STAGING_CHARGER', alt: 0.0, action: 'PRECISION_LAND_CHARGING_BAY' },
      ],
      status: 'SYNTHESIZED',
      generated_at: Date.now() / 1000,
    };

    set({ synthesisPlan: dummyPlan });

    try {
      wsClient.sendEnvelope('risk.synthesize_mission', {
        alert_id: alertId,
        place_name: zone.place_name,
        district: zone.district,
        state: zone.state,
        latitude: zone.latitude,
        longitude: zone.longitude,
      });
    } catch (e) {
      console.error('Failed to synthesize mission:', e);
    }
    return dummyPlan;
  },

  triggerDynamicReplanning: async (hazardCellId: string, hazardType: string = 'COLLAPSED_STRUCTURE_BLOCKAGE', reportingDroneId: string = 'drone_alpha') => {
    const { synthesisPlan, replanningLog } = get();
    const newRecord = {
      timestamp: Date.now() / 1000,
      trigger_event: hazardType,
      hazard_cell_id: hazardCellId,
      reporting_drone_id: reportingDroneId,
      action_taken: 'INVALIDATED_HAZARD_CORRIDOR_AND_REDISTRIBUTED_SWARM',
      detour_heading_offset_deg: 45.0,
      min_orca_clearance_m: 3.8,
    };

    if (synthesisPlan) {
      set({
        synthesisPlan: {
          ...synthesisPlan,
          status: 'REPLANNED',
          replanning_history: [...(synthesisPlan.replanning_history || []), newRecord],
        },
        replanningLog: [newRecord, ...replanningLog],
      });
    } else {
      set({ replanningLog: [newRecord, ...replanningLog] });
    }

    try {
      wsClient.sendEnvelope('mission.dynamic_replan', {
        hazard_cell_id: hazardCellId,
        hazard_type: hazardType,
        reporting_drone_id: reportingDroneId,
      });
      return true;
    } catch (e) {
      console.error('Failed to trigger dynamic replanning:', e);
      return false;
    }
  },

  reserveChargingBayAndSwap: async (droneId: string, currentBatPct: number = 22.0) => {
    const { chargingStations } = get();
    const station = chargingStations[0];
    if (station && station.available_bays > 0) {
      const updatedStations = chargingStations.map((s) => ({
        ...s,
        occupied_bays: s.occupied_bays + 1,
        available_bays: Math.max(0, s.available_bays - 1),
        reserved_drones: [...(s.reserved_drones || []), droneId],
      }));
      set({ chargingStations: updatedStations });
    }

    try {
      wsClient.sendEnvelope('charging.reserve_and_swap', {
        drone_id: droneId,
        current_battery_pct: currentBatPct,
      });
      return true;
    } catch (e) {
      console.error('Failed to reserve charging bay:', e);
      return false;
    }
  },

  toggleOfflineMeshMode: async () => {
    const { offlineMeshMode } = get();
    const nextState = !offlineMeshMode;
    set({ offlineMeshMode: nextState });
    try {
      wsClient.sendEnvelope('forecast.toggle_offline_mesh_mode', { enabled: nextState });
    } catch (e) {
      console.error('Failed to toggle offline mode:', e);
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
