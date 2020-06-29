const { admin, db } = require('../util/admin')

module.exports = (req, res, next) => {
  // console.dir(req.headers.authorization, { depth: 2, colors: true })
  let idToken
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    idToken = req.headers.authorization.split('Bearer ')[1]
  } else {
    console.error('No token found')
    return res.status(403).json({ error: 'Unauthorized' })
  }

  return admin
    .auth()
    .verifyIdToken(idToken)
    .then(decodedToken => {
      req.user = decodedToken
      return db.doc(`/users/${req.user.uid}`).get()
    })
    .then(data => {
      const dbUser = data.data()
      req.user.handle = dbUser.handle
      req.user.imageUrl = dbUser.imageUrl
      // console.dir({ 'req.user': req.user }, { depth: 2, colors: true })
      return next()
    })
    .catch(err => {
      console.error('Error while verifying token ', err)
      return res.status(403).json(err)
    })
}
