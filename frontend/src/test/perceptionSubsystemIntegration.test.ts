import { describe, it, expect, beforeEach } from 'vitest';
import { useAIStore } from '../stores/aiStore';
import { useSelectionStore } from '../stores/selectionStore';
import { messageRouter } from '../communication/MessageRouter';
import { TrackedTarget } from '../types/ai';

describe('Smart Horizon GCS — Subsystem C (AI Perception) Frontend Integration', () => {
  beforeEach(() => {
    useAIStore.setState({
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
    });
    useSelectionStore.getState().clearSelection();
    messageRouter.resetMetrics();
  });

  it('1. updates AIStore on ai.target_detected event', () => {
    const rawTarget = {
      id: 101,
      target_id: '101',
      label: 'SURVIVOR',
      confidence: 0.948,
      lat: 20.59365,
      lon: 78.96285,
      alt: 15.0,
      modalities: ['visual', 'thermal'],
      drone_id: 'alpha',
      tracking_status: 'DETECTED',
      ts: 1772320000.0,
    };

    useAIStore.getState().updateFromEvent('ai.target_detected', { target: rawTarget });

    const targets = useAIStore.getState().tracked_targets;
    expect(targets).toHaveLength(1);
    expect(targets[0].target_id).toBe('101');
    expect(targets[0].label).toBe('SURVIVOR');
    expect(targets[0].confidence).toBe(0.948);
    expect(targets[0].latitude).toBe(20.59365);
    expect(targets[0].longitude).toBe(78.96285);
    expect(targets[0].drone_id).toBe('alpha');
  });

  it('2. updates existing target in-place on ai.target_updated without duplicates', () => {
    // Initial detection
    useAIStore.getState().updateTrackedTarget({
      target_id: '101',
      label: 'SURVIVOR',
      latitude: 20.59365,
      longitude: 78.96285,
      altitude_m: 15.0,
      confidence: 0.90,
      source: 'sutra_perception',
      drone_id: 'alpha',
      tracking_status: 'DETECTED',
      last_seen: Date.now() - 1000,
    });

    expect(useAIStore.getState().tracked_targets).toHaveLength(1);

    // Update with higher confidence & new position
    useAIStore.getState().updateFromEvent('ai.target_updated', {
      target: {
        id: 101,
        label: 'SURVIVOR',
        confidence: 0.95,
        lat: 20.59370,
        lon: 78.96290,
        alt: 16.0,
        drone_id: 'alpha',
        tracking_status: 'TRACKED',
      },
    });

    const targets = useAIStore.getState().tracked_targets;
    expect(targets).toHaveLength(1); // No duplicate!
    expect(targets[0].confidence).toBe(0.95);
    expect(targets[0].latitude).toBe(20.59370);
    expect(targets[0].tracking_status).toBe('TRACKED');
  });

  it('3. transitions target status to LOST on ai.target_lost event', () => {
    useAIStore.getState().updateTrackedTarget({
      target_id: '102',
      label: 'POSSIBLE_SURVIVOR',
      latitude: 20.594,
      longitude: 78.963,
      altitude_m: 12.0,
      confidence: 0.65,
      source: 'sutra_perception',
      drone_id: 'bravo',
      tracking_status: 'TRACKED',
      last_seen: Date.now() - 10000,
    });

    useAIStore.getState().updateFromEvent('ai.target_lost', { target_id: '102' });

    const target = useAIStore.getState().tracked_targets.find((t) => t.target_id === '102');
    expect(target).toBeDefined();
    expect(target?.tracking_status).toBe('LOST');
  });

  it('4. updates perception status metrics on ai.perception_status event', () => {
    useAIStore.getState().updateFromEvent('ai.perception_status', {
      connected: true,
      status: 'CONNECTED',
      inference_fps: 18.5,
      inference_latency_ms: 12.4,
      active_tracks: 2,
      last_message_time: Date.now(),
    });

    const status = useAIStore.getState().perception_status;
    expect(status?.connected).toBe(true);
    expect(status?.status).toBe('CONNECTED');
    expect(status?.inference_fps).toBe(18.5);
    expect(status?.active_tracks).toBe(2);
  });

  it('5. allows selecting and deselecting AI targets in SelectionStore', () => {
    useSelectionStore.getState().selectTarget('101');
    expect(useSelectionStore.getState().selected_type).toBe('TARGET');
    expect(useSelectionStore.getState().selected_id).toBe('101');

    useSelectionStore.getState().clearSelection();
    expect(useSelectionStore.getState().selected_type).toBe('NONE');
    expect(useSelectionStore.getState().selected_id).toBeNull();
  });
});
