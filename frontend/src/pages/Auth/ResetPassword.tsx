import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Pencil, KeyRound, CheckCircle, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem. Digite novamente.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setError('Não foi possível definir a senha: ' + error.message);
      } else {
        setSuccess(true);
        setTimeout(() => {
          navigate('/responsavel');
        }, 2000);
      }
    } catch (err: any) {
      setError('Erro de conexão ao definir a senha.');
    } finally {
      setLoading(false);
    }
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
          Definição de Senha do Portal do Responsável
        </p>
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl border border-amber-100 shadow-sm p-8">
        <div className="flex items-center gap-2 mb-6">
          <KeyRound size={20} className="text-amber-500" />
          <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-lg text-[#1C1300]">
            Definir Senha de Acesso
          </h2>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-200 mb-6 flex items-center gap-2">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="bg-green-50 text-green-800 text-sm p-5 rounded-2xl border border-green-200 text-center space-y-2">
            <CheckCircle size={28} className="text-green-600 mx-auto" />
            <p className="font-bold text-base">Senha definida com sucesso!</p>
            <p className="text-xs text-green-700">
              Redirecionando você para o Portal do Responsável...
            </p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-5">
            <p className="text-xs text-gray-500 leading-relaxed">
              Crie uma senha segura para acompanhar a frequência e faltas do aluno sempre que desejar.
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Nova Senha (mínimo 6 caracteres)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 focus:bg-white transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Confirmar Nova Senha
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 focus:bg-white transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 mt-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Salvando senha...
                </>
              ) : (
                <>
                  Salvar Senha e Entrar <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-6 text-center border-t border-gray-100 pt-6">
          <Link to="/" className="text-xs text-gray-500 hover:text-amber-600 font-medium transition-colors">
            ← Voltar para o Portal Público
          </Link>
        </div>
      </div>
    </div>
  );
}
