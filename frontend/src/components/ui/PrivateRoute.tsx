import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getCurrentUser, type UserRole } from '../../lib/auth';
import type { Session, User } from '@supabase/supabase-js';

interface PrivateRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

export function PrivateRoute({ children, requiredRole }: PrivateRouteProps) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [user, setUser] = useState<User | null>(null);
  const [localUser, setLocalUser] = useState(getCurrentUser());

  useEffect(() => {
    // 1. Verifica sessão local persistida (fast check)
    setLocalUser(getCurrentUser());

    // 2. Verifica Supabase (se configurado)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user || null);
    }).catch(() => {
      setSession(null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user || null);
    });

    const handleAuthChange = () => {
      setLocalUser(getCurrentUser());
    };
    window.addEventListener('cde_auth_change', handleAuthChange);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('cde_auth_change', handleAuthChange);
    };
  }, []);

  // Se o usuário tem login local ativo
  if (localUser) {
    if (requiredRole) {
      if (requiredRole === 'admin' && localUser.role !== 'admin') {
        return <Navigate to={localUser.role === 'professor' ? '/professor' : '/responsavel'} replace />;
      }
      if (requiredRole === 'professor' && localUser.role !== 'professor' && localUser.role !== 'admin') {
        return <Navigate to="/responsavel" replace />;
      }
      if (requiredRole === 'responsavel' && localUser.role !== 'responsavel' && localUser.role !== 'admin') {
        return <Navigate to="/admin" replace />;
      }
    }
    return <>{children}</>;
  }

  // Se ainda está verificando Supabase
  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF7] font-['Inter',sans-serif] text-gray-500">
        Verificando permissões de acesso...
      </div>
    );
  }

  // Não está autenticado
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const role = user?.user_metadata?.role as UserRole | undefined;

  // Verificação de permissões do Supabase
  if (requiredRole === 'admin' && role === 'responsavel') {
    return <Navigate to="/responsavel" replace />;
  }
  if (requiredRole === 'admin' && role === 'professor') {
    return <Navigate to="/professor" replace />;
  }

  return <>{children}</>;
}
