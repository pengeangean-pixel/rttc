# RTTC Attendance Firestore Realtime Fix

ខ្ញុំបានកែឱ្យ app ប្រើ Firestore ជា database សម្រាប់៖

- `students` collection
- `attendance` collection
- realtime sync ដោយ `onSnapshot()`
- save/update attendance ដោយ `setDoc()`
- bulk import និង set all present ដោយ `writeBatch()`
- delete student ដោយ `deleteDoc()`

## Render Environment Variables ត្រូវដាក់

នៅ Render > Service > Environment ត្រូវបញ្ចូល៖

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

យកតម្លៃទាំងនេះពី Firebase Console > Project settings > Your apps > Web app config.

## Firestore Rules សម្រាប់ test ដំបូង

ប្រើ rules នេះសិនសម្រាប់ test។ ក្រោយពេលប្រព័ន្ធដំណើរការ ត្រូវកែទៅ rules ដែលមាន authentication។

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /students/{docId} {
      allow read, write: if true;
    }
    match /attendance/{docId} {
      allow read, write: if true;
    }
  }
}
```

## Build command នៅ Render

```bash
npm install && npm run build
```

## Start command

```bash
npm start
```

## កំណត់សម្គាល់សំខាន់

App មិនគួរប្រើ fake default attendance ទៀតទេ។ បើគ្មាន record ក្នុង Firestore សិស្សនោះនឹងបង្ហាញជា absent/no permission រហូតដល់ admin ឬ QR check-in កត់ត្រា។
