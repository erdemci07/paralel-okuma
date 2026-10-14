import { getApps, initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .map((arg, index, all) => {
      if (!arg.startsWith('--')) return []
      const [key, inlineValue] = arg.slice(2).split('=')
      return [key, inlineValue ?? all[index + 1]]
    })
    .filter((entry) => entry.length === 2),
)

const farukUid = args.farukUid
const berfinUid = args.berfinUid
const projectId = args.projectId

if (!projectId || !farukUid || !berfinUid) {
  console.error('Usage: npm run bind-users -- --projectId="YOUR_FIREBASE_PROJECT_ID" --farukUid="REAL_FARUK_UID" --berfinUid="REAL_BERFIN_UID"')
  process.exit(1)
}

if (farukUid === berfinUid) {
  console.error('Faruk and Berfin must have different Firebase Auth UIDs.')
  process.exit(1)
}

const profiles = [
  { uid: farukUid, profileId: 'faruk', displayName: 'Faruk' },
  { uid: berfinUid, profileId: 'berfin', displayName: 'Berfin' },
]

const app = getApps()[0] ?? initializeApp({ projectId })
const db = getFirestore(app)

try {
  for (const profile of profiles) {
    await db.collection('users').doc(profile.uid).set(
      {
        profileId: profile.profileId.toLowerCase(),
        displayName: profile.displayName,
        isMember: true,
        notificationPrefs: {
          notifyStatusStarted: true,
          notifyStatusCompleted: true,
          notifyCommentAdded: true,
          notifyPlanChanges: true,
          notifyBookStarted: true,
          notifyRating: false,
        },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )

    console.log(`Bound users/${profile.uid} -> ${profile.profileId.toLowerCase()} (${profile.displayName})`)
  }

  console.log(`Bound Firebase Auth UIDs to Paralel Okuma member profiles in project ${projectId}.`)
} catch (error) {
  console.error(`Could not write member profile documents in project ${projectId}.`)
  console.error('Run "gcloud auth application-default login" once, then run this command again.')
  throw error
}
