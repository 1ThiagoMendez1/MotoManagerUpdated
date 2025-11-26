'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Wrench,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import TenantSwitcher from '@/components/TenantSwitcher';

export default function Header() {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      // Call logout API to clear server-side session
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      // Redirect to login
      router.push('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      // Still redirect to login even if logout fails
      router.push('/login');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 flex items-center justify-between p-4 text-white z-50">
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-lg christmas-logo"
        >
          <span className="christmas-logo-hat" aria-hidden="true" />
          <Wrench className="h-6 w-6 text-primary" />
          <span className="text-white hidden sm:inline">MotoManager</span>
          <span className="text-white sm:hidden">MM</span>
        </Link>
        <TenantSwitcher />
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        <Button
          onClick={handleSignOut}
          variant="ghost"
          className="p-2 rounded-md hover:bg-white/10"
        >
          <LogOut className="h-5 w-5 text-white" />
          <span className="ml-2 hidden md:inline">Cerrar Sesión</span>
        </Button>
      </div>
    </header>
  );
}