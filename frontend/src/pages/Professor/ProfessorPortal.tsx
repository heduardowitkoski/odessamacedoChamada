import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Pencil,
  LogOut,
  CheckSquare,
  Users,
  Sparkles,
  Check,
  Phone,
  Save,
  Loader2,
  FileText,
  ListOrdered,
  UserCheck,
  Mail,
  CheckCircle,
  Copy,
  Menu,
  X,
  Settings,
  HelpCircle,
  Bell,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import MuralBoard from '../../components/mural/MuralBoard';
import { getCurrentUser, saveUserSession, clearUserSession, type UserProfile } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { getApiBase } from '../../lib/api';
import StudentHistoryModal from '../../components/ui/StudentHistoryModal';
import { fetchMural, type MuralItem } from '../../lib/muralService';

const API_BASE = getApiBase();

interface AlunoChamada {
  aluno_id: string;
  aluno_nome: string;
  resp_nome: string;
  resp_telefone: string;
  status: 'PRESENTE' | 'FALTA' | 'JUSTIFICADA';
  observacao: string;
}

export default function ProfessorPortal() {
  const [activeTab, setActiveTab] = useState<'frequencia' | 'mural' | 'alunos' | 'fila' | 'configuracoes'>('frequencia');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>('');
  const [selectedData, setSelectedData] = useState<string>(new Date().toISOString().split('T')[0]);
  const [alunosLista, setAlunosLista] = useState<AlunoChamada[]>([]);
  const [filaEspera, setFilaEspera] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingFreq, setSavingFreq] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [editandoChamada, setEditandoChamada] = useState(false);

  // Estados para chamada de aluno da fila de espera pelo professor
  const [alunoParaChamar, setAlunoParaChamar] = useState<any | null>(null);
  const [turmaDestinoChamar, setTurmaDestinoChamar] = useState<string>('');
  const [chamandoAluno, setChamandoAluno] = useState(false);
  const [resultadoChamada, setResultadoChamada] = useState<{ aluno: any; action_link: string | null; email_enviado: boolean } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Estados para Sino de Notificações
  const [showNotifications, setShowNotifications] = useState(false);
  const [alertasFaltas, setAlertasFaltas] = useState<any[]>([]);
  const [muralItemsNotif, setMuralItemsNotif] = useState<MuralItem[]>([]);

  // Estados para Meus Dados / Configurações do Professor
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getCurrentUser());
  const [profForm, setProfForm] = useState({
    name: currentUser?.name || 'Prof. Henrique Storniolo Rossal',
    email: currentUser?.email || 'professor@odessamacedo.com.br',
    cargo: currentUser?.cargo || 'Professor de Artes Visuais e Desenho',
  });
  const [salvandoProf, setSalvandoProf] = useState(false);
  const [sucessoProf, setSucessoProf] = useState(false);

  const handleSalvarMeusDados = (e: React.FormEvent) => {
    e.preventDefault();
    setSalvandoProf(true);
    try {
      const atual = getCurrentUser();
      const updated: UserProfile = {
        id: atual?.id || 'usr-prof-henrique',
        role: 'professor',
        name: profForm.name.trim(),
        email: profForm.email.trim(),
        cargo: profForm.cargo.trim(),
        avatarUrl: atual?.avatarUrl,
      };
      saveUserSession(updated);
      setCurrentUser(updated);
      setSucessoProf(true);
      setTimeout(() => setSucessoProf(false), 4000);
      alert('Seus dados foram atualizados com sucesso!');
    } catch {
      alert('Erro ao salvar seus dados.');
    } finally {
      setSalvandoProf(false);
    }
  };

  const navigate = useNavigate();

  useEffect(() => {
    carregarTurmas();
    carregarFilaEspera();
    carregarNotificacoes();
  }, []);

  const carregarNotificacoes = async () => {
    try {
      const res = await fetch(`${API_BASE}/frequencias/alertas`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setAlertasFaltas(data);
      }
    } catch (e) {
      console.warn('Erro ao carregar alertas de falta:', e);
    }

    try {
      const mural = await fetchMural();
      if (Array.isArray(mural)) setMuralItemsNotif(mural);
    } catch (e) {
      console.warn('Erro ao carregar mural para notificações:', e);
    }
  };

  const carregarFilaEspera = async () => {
    let fila: any[] = [];
    try {
      const res = await fetch(`${API_BASE}/alunos`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          fila = data.filter((a: any) => a.status === 'Fila' || a.status === 'aguardando');
        }
      }
    } catch {}

    // Fallback/complemento direto ao Supabase
    try {
      const { data: supaFila, error } = await supabase
        .from('lista_espera')
        .select('*, turmas(*)')
        .or('status.eq.aguardando,status.is.null')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(supaFila)) {
        const ids = new Set(fila.map((f) => f.id));
        for (const item of supaFila) {
          if (!ids.has(item.id)) {
            fila.push({
              ...item,
              aluno_nome: item.aluno_nome || item.nome_aluno || 'Aluno',
              resp_nome: item.resp_nome || item.nome_responsavel || 'Responsável',
              resp_telefone: item.resp_telefone || item.telefone_responsavel || '—',
              resp_email: item.resp_email || item.email_responsavel || '',
              aluno_nascimento: item.aluno_nascimento || item.data_nascimento || '',
              status: 'Fila',
            });
            ids.add(item.id);
          }
        }
      }
    } catch (e) {
      console.warn('Aviso ao consultar Supabase lista_espera:', e);
    }

    setFilaEspera(fila);
  };

  const handleOpenChamarModal = (aluno: any) => {
    setAlunoParaChamar(aluno);
    setTurmaDestinoChamar(aluno.turma_id || (turmas.length > 0 ? turmas[0].id : ''));
    setResultadoChamada(null);
    setCopiedLink(false);
  };

  const handleConfirmChamar = async () => {
    if (!alunoParaChamar) return;
    setChamandoAluno(true);
    try {
      const res = await fetch(`${API_BASE}/alunos/${alunoParaChamar.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Ativo',
          turma_id: turmaDestinoChamar || alunoParaChamar.turma_id,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        // Garante exclusão imediata da tabela lista_espera no Supabase
        try {
          await supabase.from('lista_espera').delete().eq('id', alunoParaChamar.id);
        } catch {}

        await carregarFilaEspera();
        await carregarTurmas();
        if (selectedTurmaId) {
          await carregarChamada(selectedTurmaId, selectedData);
        }
        setResultadoChamada({
          aluno: data.aluno || alunoParaChamar,
          action_link: data.action_link || null,
          email_enviado: !!data.email_enviado,
        });
        setAlunoParaChamar(null);
      } else {
        alert('Erro ao autorizar aluno: ' + (data.message || 'Erro desconhecido'));
      }
    } catch (e) {
      alert('Erro de conexão ao chamar aluno.');
    } finally {
      setChamandoAluno(false);
    }
  };

  useEffect(() => {
    if (selectedTurmaId) {
      carregarChamada(selectedTurmaId, selectedData);
    }
  }, [selectedTurmaId, selectedData]);

  const carregarTurmas = async () => {
    try {
      const res = await fetch(`${API_BASE}/turmas`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setTurmas(data);
          setSelectedTurmaId(data[0].id);
          return;
        }
      }
    } catch {}

    // Fallback com turmas padrão
    const defaultTurmas = [
      { id: 'infantil-a', nome: 'Turma Infantil A', turno: 'Terça · 14h às 15h', capacidade: 15 },
      { id: 'juvenil-a', nome: 'Turma Juvenil A', turno: 'Quinta · 14h às 15h30', capacidade: 12 },
    ];
    setTurmas(defaultTurmas);
    setSelectedTurmaId(defaultTurmas[0].id);
  };

  const carregarChamada = async (turmaId: string, dataStr: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/frequencias/turma/${turmaId}?data=${dataStr}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setAlunosLista(
            data.map((item: any) => ({
              aluno_id: item.id || item.aluno_id,
              aluno_nome: item.aluno_nome || item.resp_nome || 'Aluno',
              resp_nome: item.resp_nome || '—',
              resp_telefone: item.resp_telefone || '—',
              status: item.frequencia?.status || 'PRESENTE',
              observacao: item.frequencia?.observacao || '',
            }))
          );
          setLoading(false);
          return;
        }
      }
    } catch {}

    // Fallback de alunos da turma
    setAlunosLista([
      { aluno_id: 'a1', aluno_nome: 'Ana Beatriz Souza', resp_nome: 'Maria Souza', resp_telefone: '(53) 99801-2345', status: 'PRESENTE', observacao: '' },
      { aluno_id: 'a2', aluno_nome: 'Lucas Ferreira', resp_nome: 'João Ferreira', resp_telefone: '(53) 99812-3456', status: 'PRESENTE', observacao: '' },
      { aluno_id: 'a3', aluno_nome: 'Sofia Ribeiro', resp_nome: 'Carla Ribeiro', resp_telefone: '(53) 99823-4567', status: 'PRESENTE', observacao: '' },
      { aluno_id: 'a4', aluno_nome: 'Pedro Alves', resp_nome: 'Roberto Alves', resp_telefone: '(53) 99834-5678', status: 'PRESENTE', observacao: '' },
    ]);
    setLoading(false);
  };

  const handleStatusChange = (alunoId: string, novoStatus: 'PRESENTE' | 'FALTA' | 'JUSTIFICADA') => {
    setAlunosLista((prev) =>
      prev.map((a) => (a.aluno_id === alunoId ? { ...a, status: novoStatus } : a))
    );
  };

  const handleObsChange = (alunoId: string, obs: string) => {
    setAlunosLista((prev) =>
      prev.map((a) => (a.aluno_id === alunoId ? { ...a, observacao: obs } : a))
    );
  };

  const handleMarcarTodosPresentes = () => {
    setAlunosLista((prev) => prev.map((a) => ({ ...a, status: 'PRESENTE' })));
  };

  const handleSalvarChamada = async () => {
    setSavingFreq(true);
    setSaveSuccess(false);

    try {
      const res = await fetch(`${API_BASE}/frequencias/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turma_id: selectedTurmaId,
          data: selectedData,
          registros: alunosLista.map((a) => ({
            aluno_id: a.aluno_id,
            status: a.status,
            observacao: a.observacao,
          })),
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setEditandoChamada(false);
        setTimeout(() => setSaveSuccess(false), 4000);
        carregarChamada(selectedTurmaId, selectedData);
      } else {
        const err = await res.json().catch(() => ({}));
        alert('Erro ao salvar chamada: ' + (err.message || 'Tente novamente.'));
      }
    } catch {
      alert('Erro de conexão ao salvar chamada. Verifique sua conexão com a internet.');
    } finally {
      setSavingFreq(false);
    }
  };

  const handleLogout = async () => {
    clearUserSession();
    await supabase.auth.signOut().catch(() => {});
    navigate('/login');
  };

  const turmaAtual = turmas.find((t) => t.id === selectedTurmaId);

  return (
    <div className="min-h-screen bg-[#FAFAF7] font-['Inter',sans-serif]">
      {/* Header do Diário do Professor */}
      <header className="bg-white border-b border-amber-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="p-2 -ml-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
              title={sidebarOpen ? "Recolher menu lateral" : "Expandir menu lateral"}
            >
              <Menu size={22} />
            </button>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
              <Pencil size={16} className="text-white" />
            </div>
            <div>
              <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[#1C1300] text-sm block">
                CDE Odessa Macedo · Diário do Professor
              </span>
              <span className="text-blue-600 text-xs font-semibold">
                {currentUser?.name || 'Prof. Carlos Eduardo'} · Artes Visuais & Desenho
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/mural"
              className="px-3.5 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Sparkles size={14} className="text-amber-500" />
              Ver Mural Geral
            </Link>

            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(prev => !prev);
                  carregarNotificacoes();
                }}
                className={`relative p-2 rounded-xl transition-colors cursor-pointer ${
                  showNotifications ? 'bg-blue-100 text-blue-800' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                }`}
                title="Notificações e Alertas"
              >
                <Bell size={18} />
                {(alertasFaltas.length > 0 || muralItemsNotif.length > 0) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                )}
              </button>

              {showNotifications && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowNotifications(false)}
                  />
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-blue-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell size={16} className="text-blue-600" />
                        <h4 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-sm text-[#1C1300]">
                          Notificações do Professor
                        </h4>
                      </div>
                      <span className="text-[11px] font-bold bg-blue-200/80 text-blue-900 px-2 py-0.5 rounded-full">
                        {alertasFaltas.length + Math.min(muralItemsNotif.length, 3)} novos
                      </span>
                    </div>

                    <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
                      {alertasFaltas.length > 0 && (
                        <div className="p-3 bg-red-50/50">
                          <p className="text-[11px] font-bold text-red-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <AlertTriangle size={13} className="text-red-500" /> Alunos com Faltas Excessivas
                          </p>
                          <div className="space-y-2">
                            {alertasFaltas.slice(0, 5).map(({ aluno, faltasConsecutivas, ultimaFalta }) => (
                              <div
                                key={aluno.id}
                                onClick={() => {
                                  setActiveTab('frequencia');
                                  setShowNotifications(false);
                                }}
                                className="p-2.5 bg-white rounded-xl border border-red-100 shadow-2xs hover:bg-red-50/80 transition-colors cursor-pointer"
                              >
                                <div className="flex justify-between items-start">
                                  <p className="text-xs font-bold text-gray-900">{aluno.aluno_nome}</p>
                                  <span className="text-[10px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded-md">
                                    {faltasConsecutivas} faltas seguidas
                                  </span>
                                </div>
                                <p className="text-[11px] text-gray-500 mt-0.5">{aluno.turmas?.nome || 'Turma'}</p>
                                {ultimaFalta && (
                                  <p className="text-[10px] text-gray-400 mt-1">Última falta: {ultimaFalta}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {muralItemsNotif.length > 0 && (
                        <div className="p-3">
                          <p className="text-[11px] font-bold text-blue-800 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <Sparkles size={13} className="text-blue-500" /> Obras no Mural
                          </p>
                          <div className="space-y-2">
                            {muralItemsNotif.slice(0, 3).map((item) => (
                              <div
                                key={item.id}
                                onClick={() => {
                                  setActiveTab('mural');
                                  setShowNotifications(false);
                                }}
                                className="p-2.5 bg-gray-50 hover:bg-blue-50/70 rounded-xl border border-gray-100 transition-colors cursor-pointer flex gap-2.5 items-start"
                              >
                                {item.imagens && item.imagens.length > 0 && (
                                  <img
                                    src={item.imagens[0]}
                                    alt=""
                                    className="w-10 h-10 rounded-lg object-cover border border-blue-200 shrink-0"
                                  />
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold text-gray-900 truncate">{item.titulo}</p>
                                  <p className="text-[10px] text-blue-700 font-medium">{item.turma_nome || 'Turma Geral'}</p>
                                  <p className="text-[10px] text-gray-400">Por {item.autor_nome}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {alertasFaltas.length === 0 && muralItemsNotif.length === 0 && (
                        <div className="p-6 text-center text-gray-400">
                          <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-2" />
                          <p className="text-xs font-semibold text-gray-700">Nenhuma pendência!</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">Chamadas e alunos em dia.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <Link
              to="/"
              className="hidden sm:inline-flex px-3.5 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 border border-gray-200 rounded-xl transition-colors"
            >
              Portal Público
            </Link>

            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
              title="Encerrar Sessão"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Menu Lateral Retrátil (Sidebar Drawer) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-72 bg-[#1C1300] text-white z-50 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-amber-900/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
              <Pencil size={15} className="text-white" />
            </div>
            <div>
              <p className="text-white text-xs font-bold leading-tight">Portal do Professor</p>
              <p className="text-amber-400/70 text-[10px]">CDE Odessa Macedo</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 text-amber-400/70 hover:text-white hover:bg-amber-900/40 rounded-lg transition-colors cursor-pointer"
            title="Fechar menu lateral"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-amber-400/60">
            Navegação
          </p>
          <button
            onClick={() => {
              setActiveTab('frequencia');
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'frequencia'
                ? 'bg-blue-600 text-white'
                : 'text-amber-200/80 hover:bg-amber-900/40 hover:text-white'
            }`}
          >
            <CheckSquare size={16} />
            <span>Diário de Chamada</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('mural');
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'mural'
                ? 'bg-blue-600 text-white'
                : 'text-amber-200/80 hover:bg-amber-900/40 hover:text-white'
            }`}
          >
            <Sparkles size={16} />
            <span>Mural de Obras & Criações</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('alunos');
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'alunos'
                ? 'bg-blue-600 text-white'
                : 'text-amber-200/80 hover:bg-amber-900/40 hover:text-white'
            }`}
          >
            <Users size={16} />
            <span>Meus Alunos & Contatos</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('fila');
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'fila'
                ? 'bg-blue-600 text-white'
                : 'text-amber-200/80 hover:bg-amber-900/40 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <ListOrdered size={16} />
              <span>Fila de Espera</span>
            </div>
            {filaEspera.length > 0 && (
              <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {filaEspera.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('configuracoes');
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'configuracoes'
                ? 'bg-blue-600 text-white'
                : 'text-amber-200/80 hover:bg-amber-900/40 hover:text-white'
            }`}
          >
            <Settings size={16} />
            <span>Configurações (Meus Dados)</span>
          </button>

          <p className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-amber-400/60">
            Atalhos Externos
          </p>
          <Link
            to="/mural"
            onClick={() => setSidebarOpen(false)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-amber-300/80 hover:bg-amber-900/40 hover:text-white transition-all"
          >
            <Sparkles size={14} className="text-amber-400" />
            <span>Ver Mural Geral</span>
          </Link>
          <Link
            to="/"
            onClick={() => setSidebarOpen(false)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-amber-300/80 hover:bg-amber-900/40 hover:text-white transition-all"
          >
            <Pencil size={14} className="text-amber-400" />
            <span>Portal Público</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-amber-900/40">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setActiveTab('configuracoes');
                setSidebarOpen(false);
              }}
              className="flex items-center gap-2.5 min-w-0 text-left group cursor-pointer"
              title="Editar meus dados"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 group-hover:bg-blue-500 transition-colors">
                {currentUser?.name ? currentUser.name.charAt(0) : 'P'}
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-semibold truncate group-hover:text-blue-300 transition-colors">{currentUser?.name || 'Professor'}</p>
                <p className="text-amber-400/70 text-[10px] truncate">{currentUser?.email || 'Professor'}</p>
              </div>
            </button>
            <button
              onClick={handleLogout}
              className="p-1.5 text-amber-400/70 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
              title="Encerrar Sessão"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Barra de Navegação Interna do Professor */}
      <div className="bg-white border-b border-gray-200/70">
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('frequencia')}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'frequencia'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <CheckSquare size={16} />
            Diário de Chamada (Frequência)
          </button>

          <button
            onClick={() => setActiveTab('mural')}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'mural'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Sparkles size={16} />
            Mural de Obras & Criações
          </button>

          <button
            onClick={() => setActiveTab('alunos')}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'alunos'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Users size={16} />
            Meus Alunos & Contatos
          </button>

          <button
            onClick={() => setActiveTab('fila')}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'fila'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <ListOrdered size={16} />
            Fila de Espera
            {filaEspera.length > 0 && (
              <span className="text-[10px] bg-orange-500 text-white font-bold px-1.5 py-0.5 rounded-full">
                {filaEspera.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('configuracoes')}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'configuracoes'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Settings size={16} />
            Configurações
          </button>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* ABA 1: DIÁRIO DE CHAMADA */}
        {activeTab === 'frequencia' && (
          <div className="space-y-6">
            {/* Card de Controle da Chamada */}
            <div className="bg-white rounded-3xl border border-amber-100 shadow-xs p-4 sm:p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-lg text-[#1C1300]">
                    Realizar Chamada de Aula
                  </h2>
                  <p className="text-gray-500 text-xs mt-0.5">
                    Selecione a turma e a data para registrar as presenças, faltas e justificativas dos alunos
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">Turma:</label>
                    <select
                      value={selectedTurmaId}
                      onChange={(e) => setSelectedTurmaId(e.target.value)}
                      className="bg-gray-50 border border-gray-200 text-xs font-semibold rounded-xl px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    >
                      {turmas.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nome} ({t.turno})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">Data da Aula:</label>
                    <input
                      type="date"
                      value={selectedData}
                      onChange={(e) => setSelectedData(e.target.value)}
                      className="bg-gray-50 border border-gray-200 text-xs font-semibold rounded-xl px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>

                    {editandoChamada && (
                      <div className="self-end">
                        <button
                          onClick={handleMarcarTodosPresentes}
                          className="px-3.5 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check size={14} /> Todos Presentes
                        </button>
                      </div>
                    )}
                </div>
              </div>

              {saveSuccess && (
                <div className="mt-4 p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200 flex items-center gap-2 animate-in fade-in">
                  <Check size={16} className="text-emerald-600" />
                  <span>Chamada registrada e sincronizada com sucesso!</span>
                </div>
              )}
            </div>

            {/* Lista dos Alunos para Chamada */}
            <div className="bg-white rounded-3xl border border-amber-100 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-sm text-[#1C1300]">
                    Lista de Presença · {turmaAtual?.nome || 'Turma Selecionada'}
                  </span>
                  <span className="text-xs text-gray-400">({alunosLista.length} alunos)</span>
                </div>

                  <div className="flex items-center gap-2">
                    {!editandoChamada ? (
                      <button
                        onClick={() => setEditandoChamada(true)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        <Pencil size={14} /> Editar Chamada
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditandoChamada(false);
                            carregarChamada(selectedTurmaId, selectedData);
                          }}
                          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleSalvarChamada}
                          disabled={savingFreq}
                          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        >
                          {savingFreq ? (
                            <>
                              <Loader2 size={14} className="animate-spin" /> Salvando...
                            </>
                          ) : (
                            <>
                              <Save size={14} /> Salvar Chamada
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>

              {loading ? (
                <div className="p-8 text-center text-xs text-gray-400">Carregando chamada...</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {alunosLista.map((aluno, idx) => (
                    <div key={aluno.aluno_id || idx} className="p-4 hover:bg-gray-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div
                        onClick={() => setSelectedStudentId(aluno.aluno_id)}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs group-hover:bg-blue-200 transition-colors">
                          {aluno.aluno_nome?.charAt(0) || 'A'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                            {aluno.aluno_nome}
                            <span className="text-[10px] text-blue-500 font-normal underline">ver faltas</span>
                          </p>
                          <p className="text-[11px] text-gray-500">
                            Resp: {aluno.resp_nome} · Tel: {aluno.resp_telefone}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        {editandoChamada ? (
                          <>
                            {/* Status Buttons */}
                            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                              <button
                                type="button"
                                onClick={() => handleStatusChange(aluno.aluno_id, 'PRESENTE')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  aluno.status === 'PRESENTE'
                                    ? 'bg-emerald-500 text-white shadow-xs'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                              >
                                Presente
                              </button>

                              <button
                                type="button"
                                onClick={() => handleStatusChange(aluno.aluno_id, 'FALTA')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  aluno.status === 'FALTA'
                                    ? 'bg-red-500 text-white shadow-xs'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                              >
                                Falta
                              </button>

                              <button
                                type="button"
                                onClick={() => handleStatusChange(aluno.aluno_id, 'JUSTIFICADA')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  aluno.status === 'JUSTIFICADA'
                                    ? 'bg-amber-500 text-white shadow-xs'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                              >
                                Justificada
                              </button>
                            </div>

                            {/* Campo de Observação */}
                            <input
                              type="text"
                              placeholder="Observação da aula..."
                              value={aluno.observacao}
                              onChange={(e) => handleObsChange(aluno.aluno_id, e.target.value)}
                              className="h-9 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-300 w-full sm:w-56"
                            />
                          </>
                        ) : (
                          <>
                            {/* Status Visual (Modo Leitura) */}
                            <div className="flex items-center">
                              {aluno.status === 'PRESENTE' && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                  <Check size={12} /> Presente
                                </span>
                              )}
                              {aluno.status === 'FALTA' && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">
                                  <X size={12} /> Falta
                                </span>
                              )}
                              {aluno.status === 'JUSTIFICADA' && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                                  <HelpCircle size={12} /> Justificada
                                </span>
                              )}
                            </div>

                            {/* Observação (Modo Leitura) */}
                            <span className="text-xs text-gray-500 italic max-w-xs truncate">
                              {aluno.observacao || 'Sem observações'}
                            </span>
                          </>
                        )}

                        {/* Botão para abrir histórico de faltas */}
                        <button
                          type="button"
                          onClick={() => setSelectedStudentId(aluno.aluno_id)}
                          className="p-2 text-gray-400 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                          title="Ver todas as faltas e histórico do aluno"
                        >
                          <FileText size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA 2: MURAL DE TAREFAS E COISAS FEITAS */}
        {activeTab === 'mural' && (
          <div className="bg-transparent">
            <MuralBoard embedded={true} allowPublish={true} />
          </div>
        )}

        {/* ABA 3: MEUS ALUNOS */}
        {activeTab === 'alunos' && (
          <div className="bg-white rounded-3xl border border-amber-100 shadow-xs p-6">
            <div className="mb-6">
              <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-lg text-[#1C1300]">
                Relação de Alunos Matriculados
              </h2>
              <p className="text-gray-500 text-xs mt-0.5">
                Consulte os dados dos estudantes, contatos dos responsáveis e histórico individual de faltas
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {alunosLista.map((aluno, i) => (
                <div key={i} className="p-4 rounded-2xl border border-gray-100 bg-[#FAFAF7] hover:bg-white hover:border-blue-200 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                        {aluno.aluno_nome?.charAt(0) || 'A'}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-900">{aluno.aluno_nome}</h4>
                        <p className="text-[11px] text-gray-500">{turmaAtual?.nome || 'Turma Ativa'}</p>
                      </div>
                    </div>

                    <div className="text-xs space-y-1.5 pt-2 border-t border-gray-200/60">
                      <div className="flex items-center justify-between text-gray-600">
                        <span className="text-gray-400">Responsável:</span>
                        <span className="font-medium text-gray-800">{aluno.resp_nome}</span>
                      </div>
                      <div className="flex items-center justify-between text-gray-600">
                        <span className="text-gray-400">Telefone:</span>
                        <a href={`https://wa.me/55${aluno.resp_telefone?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="font-medium text-blue-600 hover:underline flex items-center gap-1">
                          <Phone size={11} /> {aluno.resp_telefone}
                        </a>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedStudentId(aluno.aluno_id)}
                    className="w-full mt-4 py-2 px-3 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/60 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FileText size={13} /> Ver Faltas & Histórico
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* ABA 4: FILA DE ESPERA (AUTORIZAÇÃO DE INSCRIÇÕES) */}
        {activeTab === 'fila' && (
          <div className="bg-white rounded-3xl border border-amber-100 shadow-xs p-6">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-lg text-[#1C1300] flex items-center gap-2">
                  <ListOrdered size={20} className="text-orange-500" />
                  Inscrições na Fila de Espera
                </h2>
                <p className="text-gray-500 text-xs mt-0.5">
                  Alunos que se inscreveram e aguardam autorização do professor ou administração para entrar na turma
                </p>
              </div>
              <span className="text-xs font-bold text-orange-700 bg-orange-100 px-3 py-1.5 rounded-xl self-start sm:self-auto">
                {filaEspera.length} {filaEspera.length === 1 ? 'aluno aguardando' : 'alunos aguardando'}
              </span>
            </div>

            {filaEspera.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-gray-200 rounded-2xl">
                <p className="text-sm text-gray-500">Nenhum aluno aguardando na fila de espera no momento.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-100 rounded-2xl">
                <table className="w-full text-left text-xs text-gray-600">
                  <thead className="bg-[#FAF8F5] text-gray-800 text-[11px] font-bold uppercase tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3.5">Aluno</th>
                      <th className="px-4 py-3.5">Nascimento</th>
                      <th className="px-4 py-3.5">Responsável / Parentesco</th>
                      <th className="px-4 py-3.5">Contato</th>
                      <th className="px-4 py-3.5">Turma Pretendida</th>
                      <th className="px-4 py-3.5 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filaEspera.map((item) => {
                      const turmaPretendida = turmas.find((t) => t.id === item.turma_id) || item.turmas;
                      return (
                        <tr key={item.id} className="hover:bg-amber-50/30 transition-colors">
                          <td className="px-4 py-3 font-bold text-gray-900">
                            {item.aluno_nome || item.nome_aluno || 'Aluno'}
                          </td>
                          <td className="px-4 py-3">
                            {(() => {
                              const val = item.aluno_nascimento || item.data_nascimento;
                              if (!val) return '—';
                              return val.includes('-') ? val.split('T')[0].split('-').reverse().join('/') : val;
                            })()}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-gray-800">
                              {item.resp_nome || item.nome_responsavel || '—'}
                            </span>
                            {item.resp_parentesco && (
                              <span className="text-gray-400 block text-[10px]">
                                ({item.resp_parentesco})
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <a
                              href={`https://wa.me/55${(item.resp_telefone || item.telefone_responsavel || '').replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
                            >
                              <Phone size={12} />
                              {item.resp_telefone || item.telefone_responsavel || '—'}
                            </a>
                            {(item.resp_email || item.email_responsavel) && (
                              <span className="text-gray-400 block text-[10px] truncate max-w-[160px]">
                                {item.resp_email || item.email_responsavel}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-block px-2 py-0.5 rounded-lg bg-gray-100 text-gray-700 text-[11px] font-medium">
                              {turmaPretendida?.nome || 'Geral'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleOpenChamarModal(item)}
                              className="px-3.5 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5 ml-auto cursor-pointer"
                            >
                              <UserCheck size={14} />
                              Autorizar & Chamar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ABA 5: CONFIGURAÇÕES - EDITAR MEUS DADOS */}
        {activeTab === 'configuracoes' && (
          <div className="max-w-3xl space-y-6">
            <div className="bg-white rounded-3xl border border-blue-100 shadow-sm p-6 sm:p-8">
              <div className="flex items-center gap-4 pb-6 border-b border-gray-100 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-md">
                  {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'P'}
                </div>
                <div>
                  <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl text-[#1C1300]">
                    Configurações do Professor · Meus Dados
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Atualize suas informações pessoais e perfil docente no sistema
                  </p>
                </div>
              </div>

              {sucessoProf && (
                <div className="mb-6 p-4 rounded-2xl bg-green-50 border border-green-200 flex items-center gap-3 text-green-800 text-xs font-semibold">
                  <CheckCircle className="text-green-600 shrink-0" size={18} />
                  <span>Seus dados foram atualizados com sucesso e salvos para esta sessão.</span>
                </div>
              )}

              <form onSubmit={handleSalvarMeusDados} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Nome Completo do Docente *
                    </label>
                    <input
                      type="text"
                      required
                      value={profForm.name}
                      onChange={(e) => setProfForm({ ...profForm, name: e.target.value })}
                      className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      E-mail Institucional *
                    </label>
                    <input
                      type="email"
                      required
                      value={profForm.email}
                      onChange={(e) => setProfForm({ ...profForm, email: e.target.value })}
                      className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Disciplina / Especialidade / Cargo
                  </label>
                  <input
                    type="text"
                    value={profForm.cargo}
                    onChange={(e) => setProfForm({ ...profForm, cargo: e.target.value })}
                    placeholder="Ex: Professor de Artes Visuais e Desenho"
                    className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                  <button
                    type="submit"
                    disabled={salvandoProf}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {salvandoProf ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <>
                        <Save size={15} />
                        <span>Salvar Meus Dados</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Modal: Confirmar Chamada e Autorização da Inscrição */}
      {alunoParaChamar && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-green-100 text-green-700 flex items-center justify-center">
                <UserCheck size={20} />
              </div>
              <div>
                <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-base text-gray-900">
                  Autorizar Inscrição e Matricular
                </h3>
                <p className="text-xs text-gray-500">
                  {alunoParaChamar.aluno_nome || alunoParaChamar.nome_aluno}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Confirmar Turma de Ingresso:
                </label>
                <select
                  value={turmaDestinoChamar}
                  onChange={(e) => setTurmaDestinoChamar(e.target.value)}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-green-400"
                >
                  {turmas.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome} ({t.turno}) — Vagas disponíveis: {t.capacidade}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3.5 bg-gray-50 border border-gray-200/80 rounded-xl text-xs text-gray-600 leading-relaxed space-y-1">
                <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                  <Mail size={13} className="text-amber-600" /> Ao autorizar este aluno:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-gray-600 text-[11px]">
                  <li>O aluno sairá da fila e entrará oficialmente na turma como <strong>Ativo</strong>.</li>
                  <li>Uma vaga será deduzida da turma selecionada.</li>
                  <li>O responsável receberá o e-mail de confirmação para acompanhar as chamadas.</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setAlunoParaChamar(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmChamar}
                  disabled={chamandoAluno}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {chamandoAluno ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Autorizando...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={14} /> Confirmar Matrícula
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Resultado da Autorização com Link de Acesso / WhatsApp */}
      {resultadoChamada && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-green-200">
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-green-100 text-green-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <CheckCircle size={30} />
              </div>
              <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-lg text-gray-900">
                Aluno Matriculado com Sucesso!
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                <strong>{resultadoChamada.aluno.aluno_nome}</strong> agora está oficialmente matriculado e ativo.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-green-50/80 border border-green-200 rounded-2xl text-xs text-green-900 flex items-start gap-2.5">
                <Mail size={16} className="text-green-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">E-mail transacional gerado com sucesso</p>
                  <p className="text-[11px] text-green-800 mt-0.5">
                    As instruções de acesso foram enviadas para <strong>{resultadoChamada.aluno.resp_email || "o e-mail informado"}</strong>.
                  </p>
                </div>
              </div>

              {resultadoChamada.action_link && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                      Link Direto de Ativação:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(resultadoChamada.action_link!);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 3000);
                      }}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Copy size={13} /> {copiedLink ? "Copiado!" : "Copiar Link"}
                    </button>
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={resultadoChamada.action_link}
                    className="w-full text-[11px] bg-white border border-gray-200 rounded-xl p-2 font-mono text-gray-600 select-all"
                  />
                </div>
              )}

              <div className="flex items-center justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setResultadoChamada(null)}
                  className="px-5 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Histórico Individual de Faltas */}
      {selectedStudentId && (
        <StudentHistoryModal
          alunoId={selectedStudentId}
          onClose={() => setSelectedStudentId(null)}
          onUpdate={() => {
            if (selectedTurmaId) carregarChamada(selectedTurmaId, selectedData);
          }}
        />
      )}
    </div>
  );
}
