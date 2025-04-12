
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Users, User, Calendar, BarChart3, MessageSquare, 
  LogOut, ChevronLeft, ChevronRight, UserCircle, 
  Clock, UserPlus, Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type NavItem = {
  title: string;
  href: string;
  icon: React.ElementType;
  role: 'ADMIN' | 'EMPLOYEE' | 'ALL';
};

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: BarChart3,
    role: 'EMPLOYEE',
  },
  {
    title: 'My Attendance',
    href: '/attendance',
    icon: Clock,
    role: 'EMPLOYEE',
  },
  // Admin Routes
  {
    title: 'Admin Dashboard',
    href: '/admin/dashboard',
    icon: BarChart3,
    role: 'ADMIN',
  },
  {
    title: 'Employees',
    href: '/admin/employees',
    icon: Users,
    role: 'ADMIN',
  },
  {
    title: 'Teams',
    href: '/admin/teams',
    icon: Briefcase,
    role: 'ADMIN',
  },
  {
    title: 'Attendance',
    href: '/admin/attendance',
    icon: Calendar,
    role: 'ADMIN',
  },
  {
    title: 'AI Chat',
    href: '/admin/chat',
    icon: MessageSquare,
    role: 'ADMIN',
  },
];

interface SidebarProps {
  userRole: 'ADMIN' | 'EMPLOYEE' | null;
  collapsed: boolean;
  toggleSidebar: () => void;
}

export function Sidebar({ userRole, collapsed, toggleSidebar }: SidebarProps) {
  const { logout } = useAuth();
  const location = useLocation();
  
  const filteredNavItems = navItems.filter(
    item => item.role === userRole || item.role === 'ALL'
  );

  return (
    <div className={cn(
      "fixed z-20 left-0 top-0 h-full bg-sidebar border-r border-sidebar-border transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
          {!collapsed && (
            <div className="text-lg font-bold text-primary">AttendOps</div>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleSidebar}
            className={cn(
              "ml-auto",
              collapsed && "mx-auto"
            )}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </Button>
        </div>
        
        <div className="flex-1 py-4 overflow-y-auto scrollbar-hide">
          <nav className="space-y-1 px-2">
            <TooltipProvider delayDuration={0}>
              {filteredNavItems.map((item) => {
                const isActive = location.pathname === item.href;
                
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      <Link
                        to={item.href}
                        className={cn(
                          "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          collapsed ? "justify-center" : "justify-start"
                        )}
                      >
                        <item.icon className={cn("h-5 w-5", collapsed ? "mx-0" : "mr-3")} />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </TooltipTrigger>
                    {collapsed && (
                      <TooltipContent side="right">
                        {item.title}
                      </TooltipContent>
                    )}
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </nav>
        </div>
        
        <div className="p-4 border-t border-sidebar-border">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={logout}
                  className={cn(
                    "w-full justify-center",
                    !collapsed && "justify-start"
                  )}
                >
                  <LogOut className={cn("h-4 w-4", collapsed ? "mx-0" : "mr-2")} />
                  {!collapsed && "Logout"}
                </Button>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right">
                  Logout
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
