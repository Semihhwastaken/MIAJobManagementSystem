import React, { createContext, useContext, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe('YOUR_PUBLISHABLE_KEY');

interface StripeContextType {
  createSubscription: (priceId: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const StripeContext = createContext<StripeContextType | undefined>(undefined);

export const StripeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSubscription = async (priceId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/subscription/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          email: 'user@example.com', // Bu bilgiyi auth context'ten alabilirsiniz
          name: 'User Name', // Bu bilgiyi auth context'ten alabilirsiniz
        }),
      });

      const { sessionId } = await response.json();
      const stripe = await stripePromise;

      if (!stripe) {
        throw new Error('Stripe yüklenemedi');
      }

      const { error } = await stripe.redirectToCheckout({
        sessionId,
      });

      if (error) {
        throw error;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <StripeContext.Provider value={{ createSubscription, isLoading, error }}>
      {children}
    </StripeContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useStripe = () => {
  const context = useContext(StripeContext);
  if (context === undefined) {
    throw new Error('useStripe must be used within a StripeProvider');
  }
  return context;
};