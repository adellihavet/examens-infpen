import React from 'react';
import { AnonymatGrading } from './AnonymatGrading';
import type { AppDatabaseState } from '../db/sqlite-manager';
import type { GradeRecord } from '../utils/crypto-anonymat';

interface GradeEntryViewProps {
  dbState: AppDatabaseState;
  onUpdateGrades: (grades: GradeRecord[]) => void;
  onAddAuditLog: (action: string, details: string, severity?: 'info' | 'warning' | 'security') => void;
}

export const GradeEntryView: React.FC<GradeEntryViewProps> = (props) => {
  return <AnonymatGrading {...props} />;
};
