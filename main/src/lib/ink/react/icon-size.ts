"use client"

import * as React from "react"

export const IconSizeContext = React.createContext<number | undefined>(undefined)

export const useIconSize = (): number | undefined => React.useContext(IconSizeContext)
