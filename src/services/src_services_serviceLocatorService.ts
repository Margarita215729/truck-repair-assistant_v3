import { ServiceCenter } from '../types/serviceCenter';
import { firestore } from '../config/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

export class ServiceLocatorService {
  private collectionName = 'serviceCenters';

  async getServiceCenters(): Promise<ServiceCenter[]> {
    try {
      const collectionRef = collection(firestore, this.collectionName);
      const snapshot = await getDocs(collectionRef);
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
      const docRef = doc(firestore, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      return { id: docSnap.id, ...docSnap.data() as Omit<ServiceCenter, 'id'> };
    } catch (error) {
      console.error(`Error fetching service center ${id}:`, error);
      return null;
    }
  }
}

export default new ServiceLocatorService();