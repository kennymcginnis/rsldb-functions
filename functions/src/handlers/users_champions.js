const { nonEmptyArray } = require('../util/validators')
const { db } = require('../util/admin')
const { championMap, championNameMap } = require('../data/champions')
const { defaultRanks } = require('../data/metadata')

const cleanUserChampion = ({ user, champion, rank, ascension, ratings, uid }) => {
  // note: this won't work for any falsy value
  return {
    ...(uid && { uid }),
    user,
    champion,
    ...(rank && { rank }),
    ...(ascension && { ascension }),
    ...(ratings && { ratings }),
  }
}

const userChampionFromDocumentSnapshot = doc =>
  doc.exists && cleanUserChampion({ uid: doc.id, ...doc.data() })

const findByUser = user =>
  db
    .collection('users_champions')
    .where('user', '==', user)
    .get()
    .then(data => data.docs.map(userChampionFromDocumentSnapshot))

const fetchUsersChampions = async ({ params: { userId }, user }, res) => {
  try {
    const me = user && user.uid // authentication not always required
    if (!userId && !me)
      return res.status(400).json({ error: 'You must be logged in, or a user id is required' })
    // console.dir({ uid: userId || me }, { depth: 2, colors: true })
    const usersChampions = await findByUser(userId || me)
    return res.json(usersChampions)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.code })
  }
}

const defaultUserChampion = (user, champion, rarity) => ({
  user,
  champion,
  rank: defaultRanks[rarity],
  ascension: 0,
})

const pullChampions = async (
  { body: { champion_ids, champion_names }, user: { uid: userId } },
  res,
) => {
  try {
    if (!nonEmptyArray(champion_ids) && !nonEmptyArray(champion_names))
      return res.status(400).json({ error: 'At least one champion id or name is required' })

    const output = {}
    const champions = champion_ids || champion_names
    await Promise.all(
      champions.map(champion => {
        const dbChampion = championMap[champion] || championNameMap[champion]
        console.dir({ dbChampion }, { depth: 2, colors: true })
        if (/* found */ dbChampion) {
          const userChampion = defaultUserChampion(
            userId,
            dbChampion.uid,
            dbChampion.attributes.rarity,
          )
          console.dir({ userChampion }, { depth: 2, colors: true })
          return db
            .collection('users_champions')
            .add(userChampion)
            .then(() => (output[dbChampion.name] = 'added'))
            .catch(err => (output[dbChampion.name] = err))
        } /* not found */ else {
          output[champion] = 'Champion not found'
          return Promise.resolve()
        }
      }),
    )
    return res.json(output)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.code })
  }
}

const updateUserChampions = async (
  { params: { action }, body: { uids }, user: { uid: userId } },
  res,
) => {
  try {
    if (!['pull', 'feed', 'ascend'].includes(action))
      return res.status(400).json({ user_champion: `Unknown action: ${action}` })

    if (!nonEmptyArray(uids))
      return res.status(400).json({ error: 'At least one user_champion uid is required' })

    const output = {}
    await Promise.all(
      uids.map(uid =>
        db
          .doc(`/users_champions/${uid}`)
          .get()
          .then(userChampion => {
            if (!userChampion.exists) throw 'uid not found in database'
            switch (action) {
              case 'feed':
                return userChampion.ref.delete()
              case 'ascend': {
                let { ascension } = userChampion.data()
                return userChampion.ref.update({ ascension: ++ascension || 1 })
              }
              case 'rank': {
                let { rank } = userChampion.data()
                return userChampion.ref.update({ rank: ++rank })
              }
              default:
                throw `Unknown action: ${action}`
            }
          })
          .then(() => (output.uid = 'success'))
          .catch(err => (output.uid = err)),
      ),
    )
    return res.json(output)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.code })
  }
}

Object.assign(exports, {
  fetchUsersChampions,
  pullChampions,
  updateUserChampions,
})
