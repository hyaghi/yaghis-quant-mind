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
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Strategy Lab", href: "/strategy", icon: TrendingUp },
  { name: "News Sentiment", href: "/news", icon: Newspaper },
  { name: "Watchlist", href: "/watchlist", icon: Eye },
  { name: "AI Signals", href: "/signals", icon: Bot },
  { name: "Portfolio", href: "/portfolio", icon: Briefcase },
  { name: "Scenarios", href: "/scenarios", icon: Target },
  { name: "Optimizer", href: "/optimizer", icon: Zap },
  { name: "Simulations", href: "/simulations", icon: BarChart },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Risk Manager", href: "/risk", icon: Shield },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <nav className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <DollarSign className="h-8 w-8 text-primary mr-2" />
              <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Yaghi's Investor
              </span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:ml-8 md:flex md:space-x-1">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
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
                </NavLink>
              ))}
            </div>
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
          <div className="px-2 pt-2 pb-3 space-y-1 bg-muted/50">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
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
              </NavLink>
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