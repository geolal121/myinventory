export const INVENTORY_ACTIONS = {
  ADD: 'ADD',
  USE: 'USE',
  GIVE: 'GIVE',
  MOVE: 'MOVE',
  DELETE: 'DELETE',
}

export const INVENTORY_ACTION_OPTIONS = [
  {
    label: 'Add Part',
    value: INVENTORY_ACTIONS.ADD,
  },

  {
    label: 'Use Part',
    value: INVENTORY_ACTIONS.USE,
  },

  {
    label: 'Give Part',
    value: INVENTORY_ACTIONS.GIVE,
  },

  {
    label: 'Move Part',
    value: INVENTORY_ACTIONS.MOVE,
  },

  {
    label: 'Delete Part',
    value: INVENTORY_ACTIONS.DELETE,
  },
]