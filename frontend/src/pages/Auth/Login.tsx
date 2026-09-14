import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Pencil, ArrowRight, Lock, KeyRound, Check } from 'lucide-react';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    // 1. Suporte direto para a conta de teste solicitada (teste@gmail.com / 123) ou admin padrão
    if (
      (cleanEmail === 'teste@gmail.com' && cleanPass === '123') ||
      (cleanEmail === 'admin@cultura.bage.rs.gov.br' && cleanPass === 'admin123')
    ) {
      localStorage.setItem(
        'ode_admin_session',
        JSON.stringify({
          email: cleanEmail,
          role: 'admin',
          name: 'Sec. de Cultura',
          loggedAt: new Date().toISOString(),
        })
      );
      setLoading(false);
      navigate('/admin');
      return;
    }

    // 2. Tenta autenticação via Supabase Auth
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPass,
      });

      if (!authError && data?.session) {
        localStorage.setItem(
          'ode_admin_session',
          JSON.stringify({
            email: cleanEmail,
            role: 'admin',
            name: data.user?.email || 'Sec. de Cultura',
            loggedAt: new Date().toISOString(),
          })
        );
        navigate('/admin');
        return;
      }
    } catch (err) {
      console.warn('Erro ao autenticar no Supabase:', err);
    }

    // Se chegou aqui, credenciais não bateram
    setError('E-mail ou senha incorretos. Use a conta de teste: teste@gmail.com com a senha: 123');
    setLoading(false);
  };

  const handleQuickTestLogin = () => {
    setEmail('teste@gmail.com');
    setPassword('123');
    localStorage.setItem(
      'ode_admin_session',
      JSON.stringify({
        email: 'teste@gmail.com',
        role: 'admin',
        name: 'Sec. de Cultura (Teste)',
        loggedAt: new Date().toISOString(),
      })
    );
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-[#FAFAF7] font-['Inter',sans-serif] flex flex-col items-center justify-center p-6">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg mb-4">
          <Pencil size={20} className="text-white" />
        </div>
        <h1 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[#1C1300] text-2xl">
          CDE Odessa Macedo
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Acesso restrito à Secretaria de Cultura
        </p>
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl border border-amber-100 shadow-sm p-8">
        <div className="flex items-center gap-2 mb-6">
          <Lock size={18} className="text-amber-500" />
          <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-lg text-[#1C1300]">
            Entrar no Painel
          </h2>
        </div>

        {/* Dica de Conta de Teste */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 text-xs text-amber-900">
          <div className="flex items-center gap-2 font-bold mb-1">
            <KeyRound size={15} className="text-amber-600" />
            <span>Conta de Acesso para Testes</span>
          </div>
          <p className="text-amber-700 mb-2">
            E-mail: <strong>teste@gmail.com</strong> | Senha: <strong>123</strong>
          </p>
          <button
            type="button"
            onClick={handleQuickTestLogin}
            className="w-full py-1.5 px-3 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 transition-colors flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Check size={14} /> Entrar com 1 clique usando conta teste
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-xs p-4 rounded-xl border border-red-200 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">E-mail administrativo</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teste@gmail.com"
              className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 focus:bg-white transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="123"
              className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 focus:bg-white transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            {loading ? 'Entrando...' : (
              <>
                Acessar Painel <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-gray-100 pt-6">
          <Link to="/" className="text-xs text-gray-500 hover:text-amber-600 font-medium transition-colors">
            ← Voltar para o Portal Público
          </Link>
        </div>
      </div>
    </div>
  );
}
