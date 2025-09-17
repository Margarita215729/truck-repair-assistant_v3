import firebase from 'firebase/app';

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
  startDate?: firebase.firestore.Timestamp;
  completionDate?: firebase.firestore.Timestamp;
  totalCost?: number;
  notes?: string;
  createdAt: firebase.firestore.Timestamp;
  updatedAt: firebase.firestore.Timestamp;
}