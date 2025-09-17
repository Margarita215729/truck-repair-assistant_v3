import { ServiceCenter } from '../types/serviceCenter';
import { firestore } from '../config/firebase';

export class ServiceLocatorService {
  private collection = firestore.collection('serviceCenters');

  async getServiceCenters(): Promise<ServiceCenter[]> {
    try {
      const snapshot = await this.collection.get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as Omit<ServiceCenter, 'id'>
      }));
    } catch (error) {
      console.error('Error fetching service centers:', error);
      return [];
    }
  }
  
  async getServiceCenterById(id: string): Promise<ServiceCenter | null> {
    try {
      const doc = await this.collection.doc(id).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() as Omit<ServiceCenter, 'id'> };
    } catch (error) {
      console.error(`Error fetching service center ${id}:`, error);
      return null;
    }
  }
}

export default new ServiceLocatorService();