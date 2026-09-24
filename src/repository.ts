import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js'
import { EVENT_ID, seedParticipants } from './seed'
import type { Participant, ParticipantInput } from './types'

const STORAGE_KEY = 'eon-day-participants-v1'
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null

function localRead(): Participant[] {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedParticipants))
    return structuredClone(seedParticipants)
  }
  try { return JSON.parse(stored) as Participant[] } catch { return structuredClone(seedParticipants) }
}

function localWrite(participants: Participant[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(participants))
  window.dispatchEvent(new Event('eon-local-change'))
}

function normalize(row: any): Participant {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    sortOrder: row.sort_order,
    ranges: (row.availability_ranges ?? [])
      .map((range: any) => ({ startSlot: range.start_slot, endSlot: range.end_slot }))
      .sort((a: any, b: any) => a.startSlot - b.startSlot),
  }
}

export const repository = {
  mode: supabase ? 'supabase' : 'local',

  async list(): Promise<Participant[]> {
    if (!supabase) return localRead().sort((a, b) => a.sortOrder - b.sortOrder)
    const { data, error } = await supabase
      .from('participants')
      .select('id,name,role,sort_order,availability_ranges(start_slot,end_slot)')
      .eq('event_id', EVENT_ID)
      .order('sort_order')
    if (error) throw error
    return (data ?? []).map(normalize)
  },

  async create(input: ParticipantInput): Promise<void> {
    if (!supabase) {
      const participants = localRead()
      participants.push({ id: crypto.randomUUID(), sortOrder: Math.min(1, ...participants.map(p => p.sortOrder)) - 1, ...input })
      localWrite(participants)
      return
    }
    const { data: firstRows, error: orderError } = await supabase.from('participants')
      .select('sort_order').eq('event_id', EVENT_ID).order('sort_order', { ascending: true }).limit(1)
    if (orderError) throw orderError
    const sortOrder = ((firstRows?.[0]?.sort_order as number | undefined) ?? 1) - 1
    const { data, error } = await supabase.from('participants').insert({
      event_id: EVENT_ID, name: input.name, role: input.role, sort_order: sortOrder,
    }).select('id').single()
    if (error) throw error
    if (input.ranges.length) {
      const { error: rangeError } = await supabase.from('availability_ranges').insert(
        input.ranges.map(range => ({ participant_id: data.id, start_slot: range.startSlot, end_slot: range.endSlot })),
      )
      if (rangeError) throw rangeError
    }
  },

  async update(id: string, input: ParticipantInput): Promise<void> {
    if (!supabase) {
      localWrite(localRead().map(participant => participant.id === id ? { ...participant, ...input } : participant))
      return
    }
    const { error } = await supabase.from('participants').update({ name: input.name, role: input.role }).eq('id', id)
    if (error) throw error
    const { error: deleteError } = await supabase.from('availability_ranges').delete().eq('participant_id', id)
    if (deleteError) throw deleteError
    if (input.ranges.length) {
      const { error: rangeError } = await supabase.from('availability_ranges').insert(
        input.ranges.map(range => ({ participant_id: id, start_slot: range.startSlot, end_slot: range.endSlot })),
      )
      if (rangeError) throw rangeError
    }
  },

  async remove(id: string): Promise<void> {
    if (!supabase) {
      localWrite(localRead().filter(participant => participant.id !== id))
      return
    }
    const { error } = await supabase.from('participants').delete().eq('id', id)
    if (error) throw error
  },

  subscribe(onChange: () => void): () => void {
    if (!supabase) {
      window.addEventListener('storage', onChange)
      window.addEventListener('eon-local-change', onChange)
      return () => {
        window.removeEventListener('storage', onChange)
        window.removeEventListener('eon-local-change', onChange)
      }
    }
    const channel: RealtimeChannel = supabase.channel('eon-day-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'availability_ranges' }, onChange)
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  },
}
