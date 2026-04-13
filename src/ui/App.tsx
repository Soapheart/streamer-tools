import React, { use, useEffect } from 'react';
import { Dashboard } from './pages/Dashboard';
import { initializeDashboardStore } from './store/useDashboardStore';

function App() {

  useEffect(() => {
    initializeDashboardStore();
  },[]);


  return <Dashboard />;
}

export default App;