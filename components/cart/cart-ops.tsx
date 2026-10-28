'use client'

import { createContext, use, useOptimistic, useState, type ReactNode } from 'react'
import type { CartOp } from '@/lib/types'

// Owns only pending optimistic ops + the drawer's open flag. Cart data flows from the server as a prop.
type CartOpsValue = { ops: CartOp[]; addOp: (op: CartOp) => void; open: boolean; setOpen: (open: boolean) => void }
const Ctx = createContext<CartOpsValue | null>(null)

export function CartOps({ children }: { children: ReactNode }) {
  const [ops, addOp] = useOptimistic<CartOp[], CartOp>([], (ops, op) => [...ops, op])
  const [open, setOpen] = useState(false)
  return <Ctx value={{ ops, addOp, open, setOpen }}>{children}</Ctx>
}

export const useCartOps = () => use(Ctx)!
