import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  Pencil,
  LogOut,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Clock,
  BookOpen,
  Award,
  Phone,
  Loader2,
  TrendingUp
} from 'lucide-react';

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'https://odessamacedochamada.onrender.com';

interface RegistroFrequencia {
  id: string;
  data: string;
  status: 'PRESENTE' | 'FALTA' | 'JUSTIFICADA';
  justificativa?: string;
}

interface AlunoResponsavel {
  id: string;
  aluno_nome: string;
  resp_nome: string;
  resp_email: string;
  resp_telefone: string;
  turma?: {
    id: string;
    nome: string;
    turno: string;
  };
  status: string;
  stats: {
    totalAulas: number;
    presencas: number;
    faltas: number;
    justificadas: number;
    frequenciaPercentual: number;
  };
  historico: RegistroFrequencia[];
}

export default function ResponsiblePortal() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [alunos, setAlunos] = useState<AlunoResponsavel[]>([]);
  const [selectedAlunoId, setSelectedAlunoId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      setUserEmail(user.email || '');

      // Buscar os dados do aluno e histórico de faltas por e-mail
      const res = await fetch(`${API_BASE}/frequencias/minhas-faltas?email=${encodeURIComponent(user.email || '')}`);
      
      if (!res.ok) {
        throw new Error('Falha ao carregar informações de frequência.');
      }

      const data = await res.json();
      const listaAlunos: AlunoResponsavel[] = data.alunos || [];

      setAlunos(listaAlunos);
      if (listaAlunos.length > 0) {
        setSelectedAlunoId(listaAlunos[0].id);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao carregar dados do aluno.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const alunoSelecionado = alunos.find((a) => a.id === selectedAlunoId) || alunos[0];

  return (
    <div className="min-h-screen bg-[#FAFAF7] font-['Inter',sans-serif] text-[#1C1300]">
      {/* Top Header */}
      <header className="bg-white border-b border-amber-100 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
              <Pencil size={17} className="text-white" />
            </div>
            <div>
              <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-sm block">CDE Odessa Macedo</span>
              <span className="text-amber-600 text-xs font-semibold">Portal do Responsável</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-gray-800">{userEmail}</span>
              <span className="text-[10px] text-gray-400">Responsável Legal</span>
            </div>
            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut size={13} /> Sair
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
            <Loader2 size={32} className="animate-spin text-amber-500" />
            <p className="text-sm text-gray-500 font-medium">Carregando informações do aluno...</p>
          </div>
        ) : errorMsg ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-lg mx-auto">
            <AlertCircle size={32} className="text-red-500 mx-auto mb-3" />
            <p className="text-sm font-bold text-red-900 mb-1">{errorMsg}</p>
            <button
              onClick={carregarDados}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition-colors cursor-pointer"
            >
              Tentar novamente
            </button>
          </div>
        ) : alunos.length === 0 ? (
          <div className="bg-white border border-amber-100 rounded-3xl p-10 text-center max-w-xl mx-auto shadow-sm">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200">
              <User size={28} className="text-amber-600" />
            </div>
            <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl text-gray-900 mb-2">
              Nenhuma matrícula ativa localizada
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              Não encontramos alunos ativos vinculados ao e-mail <strong>{userEmail}</strong>. Se você realizou a inscrição recentemente, sua solicitação pode estar na fila de espera prioritária aguardando abertura de vaga.
            </p>
            <div className="bg-amber-50/60 border border-amber-200/60 rounded-2xl p-4 text-xs text-amber-900 text-left">
              💡 <strong>Importante:</strong> Assim que uma vaga for liberada pela secretaria de cultura, você receberá a confirmação por e-mail e os dados de frequência passarão a ser exibidos aqui.
            </div>
          </div>
        ) : (
          <div>
            {/* Seletor de aluno caso o responsável tenha mais de um filho matriculado */}
            {alunos.length > 1 && (
              <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2">
                <span className="text-xs font-bold text-gray-500 mr-2">Aluno:</span>
                {alunos.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAlunoId(a.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedAlunoId === a.id
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-white border border-gray-200 text-gray-700 hover:border-amber-300'
                    }`}
                  >
                    {a.aluno_nome}
                  </button>
                ))}
              </div>
            )}

            {/* Cabeçalho do Aluno e Turma */}
            <div className="bg-white border border-amber-100 rounded-3xl p-6 sm:p-8 shadow-sm mb-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-black text-xl shadow-md shrink-0">
                    {alunoSelecionado.aluno_nome.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl sm:text-2xl text-gray-900">
                        {alunoSelecionado.aluno_nome}
                      </h1>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-800 border border-green-200">
                        Matriculado(a)
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                      <User size={12} className="text-gray-400" />
                      Responsável: <strong className="text-gray-700">{alunoSelecionado.resp_nome}</strong>
                    </p>
                  </div>
                </div>

                {alunoSelecionado.turma && (
                  <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 md:text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider block mb-1">
                      Turma de Desenho
                    </span>
                    <p className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-sm text-gray-900 flex md:justify-end items-center gap-1.5">
                      <BookOpen size={14} className="text-amber-600" />
                      {alunoSelecionado.turma.nome}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5 flex md:justify-end items-center gap-1">
                      <Clock size={12} className="text-amber-600" />
                      {alunoSelecionado.turma.turno}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Painel de Métricas de Frequência */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {/* Presenças */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-gray-500">Presenças</span>
                  <div className="w-8 h-8 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                    <CheckCircle size={18} />
                  </div>
                </div>
                <p className="text-2xl font-black text-gray-900">{alunoSelecionado.stats.presencas}</p>
                <p className="text-[11px] text-green-700 mt-1 font-medium">aulas frequentadas</p>
              </div>

              {/* Faltas */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-gray-500">Faltas Não Justificadas</span>
                  <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                    <XCircle size={18} />
                  </div>
                </div>
                <p className="text-2xl font-black text-gray-900">{alunoSelecionado.stats.faltas}</p>
                <p className="text-[11px] text-red-600 mt-1 font-medium">ausências registradas</p>
              </div>

              {/* Justificadas */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-gray-500">Faltas Justificadas</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Calendar size={18} />
                  </div>
                </div>
                <p className="text-2xl font-black text-gray-900">{alunoSelecionado.stats.justificadas}</p>
                <p className="text-[11px] text-amber-700 mt-1 font-medium">com justificativa aceita</p>
              </div>

              {/* Taxa de Frequência */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-gray-500">Taxa de Frequência</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <TrendingUp size={18} />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-black text-gray-900">
                    {alunoSelecionado.stats.frequenciaPercentual}%
                  </p>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      alunoSelecionado.stats.frequenciaPercentual >= 75
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {alunoSelecionado.stats.frequenciaPercentual >= 75 ? 'Regular' : 'Atenção'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">mínimo exigido: 75%</p>
              </div>
            </div>

            {/* Alerta de Risco se frequência estiver baixa ou com muitas faltas */}
            {alunoSelecionado.stats.frequenciaPercentual < 75 && alunoSelecionado.stats.totalAulas > 0 && (
              <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-900">
                <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <p className="font-bold text-sm text-red-950 mb-0.5">Alerta de Frequência Insuficiente</p>
                  A frequência atual do aluno está abaixo do mínimo exigido de 75%. Alunos com 3 ou mais faltas consecutivas sem justificativa podem ter sua matrícula transferida para candidatos da fila de espera. Por favor, regularize as presenças ou entre em contato com a secretaria.
                </div>
              </div>
            )}

            {/* Tabela de Histórico de Chamadas */}
            <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-lg text-gray-900">
                    Histórico de Chamadas e Faltas
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Registro individual de cada aula realizada pela turma
                  </p>
                </div>
                <div className="text-xs text-gray-500 font-medium">
                  Total de aulas registradas: <strong>{alunoSelecionado.stats.totalAulas}</strong>
                </div>
              </div>

              {alunoSelecionado.historico.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-gray-200 rounded-2xl">
                  <Calendar size={32} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-700">Nenhuma chamada registrada até o momento</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Os registros aparecerão aqui à medida que o(a) professor(a) lançar a frequência das aulas.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        <th className="pb-3 px-4">Data da Aula</th>
                        <th className="pb-3 px-4">Situação</th>
                        <th className="pb-3 px-4">Justificativa / Observação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-sm">
                      {alunoSelecionado.historico.map((registro) => {
                        const dateFormatted = registro.data
                          ? registro.data.split('-').reverse().join('/')
                          : 'Data não informada';

                        return (
                          <tr key={registro.id || registro.data} className="hover:bg-amber-50/30 transition-colors">
                            <td className="py-3.5 px-4 font-semibold text-gray-800 text-xs sm:text-sm">
                              {dateFormatted}
                            </td>
                            <td className="py-3.5 px-4">
                              {registro.status === 'PRESENTE' && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                                  <CheckCircle size={12} /> Presente
                                </span>
                              )}
                              {registro.status === 'FALTA' && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                                  <XCircle size={12} /> Falta
                                </span>
                              )}
                              {registro.status === 'JUSTIFICADA' && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  <Clock size={12} /> Falta Justificada
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-xs text-gray-600">
                              {registro.justificativa ? (
                                <span className="italic">{registro.justificativa}</span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Informações e Contato com a Secretaria */}
            <div className="bg-linear-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-base text-gray-900 mb-1 flex items-center gap-2">
                  <Award size={18} className="text-amber-600" />
                  Regulamento Escolar CDE Odessa Macedo
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed max-w-2xl">
                  A frequência mínima obrigatória é de 75%. Em casos de atestados médicos ou imprevistos, as faltas devem ser comunicadas e justificadas junto à coordenação pedagógica da Secretaria de Cultura.
                </p>
              </div>

              <a
                href="https://wa.me/5553999990000"
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2.5 rounded-xl bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <Phone size={14} /> Contatar Secretaria
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
