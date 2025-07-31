import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface ScenarioSet {
  id: string;
  user_id: string;
  name: string;
  config_json: any;
  created_at: string;
  updated_at: string;
}

export interface ScenarioConfig {
  horizonDays: number;
  paths: number;
  seed: number;
  include: string[];
  historicalReplay?: string[];
  macroShocks?: Array<{
    name: string;
    shock: Record<string, any>;
  }>;
  monteCarlo?: {
    regimes: Array<{
      name: string;
      volMult: number;
      prob: number;
    }>;
  };
}

export function useScenarioSets() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['scenario-sets', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scenario_sets')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ScenarioSet[];
    },
    enabled: !!user
  });
}

export function useCreateScenarioSet() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { name: string; config: ScenarioConfig }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('scenario_sets')
        .insert([{
          user_id: user.id,
          name: params.name,
          config_json: params.config as any
        }])
        .select()
        .single();

      if (error) throw error;

      // Create audit event
      await supabase.from('audit_events').insert([{
        user_id: user.id,
        event_type: 'scenario_created',
        payload_json: {
          scenario_set_id: data.id,
          name: params.name,
          config: params.config
        } as any
      }]);

      return data as ScenarioSet;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenario-sets'] });
      toast({
        title: "Scenario Created",
        description: "Your scenario set has been saved successfully"
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