import { Leaf, Sprout, Home, LayoutDashboard, Settings, Compass, TreePine, Droplet, Thermometer, Gauge, LogOut } from "lucide-react";
import { Link, useLocation } from "wouter";
import { logout } from "@/lib/api-client";

export function Sidebar() {
  const [location] = useLocation();

  const navItems = [
    { name: "Overview", path: "/", icon: LayoutDashboard },
  ];

  return (
    <div className="flex h-screen w-64 flex-col border-r border-border bg-sidebar text-sidebar-foreground hidden md:flex fixed top-0 left-0">
      <div className="flex items-center h-16 px-6 border-b border-border bg-sidebar/50">
        <Sprout className="w-6 h-6 text-primary mr-2" />
        <span className="font-serif font-semibold text-lg tracking-wide text-primary">GardenEye</span>
      </div>
      
      <div className="flex-1 py-6 px-4 space-y-1">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3 px-2">
          Mission Control
        </div>
        {navItems.map((item) => {
          const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                isActive 
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <item.icon className={`w-4 h-4 ${isActive ? "text-sidebar-primary-foreground" : "text-muted-foreground"}`} />
              {item.name}
            </Link>
          );
        })}
      </div>
      
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Compass className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">Field Robot</span>
            <span className="text-xs text-green-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Online
            </span>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-2 py-2 mt-1 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-sidebar-accent transition-colors"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </div>
  );
}
