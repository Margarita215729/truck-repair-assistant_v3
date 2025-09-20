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
  createdAt: Date;
  lastLogin?: Date;
  profileImageUrl?: string;
}