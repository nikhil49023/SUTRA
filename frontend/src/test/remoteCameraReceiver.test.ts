/**
 * SUTRA Remote Multi-UAV Camera Receiver Test Suite
 * Subsystem D (3D GIS GCS / Remote Camera Receiver)
 *
 * Verifies:
 * - Active UAV selection (UAV-1 to UAV-8)
 * - RGB vs THERMAL modality selection
 * - Live frame ingestion via messageRouter
 * - Dynamic LIVE / NO SIGNAL detection based on frame arrival timestamps
 * - Wi-Fi transport optimization metrics (raw vs compressed size, reduction %)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useCameraStore } from '../stores/cameraStore';
import { messageRouter } from '../communication/MessageRouter';

describe('SUTRA Remote Camera Receiver & Telemetry Store', () => {
  beforeEach(() => {
    // Reset store state
    useCameraStore.setState({
      activeUav: 'uav_1',
      modality: 'RGB',
      pictureInPicture: false,
      frames: {},
      frameCounts: {},
      lastFrameTimes: {},
      measuredFps: {},
    });
  });

  it('initializes with default UAV-1 RGB and NO_SIGNAL state', () => {
    const store = useCameraStore.getState();
    expect(store.activeUav).toBe('uav_1');
    expect(store.modality).toBe('RGB');
    expect(store.getSignalStatus('uav_1', 'RGB')).toBe('NO_SIGNAL');
  });

  it('switches active UAV and modality correctly', () => {
    const store = useCameraStore.getState();
    store.setActiveUav('uav_4');
    store.setModality('THERMAL');

    const updated = useCameraStore.getState();
    expect(updated.activeUav).toBe('uav_4');
    expect(updated.modality).toBe('THERMAL');
  });

  it('routes CAMERA_FRAME message and transitions signal to LIVE', () => {
    const testFramePacket = {
      type: 'CAMERA_FRAME',
      topic: 'CAMERA_FRAME',
      drone_id: 'uav_1',
      stream_type: 'RGB',
      image_b64: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
      timestamp: Date.now(),
      width: 640,
      height: 360,
      raw_size_kb: 2764.8,
      compressed_size_kb: 41.2,
      reduction_pct: 98.5,
      fps: 15.0,
      latency_ms: 12,
    };

    messageRouter.routeMessage(testFramePacket);

    const store = useCameraStore.getState();
    expect(store.frames['uav_1_RGB']).toBeDefined();
    expect(store.frames['uav_1_RGB'].width).toBe(640);
    expect(store.frames['uav_1_RGB'].height).toBe(360);
    expect(store.frames['uav_1_RGB'].raw_size_kb).toBe(2764.8);
    expect(store.frames['uav_1_RGB'].compressed_size_kb).toBe(41.2);
    expect(store.frames['uav_1_RGB'].reduction_pct).toBe(98.5);

    // Live signal detection
    expect(store.getSignalStatus('uav_1', 'RGB')).toBe('LIVE');
    // Other UAVs still report NO_SIGNAL
    expect(store.getSignalStatus('uav_2', 'RGB')).toBe('NO_SIGNAL');
    expect(store.getSignalStatus('uav_1', 'THERMAL')).toBe('NO_SIGNAL');
  });

  it('correctly calculates NO_SIGNAL when frame timeout expires', () => {
    const staleTime = Date.now() - 3000; // 3 seconds ago (> 1.8s timeout)
    useCameraStore.setState({
      lastFrameTimes: {
        uav_1_RGB: staleTime,
      },
    });

    const store = useCameraStore.getState();
    expect(store.getSignalStatus('uav_1', 'RGB')).toBe('NO_SIGNAL');
  });
});
