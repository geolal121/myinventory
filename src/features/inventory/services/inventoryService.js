import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'

import { database } from '../../../services/firebase/firebaseConfig.js'

const INVENTORY_COLLECTION = 'inventoryItems'
const HISTORY_COLLECTION = 'inventoryHistory'
const LOCATIONS_COLLECTION = 'savedLocations'

export const getInventoryItemsFromFirebase = async () => {
  const snapshot = await getDocs(collection(database, INVENTORY_COLLECTION))

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }))
}

export const saveInventoryItemToFirebase = async (item) => {
  const itemRef = doc(database, INVENTORY_COLLECTION, item.id)

  await setDoc(itemRef, {
    ...item,
    updatedAt: serverTimestamp(),
  })
}

export const deleteInventoryItemFromFirebase = async (itemId) => {
  const itemRef = doc(database, INVENTORY_COLLECTION, itemId)

  await deleteDoc(itemRef)
}

export const getInventoryHistoryFromFirebase = async () => {
  const historyQuery = query(
    collection(database, HISTORY_COLLECTION),
    orderBy('createdAt', 'desc'),
  )

  const snapshot = await getDocs(historyQuery)

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }))
}

export const saveInventoryHistoryToFirebase = async (historyRecord) => {
  const historyRef = doc(database, HISTORY_COLLECTION, historyRecord.id)

  await setDoc(historyRef, {
    ...historyRecord,
    synced: true,
    syncedAt: serverTimestamp(),
  })
}

export const getSavedLocationsFromFirebase = async () => {
  const snapshot = await getDocs(collection(database, LOCATIONS_COLLECTION))

  return snapshot.docs.map((document) => document.data().name).filter(Boolean)
}

export const saveLocationToFirebase = async (location) => {
  if (!location) return

  const locationRef = doc(database, LOCATIONS_COLLECTION, location)

  await setDoc(locationRef, {
    name: location,
    updatedAt: serverTimestamp(),
  })
}