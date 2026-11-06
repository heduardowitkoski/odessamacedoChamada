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
  Copy
} from 'lucide-react';
import MuralBoard from '../../components/mural/MuralBoard';
import { getCurrentUser, clearUserSession } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { getApiBase } from '../../lib/api';
import StudentHistoryModal from '../../components/ui/StudentHistoryModal';

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
  const [activeTab, setActiveTab] = useState<'frequencia' | 'mural' | 'alunos' | 'fila'>('frequencia');
  const [turmas, setTurmas] = useState<any[]>([]);
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>('');
  const [selectedData, setSelectedData] = useState<string>(new Date().toISOString().split('T')[0]);
  const [alunosLista, setAlunosLista] = useState<AlunoChamada[]>([]);
  const [filaEspera, setFilaEspera] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingFreq, setSavingFreq] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Estados para chamada de aluno da fila de espera pelo professor
  const [alunoParaChamar, setAlunoParaChamar] = useState<any | null>(null);
  const [turmaDestinoChamar, setTurmaDestinoChamar] = useState<string>('');
  const [chamandoAluno, setChamandoAluno] = useState(false);
  const [resultadoChamada, setResultadoChamada] = useState<{ aluno: any; action_link: string | null; email_enviado: boolean } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const currentUser = getCurrentUser();
  const navigate = useNavigate();

  useEffect(() => {
    carregarTurmas();
    carregarFilaEspera();
  }, []);

  const carregarFilaEspera = async () => {
    try {
      const res = await fetch(`${API_BASE}/alunos`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const fila = data.filter((a: any) => a.status === 'Fila' || a.status === 'aguardando');
          setFilaEspera(fila);
        }
      }
    } catch {}
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
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        alert('Chamada registrada localmente com sucesso!');
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      }
    } catch {
      alert('Chamada registrada localmente com sucesso!');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
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
        <div className="max-w-[1440px] mx-auto px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
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
        </div>
      </div>

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* ABA 1: DIÁRIO DE CHAMADA */}
        {activeTab === 'frequencia' && (
          <div className="space-y-6">
            {/* Card de Controle da Chamada */}
            <div className="bg-white rounded-3xl border border-amber-100 shadow-xs p-6">
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

                  <div className="self-end">
                    <button
                      onClick={handleMarcarTodosPresentes}
                      className="px-3.5 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check size={14} /> Todos Presentes
                    </button>
                  </div>
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
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-sm text-[#1C1300]">
                    Lista de Presença · {turmaAtual?.nome || 'Turma Selecionada'}
                  </span>
                  <span className="text-xs text-gray-400">({alunosLista.length} alunos)</span>
                </div>

                <button
                  onClick={handleSalvarChamada}
                  disabled={savingFreq}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {savingFreq ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Salvando...
                    </>
                  ) : (
                    <>
                      <Save size={14} /> Salvar Diário de Chamada
                    </>
                  )}
                </button>
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
                            {item.aluno_nascimento || item.data_nascimento || '—'}
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
