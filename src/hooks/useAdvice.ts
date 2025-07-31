import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface AdviceData {
  id: string;
  user_id: string;
  allocation_id: string;
  scenario_set_id?: string;
  target_weights_json: Record<string, number>;
  trades_json: any[];
  rationale_json: any;
  created_at: string;
}

export function useGenerateAdvice() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      allocationId: string;
      scenarioSetId?: string;
      currentHoldings?: Record<string, number>;
      costModel?: any;
    }) => {
      if (!user) throw new Error('User not authenticated');

      // Get allocation data
      const { data: allocation } = await supabase
        .from('candidate_allocations')
        .select('*')
        .eq('id', params.allocationId)
        .single();

      if (!allocation) throw new Error('Allocation not found');

      // Get scenario data if provided
      let scenarioResults = null;
      if (params.scenarioSetId) {
        // Run simulation to get results
        const { data: simResult, error } = await supabase.functions.invoke('run-simulation', {
          body: {
            allocationWeights: allocation.weights_json,
            scenarios: [], // Would get from scenario set
            costModel: params.costModel,
            horizonDays: 252
          }
        });

        if (!error && simResult) {
          scenarioResults = simResult;
        }
      }

      // Generate advice
      const { data: advice, error } = await supabase.functions.invoke('generate-advice', {
        body: {
          allocationWeights: allocation.weights_json,
          scenarioResults,
          currentHoldings: params.currentHoldings || {},
          costModel: params.costModel || {
            commissionBps: 5,
            bidAskBps: { Equity: 5, FixedIncome: 10, Commodities: 8 },
            slippageBpsPerTurnover: 15
          },
          constraints: {}
        }
      });

      if (error) throw error;

      // Save advice to database (using audit_events as temporary storage)
      const { data: savedAdvice, error: saveError } = await supabase
        .from('audit_events')
        .insert([{
          user_id: user.id,
          event_type: 'portfolio_advice_generated',
          payload_json: {
            allocation_id: params.allocationId,
            scenario_set_id: params.scenarioSetId,
            target_weights: advice.targetWeights,
            trades: advice.trades,
            rationale: advice.rationale
          } as any
        }])
        .select()
        .single();

      if (saveError) throw saveError;

      // Create audit event
      await supabase.from('audit_events').insert([{
        user_id: user.id,
        event_type: 'advice_generated',
        payload_json: {
          advice_id: savedAdvice.id,
          allocation_id: params.allocationId,
          scenario_set_id: params.scenarioSetId
        } as any
      }]);

      return { advice, savedAdvice };
    },
    onSuccess: () => {
      toast({
        title: "Advice Generated",
        description: "Portfolio advice has been generated successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });
}

export function useUserAdvice() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['portfolio-advice', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_events')
        .select('*')
        .eq('event_type', 'portfolio_advice_generated')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });
}