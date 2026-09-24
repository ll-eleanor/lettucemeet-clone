export type Role = 'exec' | 'jit'
export type RoleFilter = 'both' | Role

export interface AvailabilityRange {
  startSlot: number
  endSlot: number
}

export interface Participant {
  id: string
  name: string
  role: Role
  sortOrder: number
  ranges: AvailabilityRange[]
}

export interface ParticipantInput {
  name: string
  role: Role
  ranges: AvailabilityRange[]
}
