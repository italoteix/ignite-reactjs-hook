import { createContext, ReactNode, useContext, useState } from 'react'
import { toast } from 'react-toastify'
import { api } from '../services/api'
import { Product, Stock } from '../types'

interface CartProviderProps {
  children: ReactNode
}

interface UpdateProductAmount {
  productId: number
  amount: number
}

interface CartContextData {
  cart: Product[]
  addProduct: (productId: number) => Promise<void>
  removeProduct: (productId: number) => void
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void
}

const CartContext = createContext<CartContextData>({} as CartContextData)

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart)
    }

    return []
  })

  const addProduct = async (productId: number) => {
    try {
      // Check if product is already in the cart
      const cartProduct = cart.find(product => product.id === productId)
      if (cartProduct) {
        updateProductAmount({
          productId: cartProduct.id,
          amount: cartProduct.amount + 1,
        })
        return
      }

      // Checking if there is enough stock
      const stockResponse = await api.get<Stock>(`/stock/${productId}`)
      const { amount } = stockResponse.data

      if (!amount) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      // Fetching product and adding to cart
      const productResponse = await api.get<Product>(`/products/${productId}`)
      const product = productResponse.data

      if (!product) {
        throw new Error('Product not found')
      }

      const newCart = [...cart, { ...product, amount: 1 }]
      setCart(newCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
    } catch {
      toast.error('Erro na adição do produto')
    }
  }

  const removeProduct = (productId: number) => {
    try {
      const productToBeDeleted = cart.find(product => product.id === productId)
      if (!productToBeDeleted) {
        throw new Error('Product not found')
      }

      const newCart = cart.filter(product => product.id !== productId)
      setCart(newCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
    } catch {
      toast.error('Erro na remoção do produto')
    }
  }

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return
      }

      // Checking if there is enough stock
      const stockResponse = await api.get<Stock>(`/stock/${productId}`)
      const { amount: stockAmount } = stockResponse.data
      console.log('stockAmount', stockAmount)
      console.log('amount', amount)

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      const newCart = cart.map(product => {
        if (product.id === productId) {
          return { ...product, amount }
        }

        return product
      })

      setCart(newCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  }

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextData {
  const context = useContext(CartContext)

  return context
}
