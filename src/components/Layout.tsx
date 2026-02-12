import { Outlet } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import Navbar from './Navbar';

interface LayoutProps {
  user: {
    name: string;
    picture: string;
    role: string;
  } | null;
  onLogout: () => void;
}

export default function Layout({ user, onLogout }: LayoutProps) {
  return (
    <div className="min-h-screen bg-zinc-50/50">
      <Navbar user={user} onLogout={onLogout} />
      <main className="py-6 px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
      <Toaster richColors position="bottom-right" />
    </div>
  );
}
