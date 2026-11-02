import React from 'react';
import { Dashboard } from './Dashboard';
import type { AppDatabaseState } from '../db/sqlite-manager';

interface DashboardViewProps {
  dbState: AppDatabaseState;
  onNavigate: (tab: string) => void;
  onGenerateAnonymat: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = (props) => {
  return <Dashboard {...props} />;
};
