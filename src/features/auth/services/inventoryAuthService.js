import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'

import { auth } from '../../../services/firebase/firebaseConfig.js'
import {
  buildInventoryLoginEmail,
  INVENTORY_OWNER,
  isInventoryOwnerIdentity,
} from '../utils/inventoryAuthIdentity.js'

const getSignInErrorMessage = (error) => {
  if (error?.code === 'auth/too-many-requests') {
    return 'Too many attempts. Wait a few minutes, then try again.'
  }

  if (error?.code === 'auth/network-request-failed') {
    return 'No connection. Connect to the internet for the first sign-in.'
  }

  return 'The branch, Tech ID, or password does not match.'
}

export const observeInventoryUser = (callback) => {
  return onAuthStateChanged(auth, callback)
}

export const signInToInventory = async ({
  branch,
  technicianId,
  password,
}) => {
  if (!isInventoryOwnerIdentity({ branch, technicianId })) {
    throw new Error('The branch, Tech ID, or password does not match.')
  }

  const email = buildInventoryLoginEmail({ branch, technicianId })

  try {
    await setPersistence(auth, browserLocalPersistence)
    const credential = await signInWithEmailAndPassword(auth, email, password)

    if (credential.user.email !== INVENTORY_OWNER.email) {
      await signOut(auth)
      throw new Error('This account is not allowed to open MyInventory.')
    }

    return credential.user
  } catch (error) {
    if (error instanceof Error && !error.code) throw error

    throw new Error(getSignInErrorMessage(error), { cause: error })
  }
}

export const signOutOfInventory = async () => {
  await signOut(auth)
}
