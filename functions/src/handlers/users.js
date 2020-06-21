const { admin, db } = require('../util/admin')

const config = require('../util/config')
const { uuid } = require('uuidv4')

const firebase = require('firebase')
firebase.initializeApp(config)

const { championFromDocumentSnapshot } = require('./champions')
const { validateSignupData, validateLoginData, reduceUserDetails } = require('../util/validators')

const baseImageUrl = `https://firebasestorage.googleapis.com/v0/b/rsl-db.appspot.com/o`

const notificationFromDocumentSnapshot = doc => ({
  notificationId: doc.id,
  championId: doc.data().championId,
  createdAt: doc.data().createdAt,
  read: doc.data().read,
  recipient: doc.data().recipient,
  sender: doc.data().sender,
  type: doc.data().type,
})

const signup = async (req, res) => {
  try {
    const newUser = {
      email: req.body.email,
      password: req.body.password,
      confirmPassword: req.body.confirmPassword,
      handle: req.body.handle,
    }

    const { valid, errors } = validateSignupData(newUser)
    if (!valid) return res.status(400).json(errors)

    const existingHandle = await db
      .collection('users')
      .where('handle', '==', req.user.uid)
      .limit(1)
      .get()
    if (existingHandle.exists) return res.status(400).json({ handle: 'Handle already in use' })

    const { user } = await firebase
      .auth()
      .createUserWithEmailAndPassword(newUser.email, newUser.password)

    const userCredentials = {
      uid: user.uid,
      handle: newUser.handle,
      email: newUser.email,
      createdAt: new Date().toISOString(),
      // TODO Append token to imageUrl. Work around just add token from image in storage.
      imageUrl: `${baseImageUrl}/no-img.png?alt=media`,
    }

    const token = await user.getIdToken()
    await db.doc(`/users/${user.uid}`).set(userCredentials)
    return res.status(201).json({ token })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.code })
  }
}

const login = (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password,
  }
  const { valid, errors } = validateLoginData(user)
  if (!valid) return res.status(400).json(errors)

  return firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then(data => data.user.getIdToken())
    .then(token => res.json({ token }))
    .catch(err => {
      console.error(err)
      // auth/wrong-password
      // auth/user-not-user
      return res.status(403).json({ general: 'Wrong credentials, please try again' })
    })
}

const updateUserDetails = (req, res) => {
  let userDetails = reduceUserDetails(req.body)

  return db
    .doc(`/users/${req.user.handle}`)
    .update(userDetails)
    .then(() => res.json({ message: 'Details added successfully' }))
    .catch(err => {
      console.error(err)
      return res.status(500).json({ error: err.code })
    })
}

const getUserDetails = async (req, res) => {
  try {
    let userData = {}
    const user = await db.doc(`/users/${req.params.handle}`).get()
    if (!user.exists) return res.status(400).json({ user: 'User not found' })
    userData.user = user.data()

    const champions = await db
      .collection('champions')
      .where('userHandle', '==', req.params.handle)
      .orderBy('createdAt', 'desc')
      .get()
    userData.champions = champions.docs.map(doc => championFromDocumentSnapshot(doc.data()))

    return res.json(userData)
  } catch (err) {
    return res.status(500).json({ error: err.code })
  }
}

// Get own user details
const getAuthenticatedUser = async (req, res) => {
  try {
    let userData = {}
    const user = await db.doc(`/users/${req.user.handle}`).get()
    if (!user.exists) return res.status(400).json({ user: 'User not found' })
    userData.credentials = user.data()

    const likes = await db.collection('likes').where('userHandle', '==', req.user.handle).get()
    userData.likes = likes.docs.map(doc => doc.data())

    const notifications = db
      .collection('notifications')
      .where('recipient', '==', req.user.handle)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get()
    userData.notifications = notifications.docs.map(notificationFromDocumentSnapshot)

    return res.json(userData)
  } catch (err) {
    return res.status(500).json({ error: err.code })
  }
}

const uploadImage = (req, res) => {
  const BusBoy = require('busboy')
  const path = require('path')
  const os = require('os')
  const fs = require('fs')
  const busboy = new BusBoy({ headers: req.headers })

  let imageToBeUploaded = {}
  let imageFileName
  // String for image token
  let generatedToken = uuid()

  busboy.on('file', (_, file, filename, __, mimetype) => {
    // console.log(fieldname, file, filename, encoding, mimetype)
    if (mimetype !== 'image/jpeg' && mimetype !== 'image/png') {
      return res.status(400).json({ error: 'Wrong file type submitted' })
    }
    // my.image.png => ['my', 'image', 'png']
    const imageExtension = filename.split('.')[filename.split('.').length - 1]
    // 32756238461724837.png
    imageFileName = `${Math.round(Math.random() * 1000000000000).toString()}.${imageExtension}`
    const filepath = path.join(os.tmpdir(), imageFileName)
    imageToBeUploaded = { filepath, mimetype }
    file.pipe(fs.createWriteStream(filepath))
  })
  busboy.on('finish', () => {
    admin
      .storage()
      .bucket()
      .upload(imageToBeUploaded.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype,
            //Generate token to be appended to imageUrl
            firebaseStorageDownloadTokens: generatedToken,
          },
        },
      })
      .then(() => {
        // Append token to url
        const imageUrl = `${baseImageUrl}/${imageFileName}?alt=media&token=${generatedToken}`
        return db.doc(`/users/${req.user.handle}`).update({ imageUrl })
      })
      .then(() => {
        return res.json({ message: 'image uploaded successfully' })
      })
      .catch(err => {
        console.error(err)
        return res.status(500).json({ error: 'something went wrong' })
      })
  })
  busboy.end(req.rawBody)
}

const markNotificationsRead = (req, res) => {
  const batch = db.batch()
  req.body.forEach(notificationId => {
    const notification = db.doc(`/notifications/${notificationId}`)
    batch.update(notification, { read: true })
  })
  batch
    .commit()
    .then(() => {
      return res.json({ message: 'Notifications marked read' })
    })
    .catch(err => {
      console.error(err)
      return res.status(500).json({ error: err.code })
    })
}

Object.assign(exports, {
  getAuthenticatedUser,
  getUserDetails,
  login,
  markNotificationsRead,
  signup,
  updateUserDetails,
  uploadImage,
})
