import { create } from 'zustand';
import {
  AIMode,
  AIState,
  AssistantMessage,
  BatteryPrediction,
  ETAPrediction,
  FailurePrediction,
  PerceptionStatus,
  RecommendationItem,
  ThreatItem,
  TrackedTarget,
} from '../types/ai';

interface AIStoreState extends AIState {
  setMode: (mode: AIMode) => void;
  addRecommendation: (rec: RecommendationItem) => void;
  updateRecommendationStatus: (id: string, status: 'ACCEPTED' | 'REJECTED' | 'DISMISSED') => void;
  addAssistantMessage: (msg: AssistantMessage) => void;
  updateTrackedTarget: (target: TrackedTarget) => void;
  removeTrackedTarget: (targetId: string) => void;
  updatePerceptionStatus: (status: Partial<PerceptionStatus>) => void;
  hydrateFromSnapshot: (state: Partial<AIState>) => void;
  updateFromEvent: (topic: string, payload: any) => void;
}

export const useAIStore = create<AIStoreState>((set) => ({
  enabled: true,
  mode: 'ADVISORY',
  analysis_status: 'COMPLETED',
  last_update: Date.now(),
  overall_confidence: 0.95,
  recommendations: [
    {
      recommendation_id: 'rec-1',
      title: 'Optimize Flight Speed for Wind Vector',
      message: 'Headwind component increased to 4.2 m/s. Reduce cruise speed to 5.5 m/s to preserve 8% battery reserve.',
      reason: 'Wind sensor detected 230° / 4.2 m/s shear',
      severity: 'LOW',
      requires_operator_approval: true,
      status: 'PENDING',
      confidence: 0.92,
      source: 'aero_optimizer',
      timestamp: Date.now() - 60000,
    },
  ],
  battery_predictions: {
    drone_alpha: {
      drone_id: 'drone_alpha',
      current_battery_pct: 98.0,
      predicted_rth_pct: 18.5,
      predicted_landing_pct: 74.0,
      discharge_rate_pct_per_min: 1.2,
      reserve_margin_pct: 6.5,
      is_anomaly: false,
      confidence: 0.94,
      timestamp: Date.now(),
    },
  },
  eta_predictions: {
    drone_alpha: {
      drone_id: 'drone_alpha',
      eta_to_next_waypoint_sec: 25,
      eta_to_mission_end_sec: 210,
      eta_to_home_sec: 130,
      estimated_distance_remaining_m: 1250,
      average_speed_mps: 6.0,
      confidence: 0.96,
      timestamp: Date.now(),
    },
  },
  threats: [],
  tracked_targets: [],
  perception_status: {
    connected: false,
    status: 'OFFLINE',
    last_message_time: 0,
    message_count: 0,
    rejected_count: 0,
    inference_fps: 0,
    inference_latency_ms: 0,
    active_tracks: 0,
    last_error: null,
  },
  failure_predictions: [
    {
      prediction_id: 'fp-1',
      drone_id: 'drone_alpha',
      subsystem: 'PROPULSION',
      failure_type: 'MOTOR_VIBRATION',
      severity: 'LOW',
      probability: 0.05,
      confidence: 0.88,
      evidence: 'Vibration harmonics nominal',
      timestamp: Date.now(),
    },
  ],
  risk_assessment: 'LOW',
  assistant_messages: [
    {
      msg_id: 'init-1',
      sender: 'ASSISTANT',
      text: 'Smart Horizon AI Tactical Advisor initialized. Subsystem C AI Perception listener online.',
      timestamp: Date.now(),
    },
  ],

  setMode: (mode) => set({ mode }),
  addRecommendation: (rec) =>
    set((s) => ({ recommendations: [rec, ...s.recommendations] })),
  updateRecommendationStatus: (id, status) =>
    set((s) => ({
      recommendations: s.recommendations.map((r) =>
        r.recommendation_id === id ? { ...r, status } : r
      ),
    })),
  addAssistantMessage: (msg) =>
    set((s) => ({ assistant_messages: [...s.assistant_messages, msg] })),

  updateTrackedTarget: (target) =>
    set((s) => {
      const targetId = String(target.target_id || target.id);
      const normalizedTarget = {
        ...target,
        target_id: targetId,
        id: targetId,
        world_id: target.world_id || 'WORLD_1',
        last_seen: target.last_seen || Date.now(),
      };
      const exists = s.tracked_targets.some((t) => String(t.target_id || t.id) === targetId);
      const newTargets = exists
        ? s.tracked_targets.map((t) => (String(t.target_id || t.id) === targetId ? normalizedTarget : t))
        : [...s.tracked_targets, normalizedTarget];
      return { tracked_targets: newTargets, last_update: Date.now() };
    }),

  removeTrackedTarget: (targetId) =>
    set((s) => ({
      tracked_targets: s.tracked_targets.filter((t) => String(t.target_id || t.id) !== String(targetId)),
    })),

  updatePerceptionStatus: (status) =>
    set((s) => ({
      perception_status: {
        ...(s.perception_status || {
          connected: false,
          status: 'OFFLINE',
          last_message_time: 0,
          message_count: 0,
          rejected_count: 0,
          inference_fps: 0,
          inference_latency_ms: 0,
          active_tracks: 0,
          last_error: null,
        }),
        ...status,
      },
    })),

  hydrateFromSnapshot: (state) =>
    set((s) => {
      const hydrated = { ...s, ...state };
      if (state.tracked_targets) {
        hydrated.tracked_targets = state.tracked_targets.map((t) => ({
          ...t,
          target_id: String(t.target_id || t.id),
          id: String(t.target_id || t.id),
          world_id: t.world_id || 'WORLD_1',
        }));
      }
      return hydrated;
    }),

  updateFromEvent: (topic, payload) => {
    if (topic === 'ai.recommendation' && payload && payload.recommendation) {
      set((s) => ({ recommendations: [payload.recommendation, ...s.recommendations] }));
    } else if (topic === 'ai.assistant_reply' && payload && payload.reply) {
      set((s) => ({
        assistant_messages: [
          ...s.assistant_messages,
          {
            msg_id: `reply-${Date.now()}`,
            sender: 'ASSISTANT',
            text: payload.reply,
            timestamp: Date.now(),
          },
        ],
      }));
    } else if (
      (topic === 'ai.target_detected' || topic === 'ai.target_updated' || topic === 'AI_TARGET_DETECTED' || topic === 'AI_TARGET_UPDATED') &&
      payload
    ) {
      const target = payload.target || payload;
      if (target && (target.target_id || target.id)) {
        const targetId = String(target.target_id || target.id);
        const normalizedTarget: TrackedTarget = {
          target_id: targetId,
          id: targetId,
          label: target.label || 'SURVIVOR',
          latitude: target.latitude !== undefined ? target.latitude : target.lat,
          longitude: target.longitude !== undefined ? target.longitude : target.lon,
          altitude_m: target.altitude_m !== undefined ? target.altitude_m : (target.alt || 15.0),
          confidence: target.confidence !== undefined ? target.confidence : 1.0,
          source: target.source || 'sutra_perception',
          drone_id: target.drone_id || 'alpha',
          world_id: target.world_id || payload.world_id || 'WORLD_1',
          modalities: target.modalities || ['visual'],
          tracking_status: target.tracking_status || 'TRACKED',
          history: target.history || [],
          first_seen: target.first_seen || Date.now(),
          last_seen: target.last_seen || Date.now(),
        };

        set((s) => {
          const exists = s.tracked_targets.some((t) => String(t.target_id || t.id) === targetId);
          const newTargets = exists
            ? s.tracked_targets.map((t) => (String(t.target_id || t.id) === targetId ? normalizedTarget : t))
            : [...s.tracked_targets, normalizedTarget];
          return { tracked_targets: newTargets, last_update: Date.now() };
        });
      }
    } else if ((topic === 'ai.target_lost' || topic === 'AI_TARGET_LOST') && payload) {
      const targetId = String(payload.target_id || payload.id);
      set((s) => ({
        tracked_targets: s.tracked_targets.map((t) =>
          String(t.target_id || t.id) === targetId ? { ...t, tracking_status: 'LOST' } : t
        ),
      }));
    } else if (
      (topic === 'ai.perception_status' || topic === 'AI_PERCEPTION_STATUS') &&
      payload
    ) {
      set((s) => ({
        perception_status: {
          ...(s.perception_status || {
            connected: false,
            status: 'OFFLINE',
            last_message_time: 0,
            message_count: 0,
            rejected_count: 0,
            inference_fps: 0,
            inference_latency_ms: 0,
            active_tracks: 0,
            last_error: null,
          }),
          ...payload,
        },
      }));
    } else if (topic === 'ai.state_updated' && payload) {
      if (Array.isArray(payload.tracked_targets)) {
        set({ tracked_targets: payload.tracked_targets });
      }
    }
  },
}));

