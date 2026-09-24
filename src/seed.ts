import type { Participant } from './types'

export const EVENT_ID = 'eon-day-2026-09-29'
export const EVENT_DATE = '2026-09-29'
export const SLOT_COUNT = 18

export const seedParticipants: Participant[] = [
  { id: '10000000-0000-4000-8000-000000000001', name: 'max, eleanor, steven probably', role: 'exec', sortOrder: 1, ranges: [{ startSlot: 0, endSlot: 18 }] },
  { id: '10000000-0000-4000-8000-000000000002', name: 'sam', role: 'exec', sortOrder: 2, ranges: [{ startSlot: 0, endSlot: 9 }, { startSlot: 15, endSlot: 18 }] },
  { id: '10000000-0000-4000-8000-000000000003', name: 'cindy', role: 'exec', sortOrder: 3, ranges: [{ startSlot: 0, endSlot: 3 }, { startSlot: 7, endSlot: 18 }] },
  { id: '10000000-0000-4000-8000-000000000004', name: 'kathleen', role: 'exec', sortOrder: 4, ranges: [{ startSlot: 0, endSlot: 3 }, { startSlot: 7, endSlot: 18 }] },
  { id: '10000000-0000-4000-8000-000000000005', name: 'aaron', role: 'exec', sortOrder: 5, ranges: [{ startSlot: 0, endSlot: 3 }, { startSlot: 7, endSlot: 18 }] },
  { id: '10000000-0000-4000-8000-000000000006', name: 'jennifer', role: 'exec', sortOrder: 6, ranges: [{ startSlot: 6, endSlot: 18 }] },
  { id: '10000000-0000-4000-8000-000000000007', name: 'Ivy', role: 'exec', sortOrder: 7, ranges: [{ startSlot: 0, endSlot: 7 }, { startSlot: 11, endSlot: 18 }] },
  { id: '10000000-0000-4000-8000-000000000008', name: 'Kayshini', role: 'jit', sortOrder: 8, ranges: [{ startSlot: 4, endSlot: 6 }, { startSlot: 10, endSlot: 18 }] },
  { id: '10000000-0000-4000-8000-000000000009', name: 'Conor, Mattias, Dane, Aubrey, Tammy, Faaz, Megan, Matthew, Avery, Cedric, William, Ishan, Nathan, Zenith, Victoria, Sherlyn, Victor', role: 'jit', sortOrder: 9, ranges: [{ startSlot: 4, endSlot: 18 }] },
  { id: '10000000-0000-4000-8000-000000000010', name: 'Ethan', role: 'jit', sortOrder: 10, ranges: [] },
  { id: '10000000-0000-4000-8000-000000000011', name: 'Manya', role: 'jit', sortOrder: 11, ranges: [{ startSlot: 4, endSlot: 8 }, { startSlot: 11, endSlot: 18 }] },
  { id: '10000000-0000-4000-8000-000000000012', name: 'Anna', role: 'jit', sortOrder: 12, ranges: [{ startSlot: 5, endSlot: 18 }] },
  { id: '10000000-0000-4000-8000-000000000013', name: 'Bella', role: 'jit', sortOrder: 13, ranges: [{ startSlot: 5, endSlot: 9 }, { startSlot: 15, endSlot: 18 }] },
  { id: '10000000-0000-4000-8000-000000000014', name: 'Caitlyn, Pallas', role: 'jit', sortOrder: 14, ranges: [{ startSlot: 4, endSlot: 9 }, { startSlot: 15, endSlot: 18 }] },
]

export function rangesToSlots(ranges: Participant['ranges']): Set<number> {
  const slots = new Set<number>()
  ranges.forEach(({ startSlot, endSlot }) => {
    for (let slot = startSlot; slot < endSlot; slot += 1) slots.add(slot)
  })
  return slots
}

export function slotsToRanges(slots: Set<number>): Participant['ranges'] {
  const sorted = [...slots].sort((a, b) => a - b)
  if (!sorted.length) return []
  const ranges: Participant['ranges'] = []
  let start = sorted[0]
  let previous = sorted[0]
  for (const slot of sorted.slice(1)) {
    if (slot !== previous + 1) {
      ranges.push({ startSlot: start, endSlot: previous + 1 })
      start = slot
    }
    previous = slot
  }
  ranges.push({ startSlot: start, endSlot: previous + 1 })
  return ranges
}
