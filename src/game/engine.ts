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
  location?: LatLng // where the player stands; scenes without one keep the previous location
  choices: Choice[]
}

export type Ending = {
  id: string
  title: string
  text: string
  requiresFlags: string[]
}

export type Story = {
  start: string
  scenes: Scene[]
  endings: Ending[]
}

export type GameState = {
  sceneId: string
  minutes: number // minutes since midnight
  pins: ArchiveRecord[]
  flags: string[]
  searches: number
  endingId: string | null
  location: LatLng | null
}

export const START_MINUTES = 18 * 60 + 30 // 6:30 PM
export const SEARCH_COST = 5

export function initialState(story: Story): GameState {
  const location = story.scenes.find((s) => s.id === story.start)?.location ?? null
  return { sceneId: story.start, minutes: START_MINUTES, pins: [], flags: [], searches: 0, endingId: null, location }
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

export function pickEnding(story: Story, flags: string[]): Ending {
  const ending = story.endings.find((e) => e.requiresFlags.every((flag) => flags.includes(flag)))
  if (!ending) throw new Error('No ending matched. Add a catch-all ending with empty requiresFlags.')
  return ending
}

export function choose(state: GameState, story: Story, choice: Choice): GameState {
  const flags = [...new Set([...state.flags, ...(choice.setsFlags ?? [])])]
  const minutes = state.minutes + choice.timeCost
  if (choice.endsRun) return { ...state, minutes, flags, endingId: pickEnding(story, flags).id }
  if (!choice.next) throw new Error(`Choice "${choice.label}" needs either next or endsRun`)
  const location = getScene(story, choice.next).location ?? state.location
  return { ...state, minutes, flags, sceneId: choice.next, location }
}

export function formatClock(minutes: number): string {
  const h24 = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${String(m).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`
}

// Catches authoring mistakes in scenes.json. Returns a list of problems (empty = fine).
export function validateStory(story: Story): string[] {
  const problems: string[] = []
  const ids = new Set(story.scenes.map((s) => s.id))
  if (!ids.has(story.start)) problems.push(`start scene "${story.start}" does not exist`)
  for (const scene of story.scenes) {
    for (const choice of scene.choices) {
      if (!choice.endsRun && !choice.next) problems.push(`${scene.id}: "${choice.label}" has no next or endsRun`)
      if (choice.next && !ids.has(choice.next)) problems.push(`${scene.id}: "${choice.label}" points to missing scene "${choice.next}"`)
    }
  }
  if (!story.endings.some((e) => e.requiresFlags.length === 0)) problems.push('no catch-all ending (empty requiresFlags)')
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
      case 'search': return spendSearch(state)
      case 'togglePin': return togglePin(state, action.record)
      case 'choose': return choose(state, story, action.choice)
      case 'restart': return initialState(story)
    }
  }
}
