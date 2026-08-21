export const INVENTORY_OWNER = {
  branch: 'Los Angeles',
  branchKey: 'los-angeles',
  technicianId: '72485',
  email: '72485@myinventory.local',
}

export const normalizeBranchKey = (branch = '') => {
  return String(branch)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\bbranch\b/gi, ' ')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const normalizeTechnicianId = (technicianId = '') => {
  return String(technicianId).trim().replace(/\D/g, '')
}

export const buildInventoryLoginEmail = ({ branch, technicianId }) => {
  const branchKey = normalizeBranchKey(branch)
  const cleanTechnicianId = normalizeTechnicianId(technicianId)

  if (!branchKey || !cleanTechnicianId) return ''

  return `${cleanTechnicianId}@myinventory.local`
}

export const isInventoryOwnerIdentity = ({ branch, technicianId }) => {
  return (
    normalizeBranchKey(branch) === INVENTORY_OWNER.branchKey &&
    normalizeTechnicianId(technicianId) === INVENTORY_OWNER.technicianId
  )
}
