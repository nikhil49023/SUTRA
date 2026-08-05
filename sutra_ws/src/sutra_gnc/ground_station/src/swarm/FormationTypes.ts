/* ============================================================
   Swarm Formation Types & Interfaces
   ============================================================ */

export type FormationType =
  | 'LINE'
  | 'COLUMN'
  | 'V_FORMATION'
  | 'DIAMOND'
  | 'ECHELON_LEFT'
  | 'ECHELON_RIGHT'
  | 'CIRCLE'
  | 'GRID'
  | 'CUSTOM';

export interface FormationOffset {
  droneId: string;
  index: number;
  dxMeters: number; // Right (+) / Left (-)
  dyMeters: number; // Forward (+) / Backward (-)
  dzMeters: number; // Up (+) / Down (-)
  isLeader: boolean;
}

export interface FormationTarget {
  droneId: string;
  index: number;
  targetLat: number;
  targetLng: number;
  targetAlt: number;
  headingDegrees: number;
  dxMeters: number;
  dyMeters: number;
  isLeader: boolean;
}

export interface FormationConfig {
  type: FormationType;
  leaderId: string;
  spacingMeters: number;
  headingDegrees: number;
  altOffsetMeters: number;
}
