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
      activeWorld: 'WORLD_1',
      activeUav: 'uav_1',
      modality: 'RGB',
      pictureInPicture: false,
      feedStatuses: {},
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

  it('supports World Selector and switches between Friend 1 and Friend 2 Gazebo feeds', () => {
    const store = useCameraStore.getState();
    expect(store.activeWorld).toBe('WORLD_1');
    expect(store.worlds.WORLD_1.name).toContain("Friend 1");
    expect(store.worlds.WORLD_2.name).toContain("Friend 2");

    // Default stream URLs for World 1
    const world1Url = store.getStreamUrl('WORLD_1', 'uav_1', 'RGB');
    expect(world1Url).toBe('http://10.152.0.191:8080/stream/uav_1');

    // Switch to World 2
    store.setActiveWorld('WORLD_2');
    const updated = useCameraStore.getState();
    expect(updated.activeWorld).toBe('WORLD_2');

    // Stream URLs now resolve to World 2
    const world2Url = updated.getStreamUrl('WORLD_2', 'uav_2', 'RGB');
    expect(world2Url).toBe('http://10.152.0.192:8080/stream/uav_2');

    // Switching worlds immediately switches available UAV feeds with authentic counts
    expect(updated.worlds.WORLD_1.uavs).toHaveLength(5);
    expect(updated.worlds.WORLD_2.uavs).toHaveLength(4);
    expect(updated.worlds.WORLD_2.uavs[0].name).toBe('Vector-1 Alpha');

    // When active UAV is uav_5 (only in World 1) and user switches to World 2, it clamps to uav_1
    store.setActiveWorld('WORLD_1');
    store.setActiveUav('uav_5');
    expect(useCameraStore.getState().activeUav).toBe('uav_5');
    store.setActiveWorld('WORLD_2');
    expect(useCameraStore.getState().activeUav).toBe('uav_1');
  });

  it('identifies each feed by world_id, drone_id, timestamp, and stream_url/topic', () => {
    const store = useCameraStore.getState();
    
    // WORLD 1 + UAV 1
    const url1 = store.getStreamUrl('WORLD_1', 'uav_1', 'RGB');
    const topic1 = store.getStreamTopic('WORLD_1', 'uav_1', 'RGB');
    expect(url1).toBe('http://10.152.0.191:8080/stream/uav_1');
    expect(topic1).toBe('/uav_1/camera/image_raw');

    // WORLD 2 + UAV 2
    const url2 = store.getStreamUrl('WORLD_2', 'uav_2', 'THERMAL');
    const topic2 = store.getStreamTopic('WORLD_2', 'uav_2', 'THERMAL');
    expect(url2).toBe('http://10.152.0.192:8080/stream/uav_2/thermal');
    expect(topic2).toBe('/world_2/uav_2/thermal/image_raw');
  });

  it('reports Connected, Connecting, and Offline connection status for each world and feed', () => {
    const store = useCameraStore.getState();
    
    // Initially offline
    expect(store.getFeedStatus('WORLD_1', 'uav_1', 'RGB')).toBe('OFFLINE');
    expect(store.getWorldStatus('WORLD_1')).toBe('OFFLINE');

    // Mark connecting
    store.markFeedConnecting('WORLD_1', 'uav_1', 'RGB');
    expect(store.getFeedStatus('WORLD_1', 'uav_1', 'RGB')).toBe('CONNECTING');
    expect(store.getWorldStatus('WORLD_1')).toBe('CONNECTING');

    // Ingest live frame -> Connected
    const framePacket = {
      type: 'CAMERA_FRAME',
      world_id: 'WORLD_1',
      drone_id: 'uav_1',
      stream_type: 'RGB',
      image_b64: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
      timestamp: Date.now(),
    };
    messageRouter.routeMessage(framePacket);

    expect(useCameraStore.getState().getFeedStatus('WORLD_1', 'uav_1', 'RGB')).toBe('CONNECTED');
    expect(useCameraStore.getState().getWorldStatus('WORLD_1')).toBe('CONNECTED');
    expect(useCameraStore.getState().getWorldStatus('WORLD_2')).toBe('OFFLINE');

    // Explicitly mark offline
    useCameraStore.getState().markFeedOffline('WORLD_1', 'uav_1', 'RGB');
    expect(useCameraStore.getState().getFeedStatus('WORLD_1', 'uav_1', 'RGB')).toBe('OFFLINE');
  });

  it('allows customizing world base URLs without reloading component', () => {
    const store = useCameraStore.getState();
    store.setWorldBaseUrl('WORLD_1', 'http://192.168.1.100:8080');
    expect(useCameraStore.getState().getStreamUrl('WORLD_1', 'uav_1', 'RGB')).toBe(
      'http://192.168.1.100:8080/stream/uav_1'
    );
  });

  it('strictly isolates WORLD_1 and WORLD_2 camera frames without cross-contamination', () => {
    const store = useCameraStore.getState();

    // Ingest frame for WORLD_2
    const world2Packet = {
      type: 'CAMERA_FRAME',
      world_id: 'WORLD_2',
      drone_id: 'uav_1',
      stream_type: 'RGB',
      image_b64: 'data:image/jpeg;base64,WORLD_2_IMAGE_PAYLOAD',
      timestamp: Date.now(),
      width: 960,
      height: 540,
    };
    messageRouter.routeMessage(world2Packet);

    const afterW2 = useCameraStore.getState();
    // WORLD_2 frame is strictly in WORLD_2 slot
    expect(afterW2.frames['WORLD_2_uav_1_RGB']).toBeDefined();
    expect(afterW2.frames['WORLD_2_uav_1_RGB'].image_b64).toContain('WORLD_2_IMAGE_PAYLOAD');

    // WORLD_1 must NOT have received WORLD_2 frame
    expect(afterW2.frames['WORLD_1_uav_1_RGB']).toBeUndefined();
    // Legacy slot must NOT be polluted with WORLD_2 frame
    expect(afterW2.frames['uav_1_RGB']).toBeUndefined();

    // Signal status: WORLD_2 is LIVE, WORLD_1 is NO_SIGNAL
    expect(afterW2.getSignalStatus('uav_1', 'RGB', 'WORLD_2')).toBe('LIVE');
    expect(afterW2.getSignalStatus('uav_1', 'RGB', 'WORLD_1')).toBe('NO_SIGNAL');

    // Ingest frame for WORLD_1
    const world1Packet = {
      type: 'CAMERA_FRAME',
      world_id: 'WORLD_1',
      drone_id: 'uav_1',
      stream_type: 'RGB',
      image_b64: 'data:image/jpeg;base64,WORLD_1_IMAGE_PAYLOAD',
      timestamp: Date.now(),
      width: 640,
      height: 360,
    };
    messageRouter.routeMessage(world1Packet);

    const afterW1 = useCameraStore.getState();
    // WORLD_1 frame is in WORLD_1 slot and legacy alias
    expect(afterW1.frames['WORLD_1_uav_1_RGB']?.image_b64).toContain('WORLD_1_IMAGE_PAYLOAD');
    expect(afterW1.frames['uav_1_RGB']?.image_b64).toContain('WORLD_1_IMAGE_PAYLOAD');

    // WORLD_2 frame is completely untouched
    expect(afterW1.frames['WORLD_2_uav_1_RGB']?.image_b64).toContain('WORLD_2_IMAGE_PAYLOAD');

    // Both worlds report LIVE for their own feeds
    expect(afterW1.getSignalStatus('uav_1', 'RGB', 'WORLD_1')).toBe('LIVE');
    expect(afterW1.getSignalStatus('uav_1', 'RGB', 'WORLD_2')).toBe('LIVE');
  });
});
