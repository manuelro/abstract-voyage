'use client'

import React, { createContext, useContext } from 'react'

export type UIViewMode = 'classic' | 'immersive'

type UIViewContextType = {
  mode: UIViewMode
  setMode: (m: UIViewMode) => void
  toggle: () => void
  prefetchImmersive: () => void
}

const noop = () => {}

export const UIViewContext = createContext<UIViewContextType>({
  mode: 'classic',
  setMode: noop,
  toggle: noop,
  prefetchImmersive: noop,
})

export const useUIView = () => useContext(UIViewContext)
