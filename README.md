# Paralel Okuma

Mobile-first shared reading tracker for Faruk and Berfin.

## What Is Wired

- React + TypeScript + Vite app shell
- Firebase Auth with Email/Password sign-in
- UID-bound member profiles for exactly `faruk` and `berfin`
- Firestore realtime reads for the current book, chapters, progress, plans, comments, and recent activity
- Batched Firestore writes for status changes, comments, plans, and activity events
- Google Books search and metadata snapshotting
- Firebase Cloud Messaging client token registration
- Cloud Functions scaffolding for cross-user push and scheduled plan reminders
- Firebase Hosting rewrite for `/faruk`, `/berfin`, and nested route refreshes

If Firebase env values are missing, the app shows demo data and a developer notice instead of a blank screen.

## Local Development

```bash
npm install
copy .env.example .env
npm run dev
```

Fill `.env` with values from Firebase Console:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_VAPID_KEY=
```

`.env` is ignored by git.

## Firebase Console Checklist

1. Create or open a Firebase project.
2. Go to Project settings, General, Your apps, then create a Web app.
3. Copy these web config values into `.env`:
   - `apiKey` -> `VITE_FIREBASE_API_KEY`
   - `authDomain` -> `VITE_FIREBASE_AUTH_DOMAIN`
   - `projectId` -> `VITE_FIREBASE_PROJECT_ID`
   - `storageBucket` -> `VITE_FIREBASE_STORAGE_BUCKET`
   - `messagingSenderId` -> `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `appId` -> `VITE_FIREBASE_APP_ID`
4. Go to Authentication, Sign-in method, enable Email/Password.
5. Go to Authentication, Users, add exactly two users: one for Faruk and one for Berfin.
6. Go to Firestore Database, create a database.
7. Go to Cloud Messaging, Web Push certificates, generate a key pair.
8. Copy the Web Push certificate key into `VITE_FIREBASE_VAPID_KEY`.
9. Optional for server push: upgrade the Firebase project to Blaze, because Cloud Functions and scheduled reminders may require billing.

You must do these console steps yourself because this workspace cannot access your Firebase Console or create Auth users for you.

## One-Time Data Setup

Authenticate the Firebase CLI and select/link the project:

```bash
npx firebase login
npx firebase use --add
```

Seed the default book and chapters. This does not overwrite progress, comments, or plans:

```bash
npm run seed
```

Bind the two Firebase Auth users to logical app members after creating them in Authentication. Copy the real `User UID` values from Firebase Console, Authentication, Users:

```bash
npm run bind-users -- --projectId="paralel-okuma" --farukUid="REAL_FARUK_UID" --berfinUid="REAL_BERFIN_UID"
```

The bind command creates/updates only these profile membership documents:

```text
users/{farukUid}
{
  profileId: "faruk",
  displayName: "Faruk",
  isMember: true
}

users/{berfinUid}
{
  profileId: "berfin",
  displayName: "Berfin",
  isMember: true
}

users/{uid}/devices/{deviceId}     created later when push is enabled from the app
```

The older single-user helper also writes the same profile shape if you prefer binding by Auth email:

```bash
npm run bind:user -- --projectId="paralel-okuma" --email faruk@example.com --user faruk
npm run bind:user -- --projectId="paralel-okuma" --email berfin@example.com --user berfin
```

The seed/app flows create:

```text
books/{bookId}
books/{bookId}/chapters/{chapterId}
books/{bookId}/progress/{uid}_{chapterId}
books/{bookId}/comments/{commentId}
books/{bookId}/plans/{planId}
activities/{activityId}
```

## Deploy

Deploy Firestore rules and indexes:

```bash
npx firebase deploy --only firestore:rules,firestore:indexes
```

Build and deploy Hosting:

```bash
npm run build
npx firebase deploy --only hosting
```

Deploy Functions after enabling billing if required:

```bash
cd functions
npm install
cd ..
npx firebase deploy --only functions
```

Deploy everything:

```bash
npm run build
npx firebase deploy
```

## Verification

Before deployment:

```bash
npm run lint
npm run build
```

Manual checks:

- `/faruk` only allows the UID bound to `faruk` to edit Faruk progress.
- `/berfin` only allows the UID bound to `berfin` to edit Berfin progress.
- Refresh keeps the Auth session.
- Historical activity dates appear as the selected date, while server timestamps remain the real creation time.
- Status changes create activity records.
- Plans and comments appear through realtime listeners.
- Recent activity is bounded.
- Google Books search returns cover, title, and author.
- Missing Firebase config, denied notification permission, and unsupported browsers do not block the app.
- Firebase Hosting refreshes direct routes through `index.html`.
