import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { repository } from './repository'
import { rangesToSlots, SLOT_COUNT, slotsToRanges } from './seed'
import type { Participant, Role, RoleFilter } from './types'

type Mode = 'view' | 'add' | 'edit'

const timeLabel = (slot: number) => {
  const totalMinutes = 14 * 60 + slot * 30
  const hour = Math.floor(totalMinutes / 60)
  const suffix = hour >= 12 && hour < 24 ? 'pm' : 'am'
  const displayHour = hour % 12 || 12
  return `${displayHour}${totalMinutes % 60 ? ':30' : ''} ${suffix}`
}

function Logo() {
  return <a className="logo" href="#" aria-label="LettuceMeet home">
    <img src="https://lettucemeet.com/static/media/logo.6d56d076.svg" alt="LettuceMeet" />
  </a>
}

function App() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [filter, setFilter] = useState<RoleFilter>('both')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('view')
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role>('exec')
  const [draftSlots, setDraftSlots] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const paintValue = useRef<boolean | null>(null)

  const load = useCallback(async () => {
    try {
      const rows = await repository.list()
      setParticipants(rows)
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load availabilities.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    void load()
    return repository.subscribe(() => { void load() })
  }, [load])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    const endPaint = () => { paintValue.current = null }
    window.addEventListener('pointerup', endPaint)
    return () => window.removeEventListener('pointerup', endPaint)
  }, [])

  const selected = participants.find(person => person.id === selectedId) ?? null
  const visible = useMemo(
    () => participants.filter(person => filter === 'both' || person.role === filter),
    [participants, filter],
  )
  const heatCounts = useMemo(() => Array.from({ length: SLOT_COUNT }, (_, slot) =>
    visible.reduce((count, person) => count + (rangesToSlots(person.ranges).has(slot) ? 1 : 0), 0),
  ), [visible])
  const maxCount = Math.max(1, ...heatCounts)

  const beginAdd = () => {
    setMode('add'); setSelectedId(null); setName(''); setRole(filter === 'jit' ? 'jit' : 'exec'); setDraftSlots(new Set()); setError('')
  }
  const beginEdit = () => {
    if (!selected) return
    setMode('edit'); setName(selected.name); setRole(selected.role); setDraftSlots(rangesToSlots(selected.ranges)); setError('')
  }
  const cancel = () => { setMode('view'); setError(''); setDraftSlots(new Set()) }

  const paintSlot = (slot: number, start: boolean) => {
    if (mode === 'view') return
    if (start) paintValue.current = !draftSlots.has(slot)
    if (paintValue.current === null) return
    setDraftSlots(current => {
      const next = new Set(current)
      if (paintValue.current) next.add(slot); else next.delete(slot)
      return next
    })
  }

  const save = async () => {
    const cleanName = name.trim()
    if (!cleanName) { setError('Please enter your name.'); return }
    setSaving(true); setError('')
    try {
      const input = { name: cleanName, role, ranges: slotsToRanges(draftSlots) }
      if (mode === 'edit' && selected) await repository.update(selected.id, input)
      else await repository.create(input)
      await load(); setMode('view'); setSelectedId(null); setToast('Response saved!')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save your response.') }
    finally { setSaving(false) }
  }

  const remove = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await repository.remove(selected.id); await load(); setSelectedId(null); setMode('view'); setDeleteOpen(false); setToast('Availability deleted.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete this response.'); setDeleteOpen(false) }
    finally { setSaving(false) }
  }

  const heading = mode === 'add' ? 'Add your availability' : mode === 'edit' ? `Edit ${selected?.name ?? ''}'s availability` : selected ? `${selected.name}'s availability` : 'Availabilities'
  const selectedSlots = selected ? rangesToSlots(selected.ranges) : null

  return <div className="page">
    <header className="site-header">
      <Logo />
      <nav><a href="#how">How it works</a><a href="#help">Help</a><a href="#login">Log in</a></nav>
    </header>

    <main>
      <section className="event-heading">
        <div><h1>EoN Day</h1><p className="event-subtitle">Tuesday, September 29</p></div>
        <div className="event-actions"><button className="button muted">↗ Share</button><button className="button muted">✎ Edit event</button></div>
      </section>

      <section className="availability-card">
        <div className="availability-header">
          <h2>{heading}</h2>
          <div className="availability-actions">
            {mode === 'view' ? <>
              {selected && <button className="button" onClick={beginEdit}>✎ Edit availability</button>}
              <button className="button primary" onClick={beginAdd}>＋ Add availability</button>
            </> : <>
              {mode === 'edit' && <button className="button danger" onClick={() => setDeleteOpen(true)}>⌫ Delete</button>}
              <button className="button" onClick={cancel}>× Cancel</button>
              <button className="button primary" disabled={saving} onClick={() => void save()}>✓ {saving ? 'Saving…' : 'Save'}</button>
            </>}
          </div>
        </div>

        {mode !== 'view' && <div className="editor-fields">
          <label><span>Name</span><input autoFocus value={name} onChange={event => setName(event.target.value)} placeholder="Enter your name" /></label>
          <fieldset><legend>Role</legend><div className="role-choice">
            <button className={role === 'exec' ? 'active' : ''} onClick={() => setRole('exec')}>Exec</button>
            <button className={role === 'jit' ? 'active' : ''} onClick={() => setRole('jit')}>JIT</button>
          </div></fieldset>
          <p>Click and drag on the calendar to select your available times.</p>
        </div>}
        {error && <div className="error" role="alert">{error}</div>}

        <div className="availability-content">
          <div className="calendar-shell">
            <div className="month-label">September 2026</div>
            <div className="calendar">
              <div className="time-column">
                <div className="timezone">EDT</div>
                {Array.from({ length: SLOT_COUNT }, (_, slot) => <div className="time-cell" key={slot}>{slot % 2 === 0 ? timeLabel(slot) : ''}</div>)}
              </div>
              <div className="day-column">
                <div className="day-header"><span>TUE</span><strong>29</strong></div>
                <div className={`slots ${mode !== 'view' ? 'editing' : ''}`}>
                  {Array.from({ length: SLOT_COUNT }, (_, slot) => {
                    const draft = mode !== 'view' && draftSlots.has(slot)
                    const isSelectedPerson = mode === 'view' && selectedSlots?.has(slot)
                    const density = heatCounts[slot] / maxCount
                    const background = draft || isSelectedPerson
                      ? '#009d4f'
                      : heatCounts[slot] ? `rgba(0, 157, 79, ${0.16 + density * 0.72})` : '#fff'
                    return <div
                      key={slot}
                      className={`slot ${draft ? 'draft' : ''}`}
                      style={{ background }}
                      onPointerDown={event => { event.preventDefault(); paintSlot(slot, true) }}
                      onPointerEnter={() => paintSlot(slot, false)}
                      title={`${timeLabel(slot)} – ${timeLabel(slot + 1)} · ${heatCounts[slot]} available`}
                    ><span>{mode === 'view' && !selected && heatCounts[slot] ? heatCounts[slot] : ''}</span></div>
                  })}
                </div>
              </div>
            </div>
          </div>

          <aside className="responders">
            <h2>Responders <span>{visible.length}</span></h2>
            <div className="filter-tabs" role="group" aria-label="Filter responders by role">
              {(['both', 'exec', 'jit'] as const).map(value => <button key={value} className={filter === value ? 'active' : ''} onClick={() => { setFilter(value); setSelectedId(null) }}>{value === 'both' ? 'Both' : value.toUpperCase()}</button>)}
            </div>
            <div className="responder-list">
              {loading ? <p className="loading">Loading…</p> : visible.map(person => <button
                key={person.id}
                className={`responder ${selectedId === person.id ? 'selected' : ''}`}
                onClick={() => mode === 'view' && setSelectedId(current => current === person.id ? null : person.id)}
              ><span className={`role-badge ${person.role}`}>{person.role.toUpperCase()}</span><span>{person.name}</span></button>)}
            </div>
          </aside>
        </div>
      </section>
    </main>

    <footer><a href="#feedback">Feedback</a><span>·</span><a href="#privacy">Privacy</a><span>·</span><a href="#terms">Terms</a></footer>
    <div className="mobile-bar">
      {mode === 'view' ? <button onClick={beginAdd}>＋ Add availability</button> : <><button onClick={cancel}>× Cancel</button><button onClick={() => void save()}>✓ Save</button></>}
    </div>
    {toast && <div className="toast" role="status">{toast}</div>}
    {deleteOpen && <div className="modal-backdrop" onMouseDown={() => setDeleteOpen(false)}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="delete-title" onMouseDown={event => event.stopPropagation()}>
        <h2 id="delete-title">Delete Availability?</h2>
        <p>Are you sure you want to delete this availability? This action cannot be undone.</p>
        <div><button className="button" onClick={() => setDeleteOpen(false)}>Cancel</button><button className="button danger-fill" disabled={saving} onClick={() => void remove()}>Delete</button></div>
      </div>
    </div>}
  </div>
}

export default App
