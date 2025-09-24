
// Auto-generated truck knowledge base types
export interface QuickFix {
  problem: string;
  symptoms: string[];
  quickFix: {
    action: string;
    tools: string[];
    timeToFix: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    canDriveAfter: string;
    details: string;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
}

export interface Symptom {
  symptom: string;
  possibleCauses: string[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
  inspectFirst: string[];
}

export interface EmergencyTip {
  situation: string;
  immediateActions: string[];
  whatToCheck: string[];
  temporarySolutions: string[];
  whenToCallTowing: string;
}

export interface ManualData {
  make: string;
  model: string;
  commonIssues: {
    issue: string;
    solutions: string[];
    partNumbers: string[];
  }[];
}

export interface TruckKnowledgeBase {
  quickFixes: QuickFix[];
  symptoms: Symptom[];
  emergencyTips: EmergencyTip[];
  manuals: ManualData[];
  forumSolutions: any[];
  lastUpdated: string;
}
