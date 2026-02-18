import { Outlet } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import Navbar from './Navbar';
import StatusBar from './StatusBar';

interface LayoutProps {
  user: {
    email: string;
    picture: string;
    role: string;
  } | null;
  onLogout: () => void;
  centrifugoToken: string | null;
  centrifugoUrl: string | null;
}

export default function Layout({ user, onLogout, centrifugoToken, centrifugoUrl }: LayoutProps) {
  return (
    <div className="min-h-screen bg-zinc-50/50">
      <Navbar user={user} onLogout={onLogout} />
      <StatusBar user={user} centrifugoToken={centrifugoToken} centrifugoUrl={centrifugoUrl} />
      <main className="py-6 px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
      <Toaster richColors position="bottom-right" />
    </div>
  );
}
