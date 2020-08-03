// The admin SDK runs your code with administrative permissions, if you can use the regular (non-admin) Firebase module, you're running as a regular Firebase client and don't have some expanded capabilities.
export const admin = (require('firebase-admin')).initializeApp();

// noo sql database
import { firestore } from 'firebase-admin';

// bucket for storing files like profile pictures
import { storage  } from 'firebase-admin';

export const db = firestore();
export const fbStorage = storage();