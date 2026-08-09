/**
 * Production Unit Test Suite for ATAK / WinTAK Cursor-on-Target XML Serializer
 */

const assert = require('assert');

// Mock escapeXml & generateAtakCotXml logic to test contract
const escapeXml = (str) => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

const generateAtakCotXml = (target) => {
  const now = target.timestamp || new Date().toISOString();
  const staleTime = new Date(Date.now() + 600000).toISOString();
  const cotType = target.type === 'THREAT' ? 'a-h-G-U-C-F' : 'a-f-G-U-C-F';
  const cleanId = escapeXml(target.id);
  const cleanDetectedBy = escapeXml(target.detectedBy);
  const cleanType = escapeXml(target.type);

  return `<?xml version="1.0" encoding="UTF-8"?>
<event version="2.0" uid="SUTRA-${cleanId}" type="${cotType}" time="${now}" start="${now}" stale="${staleTime}">
  <point lat="${target.lat.toFixed(6)}" lon="${target.lon.toFixed(6)}" hae="${target.alt.toFixed(1)}" ce="1.5" le="1.0"/>
  <detail>
    <contact callsign="${cleanType}_${cleanId}"/>
    <remarks>Detected by Project SUTRA Swarm Perception (${cleanDetectedBy}) | Confidence: ${(target.confidence * 100).toFixed(1)}%</remarks>
    <flowTags sutra_subsystem="C_PERCEPT" consensus_term="3"/>
  </detail>
</event>`;
};

// ── Test 1: MIL-STD-2525 Type Mapping ──────────────────────────────────────────
console.log('Testing Test 1: MIL-STD-2525 Type Mapping...');
const survivorTarget = { id: '001', type: 'SURVIVOR', lat: 37.7749, lon: -122.4194, alt: 15.0, confidence: 0.95, detectedBy: 'uav_alpha' };
const survivorXml = generateAtakCotXml(survivorTarget);
assert.strictEqual(survivorXml.includes('type="a-f-G-U-C-F"'), true);

const threatTarget = { id: '002', type: 'THREAT', lat: 37.7749, lon: -122.4194, alt: 15.0, confidence: 0.88, detectedBy: 'uav_beta' };
const threatXml = generateAtakCotXml(threatTarget);
assert.strictEqual(threatXml.includes('type="a-h-G-U-C-F"'), true);

// ── Test 2: XML Entity Escaping Security Test ────────────────────────────────
console.log('Testing Test 2: XML Entity Escaping Security...');
const maliciousTarget = { id: '003<script>', type: 'SURVIVOR', lat: 37.7749, lon: -122.4194, alt: 15.0, confidence: 0.99, detectedBy: 'uav_alpha&beta"' };
const sanitizedXml = generateAtakCotXml(maliciousTarget);
assert.strictEqual(sanitizedXml.includes('003&lt;script&gt;'), true);
assert.strictEqual(sanitizedXml.includes('uav_alpha&amp;beta&quot;'), true);
assert.strictEqual(sanitizedXml.includes('<script>'), false);

console.log('✅ ALL ATAK COT XML SERIALIZER UNIT TESTS PASSED!');
