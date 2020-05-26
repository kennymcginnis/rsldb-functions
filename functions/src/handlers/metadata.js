const { db } = require('../util/admin')

const cleanMetadata = ({ children, description, name, order = 0, type, uid, url }) => {
  // note: this won't work for any falsy value
  return {
    ...(uid && { uid }),
    ...(type && { type }),
    ...(name && { name }),
    ...(description && { description }),
    order,
    ...(url && { url }),
    ...(children && { children }),
  }
}

const metadataFromDocumentSnapshot = doc => cleanMetadata({ uid: doc.id, ...doc.data() })

const fetchTimestamps = async (req, res) => {
  try {
    const types = ['metadata', 'champions']
    const [metadata, champions] = await Promise.all(
      types.map(type => db.doc(`/metadata/${type}`).get()),
    )
    return res.json({
      metadata: metadata.data().updated.toDate(),
      champions: champions.data().updated.toDate(),
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.code })
  }
}

const fetchMetadata = (req, res) => {
  return db
    .collection('metadata')
    .orderBy('type')
    .orderBy('order')
    .get()
    .then(data => res.json(data.docs.map(metadataFromDocumentSnapshot)))
    .catch(err => {
      console.error(err)
      res.status(500).json({ error: err.code })
    })
}

const createMetadata = (req, res) => {
  if (req.body.body.trim() === '') return res.status(400).json({ body: 'Body must not be empty' })
  const newMetadata = cleanMetadata({ ...req.body.body })
  return db
    .collection('metadata')
    .add(newMetadata)
    .then(doc => res.json({ uid: doc.id, ...newMetadata }))
    .catch(err => {
      console.error(err)
      return res.status(500).json({ error: 'Something went wrong' })
    })
}

const updateMetadata = async ({ body: { uid, ...updates } }, res) => {
  try {
    if (!uid) return res.status(400).json({ error: 'A uid is required' })
    updates = cleanMetadata(updates)

    const metadata = await db.doc(`/metadata/${uid}`).get()
    if (!metadata.exists)
      return res.status(404).json({ error: `No metadata found with the uid: ${uid}` })

    updates = { ...metadata.data(), ...updates }
    await metadata.ref.update(updates)

    return res.json({ uid, ...updates })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.code })
  }
}

Object.assign(exports, {
  createMetadata,
  fetchMetadata,
  fetchTimestamps,
  updateMetadata,
})
