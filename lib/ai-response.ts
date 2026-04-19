export const USER_STATES = [
  'confused',
  'overwhelmed',
  'stuck',
  'overthinking',
  'avoidant',
] as const

export type UserState = (typeof USER_STATES)[number]

export type AIResponse = {
  summary: string
  key_points: string[]
  action_items: string[]
  state: UserState
}

export function isUserState(value: unknown): value is UserState {
  return typeof value === 'string' && USER_STATES.includes(value as UserState)
}
