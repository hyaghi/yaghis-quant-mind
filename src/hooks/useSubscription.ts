import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionStatus {
  subscribed: boolean;
  subscription_tier?: string;
  subscription_end?: string;
  loading: boolean;
}

export function useSubscription() {
  const { user, session } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>({
    subscribed: false,
    loading: true
  });

  const checkSubscription = async () => {
    if (!user || !session) {
      setStatus({ subscribed: false, loading: false });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;
      
      setStatus({
        subscribed: data?.subscribed || false,
        subscription_tier: data?.subscription_tier,
        subscription_end: data?.subscription_end,
        loading: false
      });
    } catch (error) {
      console.error('Error checking subscription:', error);
      setStatus({ subscribed: false, loading: false });
    }
  };

  const openCustomerPortal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
    }
  };

  useEffect(() => {
    checkSubscription();
  }, [user, session]);

  return {
    ...status,
    checkSubscription,
    openCustomerPortal
  };
}