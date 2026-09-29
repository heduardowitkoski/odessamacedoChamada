import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

interface PrivateRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'responsavel';
}

export function PrivateRoute({ children, requiredRole }: PrivateRouteProps) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user || null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF7] font-['Inter',sans-serif] text-gray-500">
        Verificando permissões de acesso...
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const role = user?.user_metadata?.role;

  // Se a rota exige admin, mas o usuário é responsavel, bloqueia o acesso ao admin
  if (requiredRole === 'admin' && role === 'responsavel') {
    return <Navigate to="/responsavel" replace />;
  }

  return <>{children}</>;
}
