import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Smartphone, Server, Users, LogOut, Download, Key, BookOpen, ChevronDown, Wallet, Headphones, Gift } from 'lucide-react';
import APKDownloadModal from './APKDownloadModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NavbarProps {
  user: {
    name: string;
    picture: string;
    role: string;
  } | null;
  onLogout: () => void;
}

export default function Navbar({ user, onLogout }: NavbarProps) {
  const location = useLocation();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isSuperAdmin = user?.role === 'superadmin';
  const [showAPKModal, setShowAPKModal] = useState(false);

  const navItems = [
    { path: '/phones', label: 'Phones', icon: Smartphone },
    { path: '/billing', label: 'Billing', icon: Wallet },
    { path: '/affiliate', label: 'Affiliate', icon: Gift },
    // Servers - superadmin only
    ...(isSuperAdmin ? [
      { path: '/admin/servers', label: 'Servers', icon: Server },
    ] : []),
    // Users - all admins
    ...(isAdmin ? [
      { path: '/admin/users', label: 'Users', icon: Users },
    ] : []),
  ];

  return (
    <nav className="bg-white sticky top-0 z-50 border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo & Nav */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center">
              <span className="text-3xl font-extrabold tracking-tight">
                <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Droid</span>
                <span className="text-gray-900">Proxy</span>
              </span>
            </Link>

            <div className="hidden sm:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <Link key={item.path} to={item.path}>
                    <Button
                      variant={isActive ? 'secondary' : 'ghost'}
                      size="sm"
                      className={`gap-2 ${isActive ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}

              {/* Download APK Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAPKModal(true)}
                className="gap-2 text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <Download className="w-4 h-4" />
                Download APK
              </Button>

              {/* Support Button */}
              <a
                href="https://t.me/invictusproxies"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-muted-foreground hover:text-foreground hover:bg-accent"
                >
                  <Headphones className="w-4 h-4" />
                  Support
                </Button>
              </a>

              {/* API Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={location.pathname.startsWith('/api') ? 'secondary' : 'ghost'}
                    size="sm"
                    className={`gap-2 ${location.pathname.startsWith('/api') ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
                  >
                    <Key className="w-4 h-4" />
                    API
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 bg-white border-border shadow-lg">
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/api/keys" className="flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      API Keys
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <a href="/docs" className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      Documentation
                    </a>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* User Menu */}
          {user && (
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 gap-3 px-2 hover:bg-accent">
                    <Avatar className="h-8 w-8 ring-2 ring-border">
                      <AvatarImage src={user.picture} alt={user.name} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:flex flex-col items-start">
                      <span className="text-sm font-medium">{user.name}</span>
                      {isAdmin && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-0">
                          {isSuperAdmin ? 'Super Admin' : 'Admin'}
                        </Badge>
                      )}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white border-border shadow-lg">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {isSuperAdmin ? 'Super Administrator' : isAdmin ? 'Administrator' : 'User'}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem
                    onClick={onLogout}
                    className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      {/* APK Download Modal */}
      <APKDownloadModal isOpen={showAPKModal} onClose={() => setShowAPKModal(false)} />
    </nav>
  );
}
