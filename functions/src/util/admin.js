const admin = require('firebase-admin')
const config = require('../util/config')
const serviceAccount = require('../../service-account.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://rsl-db.firebaseio.com',
})

const db = admin.firestore()

module.exports = { admin, db }
