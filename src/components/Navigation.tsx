import { useState } from "react";
import { NavLink } from "react-router-dom";
import { 
  BarChart3, 
  TrendingUp, 
  Bot, 
  Briefcase, 
  Shield, 
  Settings,
  Menu,
  X,
  DollarSign,
  LogOut,
  User,
  Newspaper,
  Eye,
  Target,
  Zap,
  BarChart,
  FileText,
  HelpCircle,
  Users,
  ChevronDown,
  Brain,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const mainNavigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: BarChart3,
    description: "Overview of your portfolio performance and market data"
  },
  {
    name: "Analysis",
    icon: TrendingUp,
    description: "Market analysis and trading tools",
    submenu: [
      { 
        name: "News Sentiment", 
        href: "/news-sentiment", 
        icon: Newspaper,
        description: "AI-powered analysis of financial news and market sentiment"
      },
      { 
        name: "Stock Prediction", 
        href: "/stock-prediction", 
        icon: Brain,
        description: "AI-powered stock performance predictions using news & technical analysis"
      },
      { 
        name: "AI Signals", 
        href: "/signals", 
        icon: Bot,
        description: "AI-generated trading signals and market insights"
      },
      { 
        name: "Strategy Lab", 
        href: "/strategy", 
        icon: TrendingUp,
        description: "Backtest trading strategies and optimize parameters"
      },
      { 
        name: "Watchlist", 
        href: "/watchlist", 
        icon: Eye,
        description: "Track and monitor your favorite stocks and assets"
      },
      { 
        name: "Stock Explorer", 
        href: "/stock-explorer", 
        icon: Search,
        description: "Discover high-potential stocks outside your portfolio and watchlist"
      }
    ]
  },
  {
    name: "Portfolio",
    icon: Briefcase,
    description: "Portfolio management and optimization tools",
    submenu: [
      { 
        name: "My Portfolio", 
        href: "/portfolio", 
        icon: Briefcase,
        description: "Manage your holdings, view performance, and track allocations"
      },
      { 
        name: "Optimizer", 
        href: "/optimizer", 
        icon: Zap,
        description: "Portfolio optimization using various objectives and constraints"
      },
      { 
        name: "Simulations", 
        href: "/simulations", 
        icon: BarChart,
        description: "Run Monte Carlo simulations to test portfolio performance"
      },
      { 
        name: "Scenarios", 
        href: "/scenarios", 
        icon: Target,
        description: "Create and analyze different market scenarios for stress testing"
      },
      { 
        name: "Risk Manager", 
        href: "/risk", 
        icon: Shield,
        description: "Monitor and manage portfolio risk metrics and exposures"
      },
      { 
        name: "Reports", 
        href: "/reports", 
        icon: FileText,
        description: "Generate detailed reports and analytics on your investments"
      }
    ]
  },
  {
    name: "More",
    icon: Settings,
    description: "Community and account settings",
    submenu: [
      { 
        name: "Community", 
        href: "/community", 
        icon: Users,
        description: "Connect with fellow investors, share insights, and learn together"
      },
      { 
        name: "Settings", 
        href: "/settings", 
        icon: Settings,
        description: "Manage your account settings and preferences"
      }
    ]
  }
];

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <nav className="bg-card border-b border-border fixed top-4 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8 w-full">
            <div className="flex-shrink-0 flex items-center">
              <DollarSign className="h-8 w-8 text-primary mr-2" />
              <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Yaghi's Investor
              </span>
            </div>
            
            {/* Desktop Navigation */}
            <TooltipProvider>
              <div className="hidden md:flex md:items-center md:space-x-1 flex-1 justify-center">
                {mainNavigation.map((item) => (
                  <div key={item.name}>
                    {item.href ? (
                      // Simple navigation item (Dashboard)
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <NavLink
                            to={item.href}
                            className={({ isActive }) =>
                              cn(
                                "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                isActive
                                  ? "bg-primary text-primary-foreground"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                              )
                            }
                          >
                            <item.icon className="h-4 w-4 mr-2" />
                            {item.name}
                            <HelpCircle className="h-3 w-3 ml-1 opacity-50" />
                          </NavLink>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">{item.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      // Dropdown navigation item
                      <DropdownMenu>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                className="flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-muted h-auto"
                              >
                                <item.icon className="h-4 w-4 mr-2" />
                                {item.name}
                                <ChevronDown className="h-3 w-3 ml-1 opacity-50" />
                              </Button>
                            </DropdownMenuTrigger>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">{item.description}</p>
                          </TooltipContent>
                        </Tooltip>
                        <DropdownMenuContent 
                          align="start" 
                          className="w-64 bg-background border border-border shadow-lg z-50"
                        >
                          {item.submenu?.map((subItem) => (
                            <DropdownMenuItem key={subItem.name} className="p-0">
                              <NavLink
                                to={subItem.href}
                                className={({ isActive }) =>
                                  cn(
                                    "flex items-start px-3 py-3 w-full rounded-md transition-colors",
                                    isActive
                                      ? "bg-primary text-primary-foreground"
                                      : "hover:bg-muted"
                                  )
                                }
                              >
                                <subItem.icon className="h-4 w-4 mr-3 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <div className="font-medium">{subItem.name}</div>
                                  <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                    {subItem.description}
                                  </div>
                                </div>
                              </NavLink>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                ))}
              </div>
            </TooltipProvider>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline-block">
                    {user?.email?.split('@')[0]}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled>
                  <User className="h-4 w-4 mr-2" />
                  {user?.email}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(!isOpen)}
                className="text-foreground"
              >
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 bg-background border-t border-border">
            {mainNavigation.map((item) => (
              <div key={item.name} className="space-y-1">
                {item.href ? (
                  // Simple navigation item (Dashboard)
                  <>
                    <NavLink
                      to={item.href}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )
                      }
                      onClick={() => setIsOpen(false)}
                    >
                      <item.icon className="h-5 w-5 mr-3" />
                      {item.name}
                      <HelpCircle className="h-4 w-4 ml-2 opacity-50" />
                    </NavLink>
                    <p className="px-3 pb-2 text-xs text-muted-foreground/70">
                      {item.description}
                    </p>
                  </>
                ) : (
                  // Dropdown section for mobile
                  <div className="space-y-1">
                    <div className="flex items-center px-3 py-2 text-base font-medium text-foreground border-b border-border">
                      <item.icon className="h-5 w-5 mr-3" />
                      {item.name}
                    </div>
                    {item.submenu?.map((subItem) => (
                      <div key={subItem.name} className="ml-4 space-y-1">
                        <NavLink
                          to={subItem.href}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                              isActive
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )
                          }
                          onClick={() => setIsOpen(false)}
                        >
                          <subItem.icon className="h-4 w-4 mr-3" />
                          {subItem.name}
                        </NavLink>
                        <p className="px-3 pb-1 text-xs text-muted-foreground/70">
                          {subItem.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="border-t border-border pt-3 mt-3">
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="w-full justify-start text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-5 w-5 mr-3" />
                Sign out
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}