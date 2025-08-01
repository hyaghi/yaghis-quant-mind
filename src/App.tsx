import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Navigation from "./components/Navigation";
import Dashboard from "./pages/Dashboard";
import StrategyLab from "./pages/StrategyLab";
import Portfolio from "./pages/Portfolio";
import RiskManagement from "./pages/RiskManagement";
import NewsSentimentDashboard from "./pages/NewsSentimentDashboard";
import WatchlistManager from "./pages/WatchlistManager";
import Scenarios from "./pages/Scenarios";
import Optimizer from "./pages/Optimizer";
import Simulations from "./pages/Simulations";
import Reports from "./pages/Reports";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Community from "./pages/Community";
import Settings from "./pages/Settings";
import ProtectedRoute from "./components/ProtectedRoute";
import PortfolioPaywall from "./components/PortfolioPaywall";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen bg-background">
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={
                  <ProtectedRoute>
                    <Navigation />
                    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
                      <Dashboard />
                    </main>
                  </ProtectedRoute>
              } />
              <Route path="/strategy" element={
                <ProtectedRoute>
                  <Navigation />
                    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
                      <StrategyLab />
                    </main>
                </ProtectedRoute>
              } />
              <Route path="/news" element={
                <ProtectedRoute>
                  <Navigation />
                    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
                      <NewsSentimentDashboard />
                    </main>
                </ProtectedRoute>
              } />
              <Route path="/watchlist" element={
                <ProtectedRoute>
                  <Navigation />
                    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
                      <WatchlistManager />
                    </main>
                </ProtectedRoute>
              } />
              <Route path="/signals" element={
                <ProtectedRoute>
                  <Navigation />
                    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
                      <Dashboard />
                    </main>
                </ProtectedRoute>
              } />
              <Route path="/portfolio" element={
                <ProtectedRoute>
                  <PortfolioPaywall>
                    <Navigation />
                      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
                        <Portfolio />
                      </main>
                  </PortfolioPaywall>
                </ProtectedRoute>
              } />
              <Route path="/scenarios" element={
                <ProtectedRoute>
                  <PortfolioPaywall>
                    <Navigation />
                      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
                        <Scenarios />
                      </main>
                  </PortfolioPaywall>
                </ProtectedRoute>
              } />
              <Route path="/optimizer" element={
                <ProtectedRoute>
                  <PortfolioPaywall>
                    <Navigation />
                      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
                        <Optimizer />
                      </main>
                  </PortfolioPaywall>
                </ProtectedRoute>
              } />
              <Route path="/simulations" element={
                <ProtectedRoute>
                  <PortfolioPaywall>
                    <Navigation />
                      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
                        <Simulations />
                      </main>
                  </PortfolioPaywall>
                </ProtectedRoute>
              } />
              <Route path="/reports" element={
                <ProtectedRoute>
                  <PortfolioPaywall>
                    <Navigation />
                      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
                        <Reports />
                      </main>
                  </PortfolioPaywall>
                </ProtectedRoute>
              } />
              <Route path="/risk" element={
                <ProtectedRoute>
                  <PortfolioPaywall>
                    <Navigation />
                      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
                        <RiskManagement />
                      </main>
                  </PortfolioPaywall>
                </ProtectedRoute>
              } />
              <Route path="/community" element={
                <ProtectedRoute>
                  <Navigation />
                    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
                      <Community />
                    </main>
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Navigation />
                    <div className="pt-16">
                      <Settings />
                    </div>
                </ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;