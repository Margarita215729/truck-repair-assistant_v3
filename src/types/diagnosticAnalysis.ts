export interface AnalysisResults {
  primaryIssue: {
    component: string;
    problem: string;
    confidence: number;
    severity: string;
  };
  secondaryIssues: Array<{
    component: string;
    problem: string;
    confidence: number;
    severity: string;
  }>;
  recommendations: Array<{
    action: string;
    priority: string;
    estimatedTime: string;
    cost: string;
    difficulty: string;
  }>;
  repairShops?: Array<{
    id: number;
    name: string;
    distance: string;
    rating: number;
    specialties: string[];
    phone: string;
    address: string;
    availability: string;
    estimatedCost: string;
  }>;
  partsAndCosts?: Array<{
    part: string;
    partNumber: string;
    estimatedCost: string;
    laborHours: string;
    priority: string;
    availability: string;
    newPrice?: string;
    usedPrice?: string;
  }>;
  towTrucks?: Array<{
    company: string;
    distance?: string;
    phone: string;
    eta?: string;
    cost: string;
    capabilities: string[];
    coverage: string;
    rating: number;
    availability?: string;
  }>;
  predictiveInsights: string[];
  fullAiResponse?: any;
}

export interface TruckComponentAnalysis {
  component: 'engine' | 'transmission' | 'brakes' | 'suspension' | 'air_system' | 'cooling' | 'electrical' | 'drivetrain';
  failure_type: string;
  confidence: number;
  anomaly_score: number;
  frequency_patterns: {
    low_freq: number;
    mid_freq: number;
    high_freq: number;
  };
  severity: 'normal' | 'minor' | 'moderate' | 'severe' | 'critical';
}
