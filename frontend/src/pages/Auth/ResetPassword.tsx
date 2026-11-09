import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { saveUserSession, type UserProfile } from '../../lib/auth';
import { Pencil, KeyRound, CheckCircle, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const initSession = async () => {
      setValidatingToken(true);
      setError('');

      try {
        // 1. Verifica se há token_hash na query string
        const tokenHash = searchParams.get('token_hash');
        const type = searchParams.get('type') || 'recovery';
        const emailFromQuery = searchParams.get('email');
        if (emailFromQuery) {
          setUserEmail(emailFromQuery);
        }

        if (tokenHash) {
          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as any,
          });

          if (verifyError) {
            setError('O link de acesso expirou ou já foi utilizado. Solicite um novo link se necessário.');
          } else if (data?.user?.email) {
            setUserEmail(data.user.email);
          }
        } else if (window.location.hash) {
          // 2. Se o Supabase redirecionou com hash (#access_token=...&refresh_token=...)
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');

          if (accessToken && refreshToken) {
            const { data, error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (setSessionError) {
              setError('Sessão expirada. Por favor, utilize o link recebido por e-mail.');
            } else if (data?.user?.email) {
              setUserEmail(data.user.email);
            }
          }
        } else {
          // 3. Verifica se já há uma sessão ativa
          const { data } = await supabase.auth.getUser();
          if (data?.user?.email) {
            setUserEmail(data.user.email);
          }
        }
      } catch (e: any) {
        console.warn('Aviso ao inicializar sessão de recuperação:', e);
      } finally {
        setValidatingToken(false);
      }
    };

    initSession();
  }, [searchParams]);

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
      const { data, error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setError('Não foi possível definir a senha: ' + error.message);
      } else {
        setSuccess(true);

        // Cria e salva sessão do responsável para entrar logado imediatamente
        const targetEmail = data?.user?.email || userEmail || 'responsavel@odessamacedo.com.br';
        const userMeta = data?.user?.user_metadata || {};
        const profile: UserProfile = {
          id: data?.user?.id || 'usr-resp-' + Date.now(),
          email: targetEmail,
          name: userMeta.nome || 'Responsável',
          role: (userMeta.role as any) || 'responsavel',
          alunoId: userMeta.aluno_id,
          alunoNome: userMeta.aluno_nome,
          cargo: 'Responsável',
        };
        saveUserSession(profile);

        setTimeout(() => {
          navigate('/responsavel');
        }, 1500);
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

        {validatingToken ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-gray-500">
            <Loader2 size={24} className="animate-spin text-amber-500" />
            <p className="text-xs">Validando credenciais do link...</p>
          </div>
        ) : (
          <>
            {userEmail && (
              <div className="mb-4 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                <span>Conta associada:</span>
                <strong className="font-semibold">{userEmail}</strong>
              </div>
            )}

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
        </>
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
