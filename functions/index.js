const functions = require('firebase-functions')
const app = require('express')()
const FBAuth = require('./src/handlers/auth')

const cors = require('cors')
app.use(cors())

const { signup, login } = require('./src/handlers/users')
const {
  fetchTimestamps,
  fetchMetadata,
  createMetadata,
  updateMetadata,
} = require('./src/handlers/metadata')
const {
  fetchChampion,
  fetchChampions,
  createChampion,
  updateMultipleChampions,
  updateOneChampion,
} = require('./src/handlers/champions')
const {
  fetchUsersChampions,
  pullChampions,
  updateUserChampions,
} = require('./src/handlers/users_champions')

// user routes
app.post('/signup', signup)
app.post('/login', login)

// logged in user's routes
// app.post('/user', FBAuth, updateUserDetails)
app.get('/users/champions', FBAuth, fetchUsersChampions)
app.get('/users/champions/:userId', fetchUsersChampions)
app.put('/users/champions/:action', FBAuth, updateUserChampions)
app.post('/users/champions/pull', FBAuth, pullChampions)

app.get('/timestamps', fetchTimestamps)

// any user routes
app.get('/user/champions/:userId', fetchUsersChampions)

app.get('/champion/:championId', fetchChampion)
app.get('/champions', fetchChampions)
app.post('/champion', FBAuth, createChampion)
app.put('/champion', FBAuth, updateOneChampion)
app.put('/champions', FBAuth, updateMultipleChampions)

app.get('/metadata', fetchMetadata)
app.post('/metadata', FBAuth, createMetadata)
app.put('/metadata', FBAuth, updateMetadata)

exports.api = functions.https.onRequest(app)

/*
const { db } = require('./src/util/admin')

exports.createNotificationOnLike = functions
  .region('europe-west1')
  .firestore.document('likes/{id}')
  .onCreate(snapshot => {
    return db
      .doc(`/champions/${snapshot.data().championId}`)
      .get()
      .then(doc => {
        if (doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: 'like',
            read: false,
            championId: doc.id,
          })
        }
      })
      .catch(err => console.error(err))
  })
exports.deleteNotificationOnUnLike = functions
  .region('europe-west1')
  .firestore.document('likes/{id}')
  .onDelete(snapshot => {
    return db
      .doc(`/notifications/${snapshot.id}`)
      .delete()
      .catch(err => {
        console.error(err)
      })
  })
exports.createNotificationOnComment = functions
  .region('europe-west1')
  .firestore.document('comments/{id}')
  .onCreate(snapshot => {
    return db
      .doc(`/champions/${snapshot.data().championId}`)
      .get()
      .then(doc => {
        if (doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: 'comment',
            read: false,
            championId: doc.id,
          })
        }
      })
      .catch(err => {
        console.error(err)
        return
      })
  })

exports.onUserImageChange = functions
  .region('europe-west1')
  .firestore.document('/users/{userId}')
  .onUpdate(change => {
    console.log(change.before.data())
    console.log(change.after.data())
    if (change.before.data().imageUrl !== change.after.data().imageUrl) {
      console.log('image has changed')
      const batch = db.batch()
      return db
        .collection('champions')
        .where('userHandle', '==', change.before.data().handle)
        .get()
        .then(data => {
          data.forEach(doc => {
            const champion = db.doc(`/champions/${doc.id}`)
            batch.update(champion, { userImage: change.after.data().imageUrl })
          })
          return batch.commit()
        })
    } else return true
  })

exports.onChampionDelete = functions
  .region('europe-west1')
  .firestore.document('/champions/{championId}')
  .onDelete((snapshot, context) => {
    const championId = context.params.championId
    const batch = db.batch()
    return db
      .collection('comments')
      .where('championId', '==', championId)
      .get()
      .then(data => {
        data.forEach(doc => {
          batch.delete(db.doc(`/comments/${doc.id}`))
        })
        return db.collection('likes').where('championId', '==', championId).get()
      })
      .then(data => {
        data.forEach(doc => {
          batch.delete(db.doc(`/likes/${doc.id}`))
        })
        return db.collection('notifications').where('championId', '==', championId).get()
      })
      .then(data => {
        data.forEach(doc => {
          batch.delete(db.doc(`/notifications/${doc.id}`))
        })
        return batch.commit()
      })
      .catch(err => console.error(err))
  })
*/
