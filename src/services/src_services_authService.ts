import { User } from '../types/user';
import { auth, firestore } from '../config/firebase';
import firebase from 'firebase/app';

export class AuthService {
  async getCurrentUser(): Promise<User | null> {
    const user = auth.currentUser;
    if (!user) return null;
    
    try {
      const userDoc = await firestore.collection('users').doc(user.uid).get();
      if (!userDoc.exists) return null;
      
      return {
        id: user.uid,
        email: user.email || '',
        ...userDoc.data() as Omit<User, 'id' | 'email'>
      };
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  }

  async signIn(email: string, password: string): Promise<User> {
    try {
      const credential = await auth.signInWithEmailAndPassword(email, password);
      if (!credential.user) {
        throw new Error('Sign in failed - no user returned');
      }
      
      const userDoc = await firestore.collection('users').doc(credential.user.uid).get();
      if (!userDoc.exists) {
        throw new Error('User data not found');
      }
      
      return {
        id: credential.user.uid,
        email: credential.user.email || '',
        ...userDoc.data() as Omit<User, 'id' | 'email'>
      };
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  async signUp(email: string, password: string, userData: Partial<User>): Promise<User> {
    try {
      // Create the user in Firebase Auth
      const credential = await auth.createUserWithEmailAndPassword(email, password);
      if (!credential.user) {
        throw new Error('Sign up failed - no user created');
      }
      
      // Prepare user data for Firestore
      const newUser: Omit<User, 'id'> = {
        email,
        displayName: userData.displayName || '',
        role: userData.role || 'technician',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        ...userData
      };
      
      // Store user data in Firestore
      await firestore.collection('users').doc(credential.user.uid).set(newUser);
      
      // Return the complete user object
      return {
        id: credential.user.uid,
        ...newUser
      };
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }
}

export default new AuthService();