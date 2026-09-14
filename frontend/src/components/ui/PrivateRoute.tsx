import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export function PrivateRoute({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // 1. Checa sessão local administrativa
    const localSession = localStorage.getItem('ode_admin_session');
    if (localSession) {
      try {
        const parsed = JSON.parse(localSession);
        if (parsed?.email) {
          setIsAuthenticated(true);
          return;
        }
      } catch (e) {
        // ignora
      }
    }

    // 2. Checa sessão do Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    }).catch(() => {
      setIsAuthenticated(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsAuthenticated(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF7] font-['Inter',sans-serif] text-gray-500">
        Verificando acesso...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
