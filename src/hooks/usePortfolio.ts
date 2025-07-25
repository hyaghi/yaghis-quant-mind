import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Portfolio {
  id: string;
  name: string;
  description?: string;
  initial_value: number;
  created_at: string;
  updated_at: string;
}

interface Holding {
  id: string;
  portfolio_id: string;
  symbol: string;
  quantity: number;
  average_cost: number;
  created_at: string;
  updated_at: string;
}

interface WatchlistItem {
  id: string;
  symbol: string;
  notes?: string;
  price_alert?: number;
  created_at: string;
}

export function useUserPortfolios() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['portfolios', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('user_portfolios')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Portfolio[];
    },
    enabled: !!user,
  });
}

export function usePortfolioHoldings(portfolioId: string | null) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['holdings', portfolioId],
    queryFn: async () => {
      if (!portfolioId || !user) throw new Error('No portfolio ID or not authenticated');
      
      const { data, error } = await supabase
        .from('portfolio_holdings')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .order('symbol');
      
      if (error) throw error;
      return data as Holding[];
    },
    enabled: !!portfolioId && !!user,
  });
}

export function useWatchlist() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['watchlist', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('user_watchlists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as WatchlistItem[];
    },
    enabled: !!user,
  });
}

export function useCreatePortfolio() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ name, description, initial_value }: { name: string; description?: string; initial_value?: number }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('user_portfolios')
        .insert({
          user_id: user.id,
          name,
          description,
          initial_value: initial_value || 100000
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      toast({
        title: "Portfolio created",
        description: "Your new portfolio has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error creating portfolio",
        description: error.message,
        variant: "destructive",
      });
    }
  });
}

export function useAddToWatchlist() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ symbol, notes, price_alert }: { symbol: string; notes?: string; price_alert?: number }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('user_watchlists')
        .insert({
          user_id: user.id,
          symbol: symbol.toUpperCase(),
          notes,
          price_alert
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      toast({
        title: "Added to watchlist",
        description: "Symbol has been added to your watchlist.",
      });
    },
    onError: (error) => {
      if (error.message.includes('duplicate')) {
        toast({
          title: "Already in watchlist",
          description: "This symbol is already in your watchlist.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error adding to watchlist",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  });
}

export function useAddHolding() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      portfolio_id, 
      symbol, 
      quantity, 
      average_cost 
    }: { 
      portfolio_id: string; 
      symbol: string; 
      quantity: number; 
      average_cost: number;
    }) => {
      const { data, error } = await supabase
        .from('portfolio_holdings')
        .upsert({
          portfolio_id,
          symbol: symbol.toUpperCase(),
          quantity,
          average_cost
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holdings'] });
      toast({
        title: "Holding updated",
        description: "Portfolio holding has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating holding",
        description: error.message,
        variant: "destructive",
      });
    }
  });
}