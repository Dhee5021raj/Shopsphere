import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cart, setCart] = useState({ items: [], subtotal: 0, shipping: 0, tax: 0, total: 0 });
  const [loading, setLoading] = useState(false);

  const fetchCart = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/cart');
      setCart(data);
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, [user]);

  // Sync guest cart upon user login
  useEffect(() => {
    const sync = async () => {
      if (user) {
        const guestSession = localStorage.getItem('shopsphere_guest_session');
        if (guestSession) {
          try {
            const { data } = await api.post('/cart/sync', { sessionId: guestSession });
            setCart(data);
          } catch (err) {
            console.error('Error syncing guest cart:', err);
          }
        }
      }
    };
    sync();
  }, [user]);

  const addToCart = async (productId, quantity = 1) => {
    const { data } = await api.post('/cart/add', { productId, quantity });
    setCart(data);
    return data;
  };

  const updateQuantity = async (productId, quantity) => {
    const { data } = await api.put('/cart/update', { productId, quantity });
    setCart(data);
    return data;
  };

  const removeFromCart = async (productId) => {
    const { data } = await api.delete(`/cart/item/${productId}`);
    setCart(data);
    return data;
  };

  const processCheckout = async (shippingAddress, paymentMethod) => {
    const { data } = await api.post('/checkout', { shippingAddress, paymentMethod });
    await fetchCart(); // Reset cart after successful transaction
    return data;
  };

  const totalItemCount = cart.items ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        fetchCart,
        addToCart,
        updateQuantity,
        removeFromCart,
        processCheckout,
        totalItemCount
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
