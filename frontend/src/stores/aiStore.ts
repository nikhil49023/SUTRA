import { create } from 'zustand';
import {
  AIMode,
  AIState,
  AssistantMessage,
  BatteryPrediction,
  ETAPrediction,
  FailurePrediction,
  RecommendationItem,
  ThreatItem,
} from '../types/ai';

interface AIStoreState extends AIState {
  setMode: (mode: AIMode) => void;
  addRecommendation: (rec: RecommendationItem) => void;
  updateRecommendationStatus: (id: string, status: 'ACCEPTED' | 'REJECTED' | 'DISMISSED') => void;
  addAssistantMessage: (msg: AssistantMessage) => void;
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
      text: 'Smart Horizon AI Tactical Advisor initialized. Flight plan ALPHA RECON meets all spatial separation constraints.',
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
  hydrateFromSnapshot: (state) => set((s) => ({ ...s, ...state })),
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
    }
  },
}));
