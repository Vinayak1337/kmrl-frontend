"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X, Home, LogIn, FileText } from 'lucide-react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState<null | { role: 'ADMIN' | 'MANAGER' }>(null);

  const toggleMenu = () => setIsOpen(!isOpen);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        setSession(data.user || null);
      } catch {
        setSession(null);
      }
    })();
  }, []);

  const navLinks = session
    ? [
        { href: '/', label: 'Home', icon: Home },
        { href: '/dashboard', label: 'Dashboard', icon: Home },
      ]
    : [
        { href: '/', label: 'Home', icon: Home },
        { href: '/request-deployment', label: 'Request Deployment', icon: FileText },
        { href: '/login', label: 'Client Login', icon: LogIn },
      ];

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setSession(null);
      window.location.href = '/login';
    } catch {
      window.location.href = '/login';
    }
  };

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-gray-800">KMRL App</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center space-x-1 text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  <Icon className="h-4 w-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
            {session && (
              <button onClick={logout} className="ml-2 px-3 py-2 text-sm text-white bg-gray-800 rounded-md hover:bg-black">
                Logout
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 focus:text-gray-900 transition-colors"
              aria-expanded={isOpen}
              aria-label="Toggle navigation menu"
            >
              {isOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
            {session && (
              <button
                onClick={() => { setIsOpen(false); logout(); }}
                className="w-full text-left text-gray-700 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium transition-colors"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

