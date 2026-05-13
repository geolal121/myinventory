export const DEFAULT_INVENTORY_LOCATIONS = [
  'Box 1',
  'Box 2',
  'Box 3',
  'Box 4',
  'Box 5',
  'Box 6',
  'Box 7',
  'Box 8',
  'Box 9',
  'Box 10',
  'Box 11',
  'Box 12',
  'Slide Box',
]

export const getLocationOptions = (savedLocations = []) => {
  const mergedLocations = [
    ...DEFAULT_INVENTORY_LOCATIONS,
    ...savedLocations,
  ]

  const uniqueLocations = [...new Set(mergedLocations)]

  return uniqueLocations.map((location) => ({
    label: location,
    value: location,
  }))
}