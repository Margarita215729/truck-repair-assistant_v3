import { RepairRecord } from '../types/repairRecord';
import { firestore } from '../config/firebase';
import firebase from 'firebase/app';

export class RepairService {
  private collection = firestore.collection('repairs');

  async getAllRepairs(): Promise<RepairRecord[]> {
    try {
      const snapshot = await this.collection.orderBy('createdAt', 'desc').get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as Omit<RepairRecord, 'id'>
      }));
    } catch (error) {
      console.error('Error fetching repairs:', error);
      throw error;
    }
  }

  async getRepairById(id: string): Promise<RepairRecord | null> {
    try {
      const doc = await this.collection.doc(id).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() as Omit<RepairRecord, 'id'> };
    } catch (error) {
      console.error(`Error fetching repair ${id}:`, error);
      throw error;
    }
  }

  async createRepair(data: Omit<RepairRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<RepairRecord> {
    try {
      const repairData = {
        ...data,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      const docRef = await this.collection.add(repairData);
      const newDoc = await docRef.get();
      
      return { 
        id: docRef.id, 
        ...newDoc.data() as Omit<RepairRecord, 'id'> 
      };
    } catch (error) {
      console.error('Error creating repair:', error);
      throw error;
    }
  }

  async updateRepair(id: string, data: Partial<RepairRecord>): Promise<RepairRecord> {
    try {
      const updateData = {
        ...data,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      await this.collection.doc(id).update(updateData);
      const updated = await this.getRepairById(id);
      
      if (!updated) {
        throw new Error('Failed to retrieve updated repair');
      }
      
      return updated;
    } catch (error) {
      console.error(`Error updating repair ${id}:`, error);
      throw error;
    }
  }

  async deleteRepair(id: string): Promise<void> {
    try {
      await this.collection.doc(id).delete();
    } catch (error) {
      console.error(`Error deleting repair ${id}:`, error);
      throw error;
    }
  }
  
  async getRepairsByTruckId(truckId: string): Promise<RepairRecord[]> {
    try {
      const snapshot = await this.collection
        .where('truckId', '==', truckId)
        .orderBy('createdAt', 'desc')
        .get();
        
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as Omit<RepairRecord, 'id'>
      }));
    } catch (error) {
      console.error(`Error fetching repairs for truck ${truckId}:`, error);
      throw error;
    }
  }
}

export default new RepairService();