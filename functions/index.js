import admin from 'firebase-admin'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { onSchedule } from 'firebase-functions/v2/scheduler'

admin.initializeApp()

const db = admin.firestore()

const prefByActivity = {
  status_started: 'notifyStatusStarted',
  status_completed: 'notifyStatusCompleted',
  comment_added: 'notifyCommentAdded',
  reading_plan_created: 'notifyPlanChanges',
  reading_plan_updated: 'notifyPlanChanges',
  book_started: 'notifyBookStarted',
}

function formatActivityDate(value) {
  if (!value) return 'bugün'
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const date = new Date(`${value}T00:00:00`)
  const diff = Math.round((date.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'bugün'
  if (diff === -1) return 'dün'
  if (diff === 1) return 'yarın'
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' }).format(date)
}

function notificationBody(activity) {
  if (activity.text) return activity.text
  const actor = activity.actor === 'berfin' ? 'Berfin' : 'Faruk'
  const when = formatActivityDate(activity.activityDate)
  if (activity.type === 'status_started') return `${actor} Bölüm ${activity.chapterId}'i ${when} okumaya başladı.`
  if (activity.type === 'status_completed') return `${actor} Bölüm ${activity.chapterId}'i ${when} tamamladı.`
  if (activity.type === 'comment_added') return `${actor} Bölüm ${activity.chapterId} için not bıraktı.`
  if (activity.type === 'book_started') return `${actor} yeni kitap ekledi.`
  return `${actor} okuma planını güncelledi.`
}

async function memberProfilesExcept(actorUid) {
  const snapshot = await db.collection('users').where('isMember', '==', true).get()
  return snapshot.docs
    .filter((doc) => doc.id !== actorUid)
    .map((doc) => ({ uid: doc.id, ...doc.data() }))
}

async function sendToProfile(profile, payload, prefKey) {
  const prefs = profile.notificationPrefs ?? {}
  if (prefKey && prefs[prefKey] === false) return

  const devices = await db.collection('users').doc(profile.uid).collection('devices').get()
  const tokens = devices.docs.map((doc) => doc.data().token).filter(Boolean)
  if (!tokens.length) return

  const response = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: payload.notification,
    data: payload.data,
    webpush: {
      fcmOptions: {
        link: payload.data?.link ?? '/',
      },
    },
  })

  await Promise.all(
    response.responses.map((result, index) => {
      if (result.success) return null
      const code = result.error?.code ?? ''
      if (!code.includes('registration-token-not-registered') && !code.includes('invalid-registration-token')) return null
      return devices.docs[index].ref.delete()
    }),
  )
}

export const notifyOnActivity = onDocumentCreated('activities/{activityId}', async (event) => {
  const activity = event.data?.data()
  if (!activity?.actorUid) return

  const prefKey = prefByActivity[activity.type]
  const recipients = await memberProfilesExcept(activity.actorUid)
  const payload = {
    notification: {
      title: 'Paralel Okuma',
      body: notificationBody(activity),
    },
    data: {
      activityId: event.params.activityId,
      bookId: activity.bookId ?? '',
      chapterId: String(activity.chapterId ?? ''),
      type: activity.type ?? '',
      link: `/${activity.actor === 'faruk' ? 'berfin' : 'faruk'}#activity`,
    },
  }

  await Promise.all(recipients.map((profile) => sendToProfile(profile, payload, prefKey)))
})

export const sendPlanReminders = onSchedule('every day 08:00', async () => {
  const today = new Date().toISOString().slice(0, 10)
  const books = await db.collection('books').get()

  for (const book of books.docs) {
    const plans = await book.ref
      .collection('plans')
      .where('plannedDate', '==', today)
      .get()

    for (const planDoc of plans.docs) {
      const plan = planDoc.data()
      if (plan.cancelledAt) continue
      const members = await db.collection('users').where('isMember', '==', true).get()
      const recipients = members.docs
        .map((doc) => ({ uid: doc.id, ...doc.data() }))
        .filter((profile) => plan.type === 'shared' || profile.uid === plan.createdByUid)

      await Promise.all(recipients.map((profile) => sendToProfile(profile, {
        notification: {
          title: 'Bugünkü okuma planı',
          body: `${plan.chapterId}. bölüm bugün planında.`,
        },
        data: {
          bookId: book.id,
          planId: planDoc.id,
          chapterId: String(plan.chapterId),
          type: 'reading_plan_reminder',
          link: `/${profile.profileId}#book`,
        },
      }, 'notifyPlanChanges')))
    }
  }
})
