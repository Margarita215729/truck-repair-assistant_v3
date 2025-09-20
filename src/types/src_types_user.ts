import { Timestamp } from 'firebase/firestore';

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'manager' | 'technician' | 'driver';
  phoneNumber?: string;
  employeeId?: string;
  certifications?: string[];
  department?: string;
  location?: string;
  createdAt: Timestamp;
  lastLogin?: Timestamp;
  profileImageUrl?: string;
}