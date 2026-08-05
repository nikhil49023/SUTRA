import { useState } from 'react';

export function useDashboardState() {
  const [activeTab, setActiveTab] = useState<string>('DASHBOARD');
  return { activeTab, setActiveTab };
}
