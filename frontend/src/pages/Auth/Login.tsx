import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { loginWithRole, type UserRole, DEMO_USERS } from '../../lib/auth';
import { Pencil, ArrowRight, ShieldCheck, GraduationCap, Users, Sparkles, AlertCircle } from 'lucide-react';

export default function LoginScreen() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [email, setEmail] = useState(DEMO_USERS.admin.email);
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    setError('');
    setEmail(DEMO_USERS[role].email);
    setPassword('123456');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Tenta autenticar via Supabase se configurado
      const { data, error: supaError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!supaError && data?.user) {
        const role = (data.user?.user_metadata?.role as UserRole) || selectedRole;
        loginWithRole(role, email);
        redirectByRole(role);
        return;
      }
    } catch {
      // Falha de rede ou Supabase offline -> fallback para login local
    }

    // 2. Modo demonstrativo / offline robusto
    loginWithRole(selectedRole, email);
    redirectByRole(selectedRole);
    setLoading(false);
  };

  const handleQuickDemoLogin = (role: UserRole) => {
    setLoading(true);
    loginWithRole(role);
    redirectByRole(role);
  };

  const redirectByRole = (role: UserRole) => {
    if (role === 'admin') {
      navigate('/admin');
    } else if (role === 'professor') {
      navigate('/professor');
    } else {
      navigate('/responsavel');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF7] font-['Inter',sans-serif] flex flex-col items-center justify-center p-6">
      
      {/* Brand Header */}
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg mb-4">
          <Pencil size={20} className="text-white" />
        </div>
        <h1 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[#1C1300] text-2xl">
          CDE Odessa Macedo
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Centro de Desenvolvimento da Expressão · Bagé/RS
        </p>
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl border border-amber-100 shadow-sm p-8">
        
        {/* Cabeçalho do Card */}
        <div className="mb-6">
          <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-lg text-[#1C1300]">
            Acesso ao Sistema
          </h2>
          <p className="text-gray-500 text-xs mt-0.5">
            Selecione seu perfil de acesso para continuar
          </p>
        </div>

        {/* 3 Opções de Login (Administrador, Professor, Aluno/Responsável) */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-amber-50/60 rounded-2xl border border-amber-200/50 mb-5">
          <button
            type="button"
            onClick={() => handleRoleChange('admin')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedRole === 'admin'
                ? 'bg-white text-amber-900 shadow-sm border border-amber-200/80 font-bold'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <ShieldCheck size={16} className={`mb-1 ${selectedRole === 'admin' ? 'text-amber-500' : 'text-gray-400'}`} />
            <span>Administrador</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleChange('professor')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedRole === 'professor'
                ? 'bg-white text-blue-900 shadow-sm border border-blue-200/80 font-bold'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <GraduationCap size={16} className={`mb-1 ${selectedRole === 'professor' ? 'text-blue-500' : 'text-gray-400'}`} />
            <span>Professor</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleChange('responsavel')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedRole === 'responsavel'
                ? 'bg-white text-emerald-900 shadow-sm border border-emerald-200/80 font-bold'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <Users size={16} className={`mb-1 ${selectedRole === 'responsavel' ? 'text-emerald-500' : 'text-gray-400'}`} />
            <span>Aluno / Resp.</span>
          </button>
        </div>

        {/* Particularidades do Perfil Selecionado */}
        <div className={`p-3 rounded-2xl border text-xs mb-5 transition-colors ${
          selectedRole === 'admin'
            ? 'bg-amber-50/70 border-amber-200 text-amber-900'
            : selectedRole === 'professor'
            ? 'bg-blue-50/70 border-blue-200 text-blue-900'
            : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
        }`}>
          <div className="flex items-center gap-1.5 font-bold mb-1">
            <Sparkles size={13} className={
              selectedRole === 'admin' ? 'text-amber-600' : selectedRole === 'professor' ? 'text-blue-600' : 'text-emerald-600'
            } />
            <span>
              {selectedRole === 'admin' && 'Particularidades do Administrador'}
              {selectedRole === 'professor' && 'Particularidades do Professor'}
              {selectedRole === 'responsavel' && 'Particularidades do Aluno / Responsável'}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed opacity-90">
            {selectedRole === 'admin' && 'Gestão integral da instituição: matrículas, chamadas gerais, controle de vagas e moderação da Galeria de Obras dos alunos.'}
            {selectedRole === 'professor' && 'Diário de classe e frequência, registro fotográfico e publicação com carrossel das obras criadas pelos alunos no Mural.'}
            {selectedRole === 'responsavel' && 'Acompanhamento de faltas e presença, consulta do histórico de chamadas e visualização das obras produzidas pela turma.'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-xs p-3.5 rounded-xl border border-red-200 mb-5 flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              {selectedRole === 'admin' && 'E-mail administrativo'}
              {selectedRole === 'professor' && 'E-mail do professor / educador'}
              {selectedRole === 'responsavel' && 'E-mail cadastrado ou do aluno'}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={DEMO_USERS[selectedRole].email}
              className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 focus:bg-white transition-colors"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold text-gray-600">Senha</label>
              <Link to="/redefinir-senha" className="text-[11px] text-amber-600 hover:underline">
                Esqueceu a senha?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 focus:bg-white transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full h-11 text-white text-sm font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 mt-2 cursor-pointer ${
              selectedRole === 'admin'
                ? 'bg-amber-500 hover:bg-amber-600'
                : selectedRole === 'professor'
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {loading ? 'Acessando...' : (
              <>
                Entrar como {selectedRole === 'admin' ? 'Administrador' : selectedRole === 'professor' ? 'Professor' : 'Aluno/Responsável'}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Botão de Demonstração / 1-Click Rápido */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-[11px] text-gray-400 text-center mb-2">Acesso Rápido de Teste (1 clique):</p>
          <button
            type="button"
            onClick={() => handleQuickDemoLogin(selectedRole)}
            className="w-full py-2 px-3 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles size={13} className="text-amber-500" />
            Entrar como {selectedRole === 'admin' ? 'Admin Demo' : selectedRole === 'professor' ? 'Prof. Carlos Demo' : 'Responsável Demo'}
          </button>
        </div>

        <div className="mt-5 text-center">
          <Link to="/" className="text-xs text-gray-500 hover:text-amber-600 font-medium transition-colors">
            ← Voltar para o Portal Público
          </Link>
        </div>
      </div>
    </div>
  );
}
