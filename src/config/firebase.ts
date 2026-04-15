import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import { initializeFirestoreDB } from '../hooks/useFirestoreTodos';

// Firebase 설정
// 실제 프로젝트에서는 환경 변수로 관리
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'your-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'your-project.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'your-project-id',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'your-project.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789:web:abcdef',
};

// Firebase 앱 인스턴스
let app: FirebaseApp | null = null;
let auth: Auth | null = null;

/**
 * Firebase 초기화
 * 앱 시작 시 한 번만 호출
 */
export function initializeFirebase(): FirebaseApp {
  if (!app) {
    app = initializeApp(firebaseConfig);

    // Auth 초기화
    auth = getAuth(app);

    // Firestore 초기화 (오프라인 지속성 포함)
    initializeFirestoreDB(app);

    // 개발 환경에서 에뮬레이터 사용 (선택사항)
    if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATOR === 'true') {
      connectAuthEmulator(auth, 'http://localhost:9099');
      console.log('Firebase Auth Emulator connected');
    }

    console.log('Firebase initialized successfully');
  }

  return app;
}

/**
 * Firebase Auth 인스턴스 getter
 */
export function getFirebaseAuth(): Auth {
  if (!auth) {
    throw new Error('Firebase not initialized. Call initializeFirebase first.');
  }
  return auth;
}

/**
 * Firebase App 인스턴스 getter
 */
export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    throw new Error('Firebase not initialized. Call initializeFirebase first.');
  }
  return app;
}

/**
 * Firebase가 초기화되었는지 확인
 */
export function isFirebaseInitialized(): boolean {
  return app !== null;
}
