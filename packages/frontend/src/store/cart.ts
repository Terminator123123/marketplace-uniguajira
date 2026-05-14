import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Producto } from '@marketplace/shared'

export interface CartItem {
  producto: Pick<Producto, 'id_producto' | 'id_tienda' | 'nombre' | 'precio' | 'tipo' | 'stock' | 'imagenes'> & { tienda_nombre?: string }
  cantidad: number
}

interface CartState {
  items: CartItem[]
  open: boolean
  agregar: (producto: CartItem['producto']) => void
  quitar: (id: string) => void
  actualizarCantidad: (id: string, cantidad: number) => void
  vaciar: () => void
  setOpen: (open: boolean) => void
  total: () => number
  totalItems: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      open: false,

      agregar: (producto) => {
        set(state => {
          const existe = state.items.find(i => i.producto.id_producto === producto.id_producto)
          if (existe) {
            return {
              items: state.items.map(i =>
                i.producto.id_producto === producto.id_producto
                  ? { ...i, cantidad: i.cantidad + 1 }
                  : i
              ),
              open: true,
            }
          }
          return { items: [...state.items, { producto, cantidad: 1 }], open: true }
        })
      },

      quitar: (id) => set(state => ({
        items: state.items.filter(i => i.producto.id_producto !== id),
      })),

      actualizarCantidad: (id, cantidad) => set(state => ({
        items: cantidad <= 0
          ? state.items.filter(i => i.producto.id_producto !== id)
          : state.items.map(i => i.producto.id_producto === id ? { ...i, cantidad } : i),
      })),

      vaciar: () => set({ items: [] }),
      setOpen: (open) => set({ open }),
      total: () => get().items.reduce((s, i) => s + Number(i.producto.precio) * i.cantidad, 0),
      totalItems: () => get().items.reduce((s, i) => s + i.cantidad, 0),
    }),
    { name: 'marketplace-cart' }
  )
)
