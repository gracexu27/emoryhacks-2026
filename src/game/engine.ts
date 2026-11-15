// Pure game logic: state in, state out. No React, no fetching.
import type { ArchiveRecord, LatLng } from '../lib/typesense'

export type Choice = {
  label: string
  next?: string // scene id; omit when endsRun is true
  endsRun?: boolean
  timeCost: number
  requiresPinned?: string[]
  setsFlags?: string[]
}

export type Scene = {
  id: string
  text: string
  guide: string
  place?: string // place name shown in the HUD; scenes without one keep the previous place
  location?: LatLng // where the player stands; scenes without one keep the previous location
  choices: Choice[]
}

export type Ending = {
  id: string
  title: string
  text: string
  requiresFlags: string[]
}

// One row of the end-of-run debrief: a claim Ping made, how the player handled it, and the evidence.
export type DebriefOutcome = { flag: string; safe: boolean; text: string }
export type DebriefBeat = {
  id: string
  title: string
  claim: string
  outcomes: DebriefOutcome[] // the first outcome whose flag is set is shown
  evidence: string[] // record ids
}

export type Story = {
  start: string
  scenes: Scene[]
  endings: Ending[]
  debrief?: DebriefBeat[]
  // Past this time ("HH:MM"), the run ends with `flag` set. List an ending requiring that flag first.
  deadline?: { time: string; flag: string }
}

export type GameState = {
  sceneId: string
  minutes: number // minutes since midnight
  pins: ArchiveRecord[]
  flags: string[]
  searches: number
  endingId: string | null
  location: LatLng | null
  place: string // HUD place name, carried forward like location
}

export const START_MINUTES = 18 * 60 + 30 // 6:30 PM
export const SEARCH_COST = 5

export function initialState(story: Story): GameState {
  const start = story.scenes.find((s) => s.id === story.start)
  return {
    sceneId: story.start,
    minutes: START_MINUTES,
    pins: [],
    flags: [],
    searches: 0,
    endingId: null,
    location: start?.location ?? null,
    place: start?.place ?? '',
  }
}

export function getScene(story: Story, id: string): Scene {
  const scene = story.scenes.find((s) => s.id === id)
  if (!scene) throw new Error(`Unknown scene: ${id}`)
  return scene
}

export function spendSearch(state: GameState): GameState {
  return { ...state, minutes: state.minutes + SEARCH_COST, searches: state.searches + 1 }
}

export function isPinned(state: GameState, id: string): boolean {
  return state.pins.some((pin) => pin.id === id)
}

export function togglePin(state: GameState, record: ArchiveRecord): GameState {
  const pins = isPinned(state, record.id)
    ? state.pins.filter((pin) => pin.id !== record.id)
    : [...state.pins, record]
  return { ...state, pins }
}

export function availableChoices(state: GameState, scene: Scene): Choice[] {
  return scene.choices.filter((choice) => (choice.requiresPinned ?? []).every((id) => isPinned(state, id)))
}

// How many choices in this scene are still locked behind evidence the player hasn't pinned.
// The UI shows that something is locked, never what it is.
export function lockedChoiceCount(state: GameState, scene: Scene): number {
  return scene.choices.length - availableChoices(state, scene).length
}

export function pickEnding(story: Story, flags: string[]): Ending {
  const ending = story.endings.find((e) => e.requiresFlags.every((flag) => flags.includes(flag)))
  if (!ending) throw new Error('No ending matched. Add a catch-all ending with empty requiresFlags.')
  return ending
}

