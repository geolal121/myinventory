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
const REMOVED_LOCATIONS_COLLECTION = 'removedLocations'
const ARCHIVED_LOCATIONS_COLLECTION = 'archivedLocations'

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

export const deleteLocationFromFirebase = async (location) => {
  if (!location) return

  const locationRef = doc(database, LOCATIONS_COLLECTION, location)

  await deleteDoc(locationRef)
}

export const getRemovedLocationsFromFirebase = async () => {
  const snapshot = await getDocs(
    collection(database, REMOVED_LOCATIONS_COLLECTION),
  )

  return snapshot.docs.map((document) => document.data().name).filter(Boolean)
}

export const saveRemovedLocationToFirebase = async (location) => {
  if (!location) return

  const locationRef = doc(database, REMOVED_LOCATIONS_COLLECTION, location)

  await setDoc(locationRef, {
    name: location,
    updatedAt: serverTimestamp(),
  })
}

export const deleteRemovedLocationFromFirebase = async (location) => {
  if (!location) return

  const locationRef = doc(database, REMOVED_LOCATIONS_COLLECTION, location)

  await deleteDoc(locationRef)
}

export const getArchivedLocationsFromFirebase = async () => {
  const snapshot = await getDocs(
    collection(database, ARCHIVED_LOCATIONS_COLLECTION),
  )

  return snapshot.docs
    .map((document) => document.data())
    .filter((archive) => archive.name)
    .map((archive) => ({
      location: archive.name,
      items: Array.isArray(archive.items) ? archive.items : [],
      deletedAt: archive.deletedAt || '',
    }))
}

export const saveArchivedLocationToFirebase = async ({
  location,
  items = [],
  deletedAt = '',
}) => {
  if (!location) return

  const archiveRef = doc(database, ARCHIVED_LOCATIONS_COLLECTION, location)

  await setDoc(archiveRef, {
    name: location,
    items,
    deletedAt,
    updatedAt: serverTimestamp(),
  })
}

export const deleteArchivedLocationFromFirebase = async (location) => {
  if (!location) return

  const archiveRef = doc(database, ARCHIVED_LOCATIONS_COLLECTION, location)

  await deleteDoc(archiveRef)
}
