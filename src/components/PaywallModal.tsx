import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PaywallModal({ isOpen, onClose }: PaywallModalProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Error",
        description: "Failed to start checkout process. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            Upgrade to Premium
          </DialogTitle>
          <DialogDescription>
            Access advanced portfolio features with our premium subscription
          </DialogDescription>
        </DialogHeader>
        
        <Card className="border-primary/20">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Premium Plan</CardTitle>
            <CardDescription>
              <span className="text-3xl font-bold text-primary">$15</span>
              <span className="text-muted-foreground">/month</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {[
                'Advanced Portfolio Management',
                'Real-time Holdings Tracking',
                'Watchlist Management',
                'Risk Management Tools',
                'Trading Signals & Analytics',
                'Priority Support'
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
            
            <Button 
              onClick={handleSubscribe} 
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Processing...' : 'Subscribe Now'}
            </Button>
            
            <p className="text-xs text-muted-foreground text-center">
              Cancel anytime. Secure payment powered by Stripe.
            </p>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}