// "22:45" -> minutes since midnight
export function parseClock(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

// If the clock has passed the story's deadline, set the deadline flag and end the run.
// Runs after every search and choice, so it overrides an ending reached too late.
export function applyDeadline(state: GameState, story: Story): GameState {
  if (!story.deadline || state.minutes <= parseClock(story.deadline.time)) return state
  const flags = [...new Set([...state.flags, story.deadline.flag])]
  return { ...state, flags, endingId: pickEnding(story, flags).id }
}

export function choose(state: GameState, story: Story, choice: Choice): GameState {
  return applyDeadline(chooseWithoutDeadline(state, story, choice), story)
}

function chooseWithoutDeadline(state: GameState, story: Story, choice: Choice): GameState {
  const flags = [...new Set([...state.flags, ...(choice.setsFlags ?? [])])]
  const minutes = state.minutes + choice.timeCost
  if (choice.endsRun) return { ...state, minutes, flags, endingId: pickEnding(story, flags).id }
  if (!choice.next) throw new Error(`Choice "${choice.label}" needs either next or endsRun`)
  const next = getScene(story, choice.next)
  return {
    ...state,
    minutes,
    flags,
    sceneId: choice.next,
    location: next.location ?? state.location,
    place: next.place ?? state.place,
  }
}

export function formatClock(minutes: number): string {
  const h24 = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${String(m).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`
}

// For each debrief beat, the outcome the player reached (null if they never reached that beat).
export function debriefResults(story: Story, flags: string[]): { beat: DebriefBeat; outcome: DebriefOutcome | null }[] {
  return (story.debrief ?? []).map((beat) => ({
    beat,
    outcome: beat.outcomes.find((o) => flags.includes(o.flag)) ?? null,
  }))
}

// Catches authoring mistakes in scenes.json. Pass the archive's record ids to also check references.
// Returns a list of problems (empty = fine).
export function validateStory(story: Story, recordIds?: Set<string>): string[] {
  const problems: string[] = []
  const ids = new Set(story.scenes.map((s) => s.id))
  const setFlags = new Set(story.scenes.flatMap((s) => s.choices.flatMap((c) => c.setsFlags ?? [])))
  if (story.deadline) {
    setFlags.add(story.deadline.flag)
    if (!story.endings.some((e) => e.requiresFlags.includes(story.deadline!.flag))) {
      problems.push(`no ending requires the deadline flag "${story.deadline.flag}"`)
    }
  }
  if (!ids.has(story.start)) problems.push(`start scene "${story.start}" does not exist`)
  for (const scene of story.scenes) {
    for (const choice of scene.choices) {
      if (!choice.endsRun && !choice.next) problems.push(`${scene.id}: "${choice.label}" has no next or endsRun`)
      if (choice.next && !ids.has(choice.next)) problems.push(`${scene.id}: "${choice.label}" points to missing scene "${choice.next}"`)
      for (const id of choice.requiresPinned ?? []) {
        if (recordIds && !recordIds.has(id)) problems.push(`${scene.id}: "${choice.label}" requires missing record "${id}"`)
      }
    }
  }
  if (!story.endings.some((e) => e.requiresFlags.length === 0)) problems.push('no catch-all ending (empty requiresFlags)')
  for (const ending of story.endings) {
    for (const flag of ending.requiresFlags) {
      if (!setFlags.has(flag)) problems.push(`ending ${ending.id}: no choice sets flag "${flag}"`)
    }
  }
  for (const beat of story.debrief ?? []) {
    for (const outcome of beat.outcomes) {
      if (!setFlags.has(outcome.flag)) problems.push(`debrief ${beat.id}: no choice sets flag "${outcome.flag}"`)
    }
    for (const id of beat.evidence) {
      if (recordIds && !recordIds.has(id)) problems.push(`debrief ${beat.id}: evidence record "${id}" is missing`)
    }
  }
  return problems
}

// Reducer so React can drive the engine with useReducer.
export type GameAction =
  | { type: 'search' }
  | { type: 'togglePin'; record: ArchiveRecord }
  | { type: 'choose'; choice: Choice }
  | { type: 'restart' }

export function gameReducer(story: Story) {
  return (state: GameState, action: GameAction): GameState => {
    switch (action.type) {
      case 'search': return applyDeadline(spendSearch(state), story)
      case 'togglePin': return togglePin(state, action.record)
      case 'choose': return choose(state, story, action.choice)
      case 'restart': return initialState(story)
    }
  }
}
