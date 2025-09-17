export interface ServiceCenter {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  email?: string;
  website?: string;
  hoursOfOperation: {
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
    sunday: string;
  };
  services: string[];
  coordinates: {
    latitude: number;
    longitude: number;
  };
  rating?: number;
  reviewCount?: number;
  certifications?: string[];
}