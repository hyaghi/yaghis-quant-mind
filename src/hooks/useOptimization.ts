import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface CandidateAllocation {
  id: string;
  user_id: string;
  name: string;
  weights_json: Record<string, number>;
  created_at: string;
}

export interface OptimizationConfig {
  objective: string;
  shrinkage: string;
  kellyCap: number;
  constraintsRef?: string;
  blackLitterman?: {
    tau: number;
    views: any[];
  };
}

export function useCandidateAllocations() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['candidate-allocations', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidate_allocations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as CandidateAllocation[];
    },
    enabled: !!user
  });
}

export function useOptimizePortfolio() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      config: OptimizationConfig;
      assets: string[];
      scenarioSetId?: string;
      constraintsProfile?: any;
    }) => {
      if (!user) throw new Error('User not authenticated');

      // Get scenario data if provided
      let scenarioData = null;
      if (params.scenarioSetId) {
        const { data } = await supabase
          .from('scenario_sets')
          .select('config_json')
          .eq('id', params.scenarioSetId)
          .single();
        
        if (data) {
          // Generate scenarios from config
          const scenarioResponse = await supabase.functions.invoke('generate-scenarios', {
            body: {
              scenarioConfig: data.config_json,
              assetUniverse: params.assets
            }
          });
          
          if (scenarioResponse.data) {
            scenarioData = scenarioResponse.data;
          }
        }
      }

      // Run optimization
      const { data: optimizationResult, error } = await supabase.functions.invoke('optimize-portfolio', {
        body: {
          objective: params.config.objective,
          assets: params.assets,
          constraints: params.constraintsProfile,
          priors: {
            blackLitterman: params.config.blackLitterman,
            shrinkage: params.config.shrinkage,
            kellyCap: params.config.kellyCap
          },
          scenarioData
        }
      });

      if (error) throw error;

      // Save the optimized allocation
      const { data: allocation, error: saveError } = await supabase
        .from('candidate_allocations')
        .insert([{
          user_id: user.id,
          name: `${params.config.objective} Optimization`,
          weights_json: optimizationResult.weights as any
        }])
        .select()
        .single();

      if (saveError) throw saveError;

      // Create audit event
      await supabase.from('audit_events').insert([{
        user_id: user.id,
        event_type: 'optimization_completed',
        payload_json: {
          allocation_id: allocation.id,
          objective: params.config.objective,
          diagnostics: optimizationResult.diagnostics
        } as any
      }]);

      return {
        allocation,
        diagnostics: optimizationResult.diagnostics
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-allocations'] });
      toast({
        title: "Optimization Complete",
        description: "Your optimized portfolio allocation has been generated"
      });
    },
    onError: (error) => {
      toast({
        title: "Optimization Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });
}