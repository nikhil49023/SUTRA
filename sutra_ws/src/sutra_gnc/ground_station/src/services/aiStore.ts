import { useState, useEffect } from 'react';
import { 
  AIService, 
  type AIDetectionItem, 
  type AISearchZone, 
  type AIRecommendation, 
  type AIMessage 
} from './aiService';

const aiServiceInstance = new AIService();

export const INITIAL_AI_DETECTIONS: AIDetectionItem[] = [
  {
    id: 'DET-001',
    class: 'Armored Convoy Vehicle',
    category: 'VEHICLE',
    confidence: 96.4,
    threatLevel: 'CRITICAL',
    coordinates: { lat: 34.5231, lng: 45.1095 },
    bbox: { x: 35, y: 40, width: 25, height: 30 },
    timestamp: '11:42:10',
    status: 'TRACKED',
    sensorSource: 'IR_THERMAL'
  },
  {
    id: 'DET-002',
    class: 'Personnel Thermal Signature',
    category: 'PERSONNEL',
    confidence: 88.7,
    threatLevel: 'HIGH',
    coordinates: { lat: 34.5240, lng: 45.1110 },
    bbox: { x: 68, y: 25, width: 12, height: 18 },
    timestamp: '11:41:55',
    status: 'ACTIVE',
    sensorSource: 'IR_THERMAL'
  },
  {
    id: 'DET-003',
    class: 'Radar Receiver Array',
    category: 'STRUCTURE',
    confidence: 92.1,
    threatLevel: 'HIGH',
    coordinates: { lat: 34.5312, lng: 45.1205 },
    bbox: { x: 20, y: 70, width: 30, height: 25 },
    timestamp: '11:35:20',
    status: 'ACTIVE',
    sensorSource: 'EO_OPTICAL'
  }
];

export const INITIAL_RECOMMENDATIONS: AIRecommendation[] = [
  {
    id: 'REC-001',
    title: 'Ascend to 550m AGL for Thermal Clarity',
    description: 'Elevated terrain at Sector 4-B is causing minor ground clutter. Ascending +100m improves YOLO detection confidence by ~12%.',
    category: 'NAVIGATION',
    priority: 'HIGH',
    actionCommand: 'ASCEND_550M',
    timestamp: '11:43:00'
  },
  {
    id: 'REC-[#002]',
    title: 'Reroute Around Restricted Airspace',
    description: 'Waypoint 6 path encroaches No-Fly Zone Alpha by 80 meters. Auto-adjusting trajectory.',
    category: 'SAFETY',
    priority: 'HIGH',
    actionCommand: 'AUTO_REROUTE',
    timestamp: '11:40:12'
  }
];

export const INITIAL_MESSAGES: AIMessage[] = [
  {
    id: 'MSG-001',
    sender: 'AI_ASSISTANT',
    text: 'Greetings Commander Vance. Smart Horizon AI Computer Vision System is ONLINE. Ready for tactical queries or autonomous search commands.',
    timestamp: '11:30:00',
    suggestedActions: ['Scan Sector 4-B', 'Show High Threat Targets', 'Estimate Flight Time']
  }
];

export function useAIStore() {
  const [detections, setDetections] = useState<AIDetectionItem[]>(INITIAL_AI_DETECTIONS);
  const [trackedTargetId, setTrackedTargetId] = useState<string | null>('DET-001');
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>(INITIAL_RECOMMENDATIONS);
  const [messages, setMessages] = useState<AIMessage[]>(INITIAL_MESSAGES);
  const [isHeatmapEnabled, setIsHeatmapEnabled] = useState(true);

  // Simulated live YOLO inference stream
  useEffect(() => {
    const interval = setInterval(() => {
      // Small random confidence fluctuation
      setDetections((prev) =>
        prev.map((det) => ({
          ...det,
          confidence: +(det.confidence + (Math.random() * 0.4 - 0.2)).toFixed(1)
        }))
      );
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const sendNaturalLanguageQuery = async (queryText: string) => {
    const userMsg: AIMessage = {
      id: `MSG-${Date.now()}`,
      sender: 'USER',
      text: queryText,
      timestamp: new Date().toTimeString().split(' ')[0]
    };

    setMessages((prev) => [...prev, userMsg]);

    // Process with AIService
    const replyMsg = await aiServiceInstance.processNaturalLanguageQuery(queryText);
    setMessages((prev) => [...prev, replyMsg]);
  };

  const lockTarget = (targetId: string) => {
    setTrackedTargetId(targetId);
    setDetections((prev) =>
      prev.map((d) => (d.id === targetId ? { ...d, status: 'TRACKED' } : { ...d, status: 'ACTIVE' }))
    );
  };

  const dismissRecommendation = (recId: string) => {
    setRecommendations((prev) => prev.filter((r) => r.id !== recId));
  };

  return {
    detections,
    trackedTargetId,
    recommendations,
    messages,
    isHeatmapEnabled,
    setIsHeatmapEnabled,
    sendNaturalLanguageQuery,
    lockTarget,
    dismissRecommendation
  };
}
