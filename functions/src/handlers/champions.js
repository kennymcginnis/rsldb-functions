const { db } = require('../util/admin')

const cleanChampion = ({ attributes, avatar, image, name, order, uid }) => {
  return {
    ...(uid && { uid }),
    ...(name && { name }),
    ...(image && { image }),
    ...(avatar && { avatar }),
    ...(order && { order }),
    ...(attributes && { attributes }),
  }
}

const championFromDocumentSnapshot = doc =>
  doc.exists && cleanChampion({ uid: doc.id, ...doc.data() })

const getChampion = uid => db.doc(`/champions/${uid}`).get().then(championFromDocumentSnapshot)

const findByName = name =>
  db
    .collection('champions')
    .where('name', '==', name)
    .get()
    .then(data => data.docs.map(championFromDocumentSnapshot))

const findByNameIn = names =>
  db
    .collection('champions')
    .where('name', 'in', names)
    .get()
    .then(data => data.docs.map(championFromDocumentSnapshot))

const getChampions = () =>
  db
    .collection('champions')
    .get()
    .then(data => data.docs.map(championFromDocumentSnapshot))

const fetchChampion = (req, res) => {
  try {
    return res.json(getChampion(req.body.uid))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.code })
  }
}

const createMapByKey = (array, key) => array.reduce((agg, obj) => ((agg[obj[key]] = obj), agg), {})

const fetchChampions = async (req, res) => {
  try {
    const championData = await getChampions()
    return res.json(
      championData,
      // championMap: createMapByKey(championData, 'uid'),
      // championNameMap: createMapByKey(championData, 'name'),
    )
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.code })
  }
}

const createChampion = async ({ body }, res) => {
  try {
    if (!body) return res.status(400).json({ body: 'Post body must not be empty' })
    // TODO any other required fields?

    const newChampion = cleanChampion(body)
    const { id: uid } = await db.collection('champions').add(newChampion)

    return res.json({ uid, ...newChampion })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.code })
  }
}

const updateChampion = async ({ body: { uid, ...updates } }, res) => {
  try {
    if (!uid) return res.status(400).json({ uid: 'A champion uid is required' })
    if (!updates) return res.status(400).json({ body: 'Put body must not be empty' })

    const champion = await db.doc(`/champions/${uid}`).get()
    if (!champion.exists)
      return res.status(404).json({ error: `No champion found with the uid: ${uid}` })

    const cleaned = cleanChampion(updates)
    await champion.ref.update(cleaned)
    return res.json({ uid, ...champion.data(), ...cleaned })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.code })
  }
}

Object.assign(exports, {
  createChampion,
  fetchChampion,
  fetchChampions,
  findByName,
  findByNameIn,
  getChampion,
  getChampions,
  updateChampion,
})
