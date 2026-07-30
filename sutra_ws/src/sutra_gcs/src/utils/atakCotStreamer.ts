/**
 * SUTRA Tactical COP — ATAK / WinTAK Cursor-on-Target (CoT) MIL-STD-2525 Serializer
 * Integrates Project SUTRA survivor alerts with US Army / NATO ATAK & WinTAK ground stations.
 */

export interface CotTarget {
  id: string;
  type: 'SURVIVOR' | 'POSSIBLE_SURVIVOR' | 'THREAT';
  lat: number;
  lon: number;
  alt: number;
  confidence: number;
  detectedBy: string;
  timestamp?: string;
}

/**
 * Generates MIL-STD-2525 Cursor-on-Target (CoT) XML v2.0 Event
 */
export const generateAtakCotXml = (target: CotTarget): string => {
  const now = target.timestamp || new Date().toISOString();
  const staleTime = new Date(Date.now() + 600000).toISOString(); // Stale in 10 minutes

  // MIL-STD-2525 CoT Type Mapping:
  // a-f-G-U-C-F = Friendly/Civilian Ground Unit
  // a-h-G-U-C-F = Hostile Ground Threat
  const cotType = target.type === 'THREAT' ? 'a-h-G-U-C-F' : 'a-f-G-U-C-F';

  return `<?xml version="1.0" encoding="UTF-8"?>
<event version="2.0" uid="SUTRA-${target.id}" type="${cotType}" time="${now}" start="${now}" stale="${staleTime}">
  <point lat="${target.lat.toFixed(6)}" lon="${target.lon.toFixed(6)}" hae="${target.alt.toFixed(1)}" ce="1.5" le="1.0"/>
  <detail>
    <contact callsign="${target.type}_${target.id}"/>
    <remarks>Detected by Project SUTRA Swarm Perception (${target.detectedBy}) | Confidence: ${(target.confidence * 100).toFixed(1)}%</remarks>
    <flowTags sutra_subsystem="C_PERCEPT" consensus_term="3"/>
  </detail>
</event>`;
};
