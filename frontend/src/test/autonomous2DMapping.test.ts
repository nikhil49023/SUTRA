import { describe, it, expect, beforeEach } from 'vitest';
import { useMappingStore } from '../stores/mappingStore';
import { messageRouter } from '../communication/MessageRouter';

describe('Project SUTRA — Real-Time 2D Autonomous Mapping Engine (Frontend)', () => {
  beforeEach(() => {
    useMappingStore.getState().resetLocalMap();
  });

  it('initializes in an empty / unexplored world state', () => {
    const state = useMappingStore.getState();
    expect(state.totalCells).toBe(0);
    expect(state.exploredAreaM2).toBe(0);
    expect(state.survivorsLocated).toBe(0);
    expect(state.gridGeoJson.features).toHaveLength(0);
    expect(state.survivorPins).toHaveLength(0);
  });

  it('merges incremental grid delta features into GeoJSON collection without duplicating cells', () => {
    const delta1: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[77.69, 12.93], [77.691, 12.93], [77.691, 12.931], [77.69, 12.931], [77.69, 12.93]]],
          },
          properties: {
            cell_id: '0_0',
            semantic_type: 'FREE',
            confidence: 0.8,
            observed_by: ['alpha'],
          },
        },
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[77.691, 12.93], [77.692, 12.93], [77.692, 12.931], [77.691, 12.931], [77.691, 12.93]]],
          },
          properties: {
            cell_id: '1_0',
            semantic_type: 'FREE',
            confidence: 0.8,
            observed_by: ['alpha'],
          },
        },
      ],
    };

    useMappingStore.getState().handleGridDelta(delta1, {
      total_cells: 2,
      total_area_m2: 8.0,
      total_area_km2: 0.000008,
      resolution_m: 2.0,
      semantic_breakdown: { FREE: 2 },
      survivors_located: 0,
      last_update: 100,
    });

    expect(useMappingStore.getState().totalCells).toBe(2);
    expect(useMappingStore.getState().gridGeoJson.features).toHaveLength(2);

    // Delta 2 updates cell 0_0 with higher confidence and Drone Bravo observation
    const delta2: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[77.69, 12.93], [77.691, 12.93], [77.691, 12.931], [77.69, 12.931], [77.69, 12.93]]],
          },
          properties: {
            cell_id: '0_0',
            semantic_type: 'FREE',
            confidence: 0.95,
            observed_by: ['alpha', 'bravo'],
          },
        },
      ],
    };

    useMappingStore.getState().handleGridDelta(delta2);

    // Count remains 2 (no duplicate cell created)
    expect(useMappingStore.getState().totalCells).toBe(2);
    expect(useMappingStore.getState().gridGeoJson.features).toHaveLength(2);
    const updatedCell = useMappingStore.getState().gridGeoJson.features.find((f) => f.properties?.cell_id === '0_0');
    expect(updatedCell?.properties?.confidence).toBe(0.95);
  });

  it('extracts survivor pins and updates survivor counter when SURVIVOR detection arrives', () => {
    const survivorDelta: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[77.6950, 12.9350], [77.6952, 12.9350], [77.6952, 12.9352], [77.6950, 12.9352], [77.6950, 12.9350]]],
          },
          properties: {
            cell_id: '15_20',
            semantic_type: 'SURVIVOR',
            confidence: 0.97,
            observed_by: ['charlie'],
            survivor_data: { thermal_temp: 36.8 },
          },
        },
      ],
    };

    useMappingStore.getState().handleGridDelta(survivorDelta);

    const state = useMappingStore.getState();
    expect(state.survivorsLocated).toBe(1);
    expect(state.survivorPins).toHaveLength(1);
    expect(state.survivorPins[0].cell_id).toBe('15_20');
    expect(state.survivorPins[0].confidence).toBe(0.97);
  });

  it('routes WebSocket mapping.grid_delta events through MessageRouter', () => {
    messageRouter.routeMessage({
      type: 'EVENT',
      event_type: 'mapping.grid_delta',
      payload: {
        delta: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [[[77.69, 12.93], [77.691, 12.93], [77.691, 12.931], [77.69, 12.931], [77.69, 12.93]]],
              },
              properties: {
                cell_id: '5_5',
                semantic_type: 'OBSTACLE',
                confidence: 0.88,
              },
            },
          ],
        },
        metrics: {
          total_cells: 1,
          total_area_m2: 4.0,
          semantic_breakdown: { OBSTACLE: 1 },
          survivors_located: 0,
        },
      },
    });

    const state = useMappingStore.getState();
    expect(state.totalCells).toBe(1);
    expect(state.semanticBreakdown.OBSTACLE).toBe(1);
  });

  it('toggles semantic category visibility', () => {
    expect(useMappingStore.getState().visibleSemantics.FREE).toBe(true);
    useMappingStore.getState().toggleSemanticVisibility('FREE');
    expect(useMappingStore.getState().visibleSemantics.FREE).toBe(false);
    useMappingStore.getState().toggleSemanticVisibility('FREE');
    expect(useMappingStore.getState().visibleSemantics.FREE).toBe(true);
  });
});
