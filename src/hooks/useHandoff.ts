import { createContext, useCallback, useContext, useState } from 'react'
import React from 'react'
import type { HandoffPayload } from '../types/volumes'

interface HandoffContextValue {
  payload: HandoffPayload | null
  set: (p: HandoffPayload) => void
  consume: () => HandoffPayload | null
}

const HandoffCtx = createContext<HandoffContextValue>({ payload: null, set: () => {}, consume: () => null })

export function HandoffProvider({ children }: { children: React.ReactNode }) {
  const [payload, setPayload] = useState<HandoffPayload | null>(null)
  const consume = useCallback(() => {
    const p = payload
    setPayload(null)
    return p
  }, [payload])
  return React.createElement(
    HandoffCtx.Provider,
    { value: { payload, set: setPayload, consume } },
    children,
  )
}

export function useHandoff() {
  return useContext(HandoffCtx)
}
