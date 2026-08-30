import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// NOTE: Firebase の Web 設定は秘匿情報ではなく、実質的な防御は firestore.rules 側で行う。
// （他のミニアプリと同様に、この値はコミットして良い）
const firebaseConfig = {
  apiKey: 'AIzaSyB-LUZY6t53yMenaZwHyqfTEyazbvq4oe0',
  authDomain: 'moya-hodoki.firebaseapp.com',
  projectId: 'moya-hodoki',
  storageBucket: 'moya-hodoki.firebasestorage.app',
  messagingSenderId: '202260351639',
  appId: '1:202260351639:web:e70c31a70c84326508f7d2',
};

export const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
