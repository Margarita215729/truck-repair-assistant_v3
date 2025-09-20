import { Timestamp } from 'firebase/firestore';

export interface RepairRecord {
  id: string;
  truckId: string;
  truckModel: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTechnicians: string[];
  partsUsed: {
    partId: string;
    name: string;
    quantity: number;
    cost: number;
  }[];
  laborHours: number;
  startDate?: Timestamp;
  completionDate?: Timestamp;
  totalCost?: number;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}