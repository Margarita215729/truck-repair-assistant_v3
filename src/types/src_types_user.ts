import firebase from 'firebase/app';

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
  createdAt: firebase.firestore.Timestamp;
  lastLogin?: firebase.firestore.Timestamp;
  profileImageUrl?: string;
}