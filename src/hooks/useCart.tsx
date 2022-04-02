import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const LocalStorageCartKey = '@RocketShoes:cart';

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(LocalStorageCartKey);

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productExists = cart.find(product => product.id === productId);

      if(productExists) {
        const { data: productStock } = await api.get<Stock>(`/stock/${productId}`);
        const newAmount = productExists.amount + 1;

        if(newAmount > productStock.amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        productExists.amount = newAmount;
        const updatedCart = cart.map(product => (product.id === productId ? productExists : product));
        setCart(updatedCart);
        localStorage.setItem(LocalStorageCartKey, JSON.stringify(updatedCart));
        return;
      }

      const { data: newProductWithoutAmount } = await api.get<Product>(`/products/${productId}`);
      const newProductWithAmount = { ...newProductWithoutAmount, amount: 1 };
      const updatedCart = [...cart, newProductWithAmount];
      setCart(updatedCart);
      localStorage.setItem(LocalStorageCartKey, JSON.stringify(updatedCart));

      return;

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExists = cart.find(product => product.id === productId);

      if(productExists) {
        const updatedCart = cart.filter(product => product.id !== productId);
        setCart(updatedCart);
        localStorage.setItem(LocalStorageCartKey, JSON.stringify(updatedCart));
        return;
      }

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const { data: productStock } = await api.get<Stock>(`/stock/${productId}`);

      if(amount > productStock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = cart.map(product => {
        if(product.id === productId){
          return {
            ...product,
            amount
          }
        }
        return product;
      });

      setCart(updatedCart);
      localStorage.setItem(LocalStorageCartKey, JSON.stringify(updatedCart));

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
