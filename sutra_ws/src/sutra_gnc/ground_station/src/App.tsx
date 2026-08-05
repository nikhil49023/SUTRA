import React from 'react';
import { MasterTacticalDashboard } from './dashboard/layout/Dashboard';
import { NotificationToastContainer } from './components/common/NotificationToast';
import { ErrorBoundary } from './components/common/ErrorBoundary';

export function App() {
  return (
    <ErrorBoundary fallbackTitle="TACTICAL OPERATIONS CENTER EXCEPTION">
      <NotificationToastContainer />
      <MasterTacticalDashboard />
    </ErrorBoundary>
  );
}

export default App;
