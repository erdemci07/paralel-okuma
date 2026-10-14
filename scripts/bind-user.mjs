import { getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
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

const email = args.email?.toLowerCase()
const userId = args.user?.toLowerCase()
const projectId = args.projectId

if (!projectId || !email || !['faruk', 'berfin'].includes(userId)) {
  console.error('Usage: npm run bind:user -- --projectId="YOUR_FIREBASE_PROJECT_ID" --email faruk@example.com --user faruk')
  process.exit(1)
}

const app = getApps()[0] ?? initializeApp({ projectId })
const authUser = await getAuth(app).getUserByEmail(email)
const isFaruk = userId === 'faruk'
const profile = {
  profileId: userId,
  displayName: isFaruk ? 'Faruk' : 'Berfin',
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
}

await getFirestore(app).collection('users').doc(authUser.uid).set(
  {
    ...profile,
    createdAt: FieldValue.serverTimestamp(),
  },
  { merge: true },
)

console.log(`Bound ${email} (${authUser.uid}) to profile ${userId} in project ${projectId}.`)
