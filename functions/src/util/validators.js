// eslint-disable-next-line no-useless-escape
const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

const nonEmptyArray = array => Array.isArray(array) && array.length > 0

const chunk = (arr, chunkSize) => {
  const r = []
  let i = 0,
    len = arr.length
  for (; i < len; i += chunkSize) r.push(arr.slice(i, i + chunkSize))
  return r
}

const isEmail = email => email.match(regEx)

const isEmpty = string => string.trim() === ''

const validateSignupData = data => {
  let errors = {}

  if (isEmpty(data.email)) {
    errors.email = 'Must not be empty'
  } else if (!isEmail(data.email)) {
    errors.email = 'Must be a valid email address'
  }

  if (isEmpty(data.password)) errors.password = 'Must not be empty'
  if (data.password !== data.confirmPassword) errors.confirmPassword = 'Passwords must match'
  if (isEmpty(data.handle)) errors.handle = 'Must not be empty'

  return {
    errors,
    valid: Object.keys(errors).length === 0,
  }
}

const validateLoginData = data => {
  let errors = {}

  if (isEmpty(data.email)) errors.email = 'Must not be empty'
  if (isEmpty(data.password)) errors.password = 'Must not be empty'

  return {
    errors,
    valid: Object.keys(errors).length === 0,
  }
}

const reduceUserDetails = data => {
  let userDetails = {}

  if (!isEmpty(data.bio.trim())) userDetails.bio = data.bio
  if (!isEmpty(data.website.trim())) {
    userDetails.website =
      data.website.trim().substring(0, 4) !== 'http'
        ? `http://${data.website.trim()}`
        : data.website
  }
  if (!isEmpty(data.location.trim())) userDetails.location = data.location

  return userDetails
}

Object.assign(exports, {
  chunk,
  nonEmptyArray,
  reduceUserDetails,
  validateLoginData,
  validateSignupData,
})
