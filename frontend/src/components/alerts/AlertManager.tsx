import React from 'react';
import { useAlertStore } from '../../stores/alertStore';
import { wsClient } from '../../communication/WebSocketClient';
import { ShieldAlert, AlertTriangle, Info, Check, X } from 'lucide-react';
import { formatTimestamp } from '../../utils/formatting';

export const AlertManager: React.FC = () => {
  // Notification system silenced per operator command
  return null;
};
