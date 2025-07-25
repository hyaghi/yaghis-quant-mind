import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import PaywallModal from './PaywallModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Lock } from 'lucide-react';

interface PortfolioPaywallProps {
  children: React.ReactNode;
}

export default function PortfolioPaywall({ children }: PortfolioPaywallProps) {
  const { user, loading: authLoading } = useAuth();
  const { subscribed, loading: subLoading } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please sign in to access portfolio features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.href = '/auth'} 
              className="w-full"
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!subscribed) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full border-primary/20">
            <CardHeader className="text-center">
              <Crown className="h-12 w-12 mx-auto text-primary mb-4" />
              <CardTitle>Premium Feature</CardTitle>
              <CardDescription>
                Upgrade to Premium to access advanced portfolio management features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <span className="text-3xl font-bold text-primary">$15</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <Button 
                onClick={() => setShowPaywall(true)} 
                className="w-full"
              >
                Upgrade Now
              </Button>
            </CardContent>
          </Card>
        </div>
        <PaywallModal 
          isOpen={showPaywall} 
          onClose={() => setShowPaywall(false)} 
        />
      </>
    );
  }

  return <>{children}</>;
}