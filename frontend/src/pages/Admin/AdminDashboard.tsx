import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Home, Users, ListOrdered, BookOpen, BarChart2, Settings, UserCheck, Clock, Pencil, LogOut, Bell, Download, Plus, MoreHorizontal, UserX, RefreshCw, FileText, User, Phone, TrendingUp, CheckSquare, AlertTriangle, Calendar, Save, Check, X, HelpCircle
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Avatar } from "../../components/ui/Avatar";
import { Badge } from "../../components/ui/Badge";
import { supabase } from "../../lib/supabase";

const API_BASE = import.meta.env.VITE_API_URL || "https://odessamacedochamada.onrender.com";

export default function AdminDashboard() {
  const [alunosDb, setAlunosDb] = useState<any[]>([]);
  const [turmasDb, setTurmasDb] = useState<any[]>([]);
  const [selectedAluno, setSelectedAluno] = useState<any>(null);
  const [activeMenu, setActiveMenu] = useState("Alunos");
  const [activeTab, setActiveTab] = useState<"alunos" | "fila">("alunos");

  // Estados para Módulo de Frequência
  const [selectedTurmaFreq, setSelectedTurmaFreq] = useState<string>("");
  const [selectedDataFreq, setSelectedDataFreq] = useState<string>(new Date().toISOString().split("T")[0]);
  const [listaFrequencia, setListaFrequencia] = useState<any[]>([]);
  const [alertasFaltas, setAlertasFaltas] = useState<any[]>([]);
  const [savingFreq, setSavingFreq] = useState<boolean>(false);

  const navigate = useNavigate();

  const fetchAlunos = () => {
    fetch(`${API_BASE}/alunos`)
      .then(res => res.json())
      .then(data => setAlunosDb(data))
      .catch(err => console.error(err));
  };

  const fetchTurmas = () => {
    fetch(`${API_BASE}/turmas`)
      .then(res => res.json())
      .then(data => {
        setTurmasDb(data);
        if (data && data.length > 0 && !selectedTurmaFreq) {
          setSelectedTurmaFreq(data[0].id);
        }
      })
      .catch(err => console.error(err));
  };

  const fetchAlertasFaltas = () => {
    fetch(`${API_BASE}/frequencias/alertas`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAlertasFaltas(data);
      })
      .catch(err => console.error(err));
  };

  const fetchFrequencia = (turmaId: string, dataStr: string) => {
    if (!turmaId) return;
    fetch(`${API_BASE}/frequencias/turma/${turmaId}?data=${dataStr}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setListaFrequencia(data.map((item: any) => ({
            aluno_id: item.id,
            aluno_nome: item.aluno_nome,
            resp_nome: item.resp_nome,
            resp_telefone: item.resp_telefone,
            status: item.frequencia?.status || "PRESENTE",
            observacao: item.frequencia?.observacao || "",
          })));
        }
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchAlunos();
    fetchTurmas();
    fetchAlertasFaltas();
  }, []);

  useEffect(() => {
    if (activeMenu === "Frequência" && selectedTurmaFreq && selectedDataFreq) {
      fetchFrequencia(selectedTurmaFreq, selectedDataFreq);
    }
  }, [activeMenu, selectedTurmaFreq, selectedDataFreq]);

  const alunosAtivos = alunosDb.filter(a => a.status === 'Ativo');
  const alunosFila = alunosDb.filter(a => a.status === 'Fila');
  
  const vagasAbertas = turmasDb.reduce((acc, curr) => acc + (curr.capacidade > 0 ? curr.capacidade : 0), 0);

  const generateChartData = (alunos: any[]) => {
    const turmasCount = alunos.reduce((acc: any, curr: any) => {
      const nome = curr.turmas?.nome || "Sem Turma";
      acc[nome] = (acc[nome] || 0) + 1;
      return acc;
    }, {});
  
    const colors = ["#EAB308", "#F97316", "#14B8A6", "#3B82F6", "#8B5CF6", "#22C55E"];
    
    return Object.keys(turmasCount).map((key, index) => ({
      name: key.replace("Turma ", ""),
      value: turmasCount[key],
      color: colors[index % colors.length]
    }));
  };

  const chartData = generateChartData(alunosAtivos);

  const handleCall = async (aluno: any) => {
    try {
      const res = await fetch(`${API_BASE}/alunos/${aluno.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Ativo", turma_id: aluno.turma_id })
      });
      if (res.ok) {
        alert("Aluno chamado com sucesso!");
        fetchAlunos();
        fetchTurmas();
        fetchAlertasFaltas();
      } else {
        const err = await res.json();
        alert("Erro ao chamar aluno: " + err.message);
      }
    } catch (e) {
      alert("Erro de conexão");
    }
  };

  const handleCancel = async (aluno: any) => {
    if(!window.confirm(`Deseja realmente cancelar a matrícula de ${aluno.aluno_nome}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/alunos/${aluno.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Inativo", turma_id: aluno.turma_id })
      });
      if (res.ok) {
        alert("Matrícula cancelada com sucesso!");
        setSelectedAluno(null);
        fetchAlunos();
        fetchTurmas();
        fetchAlertasFaltas();
      } else {
        const err = await res.json();
        alert("Erro ao cancelar: " + err.message);
      }
    } catch (e) {
      alert("Erro de conexão");
    }
  };

  // Funções da Chamada
  const handleStatusChange = (alunoId: string, newStatus: 'PRESENTE' | 'FALTA' | 'JUSTIFICADA') => {
    setListaFrequencia(prev => prev.map(item => item.aluno_id === alunoId ? { ...item, status: newStatus } : item));
  };

  const handleObservacaoChange = (alunoId: string, obs: string) => {
    setListaFrequencia(prev => prev.map(item => item.aluno_id === alunoId ? { ...item, observacao: obs } : item));
  };

  const handleMarcarTodosPresentes = () => {
    setListaFrequencia(prev => prev.map(item => ({ ...item, status: "PRESENTE" })));
  };

  const handleSalvarFrequencia = async () => {
    if (!selectedTurmaFreq) {
      alert("Selecione uma turma para salvar a chamada.");
      return;
    }
    setSavingFreq(true);
    try {
      const res = await fetch(`${API_BASE}/frequencias/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          turma_id: selectedTurmaFreq,
          data: selectedDataFreq,
          registros: listaFrequencia.map(item => ({
            aluno_id: item.aluno_id,
            status: item.status,
            observacao: item.observacao,
          })),
        }),
      });

      if (res.ok) {
        alert("Chamada salva com sucesso!");
        fetchAlertasFaltas();
      } else {
        const err = await res.json();
        alert("Erro ao salvar chamada: " + (err.message || "Erro desconhecido"));
      }
    } catch (e) {
      alert("Erro de conexão ao salvar chamada.");
    } finally {
      setSavingFreq(false);
    }
  };

  const menuItems = [
    { icon: <Home size={17} />, label: "Dashboard" },
    { icon: <Users size={17} />, label: "Alunos", badge: alunosAtivos.length },
    { icon: <ListOrdered size={17} />, label: "Fila de espera", badge: alunosFila.length },
    { 
      icon: <CheckSquare size={17} />, 
      label: "Frequência", 
      badge: alertasFaltas.length > 0 ? alertasFaltas.length : undefined, 
      badgeColor: "bg-red-500" 
    },
    { icon: <BookOpen size={17} />, label: "Turmas" },
    { icon: <BarChart2 size={17} />, label: "Relatórios" },
    { icon: <Settings size={17} />, label: "Configurações" },
  ];

  const stats = [
    { label: "Alunos matriculados", value: alunosAtivos.length, icon: <UserCheck size={20} />, color: "text-amber-600", bg: "bg-amber-100" },
    { label: "Na fila de espera", value: alunosFila.length, icon: <Clock size={20} />, color: "text-orange-600", bg: "bg-orange-100" },
    { label: "Alertas de faltas (3+)", value: alertasFaltas.length, icon: <AlertTriangle size={20} />, color: "text-red-600", bg: "bg-red-100" },
    { label: "Vagas abertas", value: vagasAbertas, icon: <Pencil size={20} />, color: "text-emerald-600", bg: "bg-emerald-100" },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAF7] font-['Inter',sans-serif] flex">
      {/* Sidebar */}
      <aside className="w-60 bg-[#1C1300] flex flex-col flex-shrink-0">
        <div className="h-16 flex items-center gap-3 px-5 border-b border-amber-900/40">
          <Link to="/" className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center hover:bg-amber-600">
            <Pencil size={13} className="text-white" />
          </Link>
          <div>
            <p className="text-white text-xs font-bold leading-tight">CDE Odessa Macedo</p>
            <p className="text-amber-400/70 text-[10px]">Painel administrativo</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 mt-2">
          {menuItems.map(({ icon, label, badge, badgeColor }) => (
            <button
              key={label}
              onClick={() => setActiveMenu(label)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeMenu === label
                  ? "bg-amber-500 text-white"
                  : "text-amber-300/80 hover:bg-amber-900/40 hover:text-white"
              }`}
            >
              {icon}
              <span className="flex-1 text-left">{label}</span>
              {badge !== undefined && (
                <span className={`text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${badgeColor || (label === "Fila de espera" ? "bg-orange-500" : "bg-amber-600")}`}>
                  {badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-amber-900/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-bold">SC</div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">Sec. de Cultura</p>
              <p className="text-amber-400/70 text-[10px]">Administrador</p>
            </div>
            <button 
              onClick={async () => {
                await supabase.auth.signOut();
                navigate('/login');
              }}
              className="text-amber-400/70 hover:text-white transition-colors"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-amber-100 h-16 flex items-center px-8 gap-4 flex-shrink-0 shadow-sm">
          <div className="flex-1">
            <h1 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[#1C1300] text-lg">
              {activeMenu === "Frequência" ? "Registro de Frequência e Chamada Diária" : "Gestão de Alunos · Aulas de Desenho"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100">
              <Bell size={20} />
              {alertasFaltas.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
              )}
            </button>
            <button className="flex items-center gap-2 text-sm text-gray-600 font-medium border border-gray-200 rounded-xl px-3 py-2 hover:bg-gray-50">
              <Download size={15} /> Exportar
            </button>
            <Link to="/inscrever" className="flex items-center gap-2 text-sm text-white bg-amber-500 font-medium rounded-xl px-3 py-2 hover:bg-amber-600 transition-colors">
              <Plus size={15} /> Nova inscrição
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-7">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-5 mb-7">
            {stats.map(({ label, value, icon, color, bg }) => (
              <div key={label} className="bg-white rounded-2xl p-5 border border-amber-50 shadow-sm flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center ${color}`}>{icon}</div>
                <div>
                  <p className="text-2xl font-['Plus_Jakarta_Sans',sans-serif] font-extrabold text-[#1C1300]">{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {activeMenu === "Frequência" ? (
            /* --- MÓDULO DE FREQUÊNCIA --- */
            <div className="space-y-6">
              {/* Alertas de Absenteísmo */}
              {alertasFaltas.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <AlertTriangle className="text-red-600" size={20} />
                    <h3 className="font-bold text-red-900 text-sm">
                      Alerta de Absenteísmo: {alertasFaltas.length} aluno(s) com 3 ou mais faltas consecutivas
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {alertasFaltas.map(({ aluno, faltasConsecutivas, ultimaFalta }) => (
                      <div key={aluno.id} className="bg-white rounded-xl p-4 border border-red-100 shadow-xs flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-1">
                            <p className="font-bold text-sm text-gray-900">{aluno.aluno_nome}</p>
                            <span className="bg-red-100 text-red-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                              {faltasConsecutivas} faltas seguidas
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mb-1">{aluno.turmas?.nome || "Sem Turma"}</p>
                          <p className="text-xs text-gray-600">
                            Resp: {aluno.resp_nome} ({aluno.resp_telefone})
                          </p>
                          {ultimaFalta && (
                            <p className="text-[11px] text-gray-400 mt-1">Última falta registrada: {ultimaFalta}</p>
                          )}
                        </div>
                        <div className="mt-3 pt-2 border-t border-gray-100 flex gap-2">
                          <a
                            href={`https://wa.me/55${aluno.resp_telefone?.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 text-center text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 py-1.5 rounded-lg font-semibold hover:bg-emerald-100 transition-colors"
                          >
                            Contatar Resp.
                          </a>
                          <button
                            onClick={() => handleCancel(aluno)}
                            className="flex-1 text-xs bg-red-50 text-red-700 border border-red-200 py-1.5 rounded-lg font-semibold hover:bg-red-100 transition-colors"
                          >
                            Inativar Vaga
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Formulário de Chamada */}
              <div className="bg-white rounded-2xl border border-amber-50 shadow-sm p-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
                  <div className="flex flex-wrap items-center gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Turma</label>
                      <select
                        value={selectedTurmaFreq}
                        onChange={(e) => setSelectedTurmaFreq(e.target.value)}
                        className="bg-gray-50 border border-gray-200 text-gray-800 text-sm font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        {turmasDb.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.nome} ({t.turno})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Data da Aula</label>
                      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                        <Calendar size={16} className="text-gray-400" />
                        <input
                          type="date"
                          value={selectedDataFreq}
                          onChange={(e) => setSelectedDataFreq(e.target.value)}
                          className="bg-transparent text-sm font-semibold text-gray-800 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleMarcarTodosPresentes}
                      className="text-xs text-amber-700 bg-amber-50 border border-amber-200 font-semibold px-3 py-2 rounded-xl hover:bg-amber-100 transition-colors flex items-center gap-1.5"
                    >
                      <Check size={14} /> Marcar Todos Presentes
                    </button>
                    <button
                      onClick={handleSalvarFrequencia}
                      disabled={savingFreq}
                      className="text-xs text-white bg-emerald-600 font-bold px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                    >
                      <Save size={14} /> {savingFreq ? "Salvando..." : "Salvar Chamada"}
                    </button>
                  </div>
                </div>

                {/* Tabela de Chamada */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-400">
                        <th className="px-4 py-3">Aluno</th>
                        <th className="px-4 py-3">Responsável / Telefone</th>
                        <th className="px-4 py-3 text-center">Status da Presença</th>
                        <th className="px-4 py-3">Observação / Justificativa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listaFrequencia.map((item) => (
                        <tr key={item.aluno_id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar alt={item.aluno_nome} size={32} />
                              <p className="font-semibold text-sm text-[#1C1300]">{item.aluno_nome}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            <p>{item.resp_nome}</p>
                            <p className="text-gray-400">{item.resp_telefone}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-center items-center gap-1.5">
                              <button
                                onClick={() => handleStatusChange(item.aluno_id, "PRESENTE")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                  item.status === "PRESENTE"
                                    ? "bg-emerald-600 text-white shadow-xs"
                                    : "bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"
                                }`}
                              >
                                <Check size={12} /> Presente
                              </button>

                              <button
                                onClick={() => handleStatusChange(item.aluno_id, "FALTA")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                  item.status === "FALTA"
                                    ? "bg-red-600 text-white shadow-xs"
                                    : "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-700"
                                }`}
                              >
                                <X size={12} /> Falta
                              </button>

                              <button
                                onClick={() => handleStatusChange(item.aluno_id, "JUSTIFICADA")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                  item.status === "JUSTIFICADA"
                                    ? "bg-amber-500 text-white shadow-xs"
                                    : "bg-gray-100 text-gray-600 hover:bg-amber-50 hover:text-amber-700"
                                }`}
                              >
                                <HelpCircle size={12} /> Justificada
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              placeholder="Ex: Atestado, motivo..."
                              value={item.observacao}
                              onChange={(e) => handleObservacaoChange(item.aluno_id, e.target.value)}
                              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 text-gray-700"
                            />
                          </td>
                        </tr>
                      ))}
                      {listaFrequencia.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-sm">
                            Nenhum aluno ativo matriculado nesta turma.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* --- DASHBOARD / VISÃO DE ALUNOS --- */
            <div className="flex gap-6">
              {/* Tabela principal */}
              <div className="flex-1 space-y-6">
                <div className="bg-white rounded-2xl border border-amber-50 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex gap-1">
                      {[
                        { id: "alunos" as const, label: "Alunos matriculados", count: alunosAtivos.length },
                        { id: "fila" as const, label: "Fila de espera", count: alunosFila.length },
                      ].map(({ id, label, count }) => (
                        <button
                          key={id}
                          onClick={() => setActiveTab(id)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                            activeTab === id ? "bg-amber-500 text-white" : "text-gray-500 hover:bg-gray-100"
                          }`}
                        >
                          {label}
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${activeTab === id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"}`}>
                            {count}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {activeTab === "alunos" ? (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100">
                          {["Aluno", "Turma", "Criado em", "Status", ""].map((h) => (
                            <th key={h} className="text-left text-xs font-semibold text-gray-400 px-6 py-3">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {alunosAtivos.map((a) => (
                          <tr
                            key={a.id}
                            onClick={() => setSelectedAluno(a)}
                            className={`border-b border-gray-50 cursor-pointer transition-colors ${selectedAluno?.id === a.id ? "bg-amber-50" : "hover:bg-gray-50"}`}
                          >
                            <td className="px-6 py-3">
                              <div className="flex items-center gap-3">
                                <Avatar alt={a.aluno_nome} size={34} />
                                <div>
                                  <p className="font-semibold text-sm text-[#1C1300]">{a.aluno_nome}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-3">
                              <Badge variant="amber">{a.turmas?.nome || "Sem Turma"}</Badge>
                            </td>
                            <td className="px-6 py-3 text-xs text-gray-500">{new Date(a.created_at).toLocaleDateString()}</td>
                            <td className="px-6 py-3">
                              <Badge variant={a.status === "Ativo" ? "green" : "gray"}>{a.status}</Badge>
                            </td>
                            <td className="px-6 py-3">
                              <button className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                                <MoreHorizontal size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {alunosAtivos.length === 0 && (
                          <tr>
                             <td colSpan={5} className="px-6 py-10 text-center text-gray-500">Nenhum aluno ativo encontrado.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100">
                          {["Nome", "Responsável", "Turma desejada", "Inscrito em", ""].map((h) => (
                            <th key={h} className="text-left text-xs font-semibold text-gray-400 px-6 py-3">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {alunosFila.map((f) => (
                          <tr key={f.id} className="border-b border-gray-50 hover:bg-amber-50/40 transition-colors">
                            <td className="px-6 py-3">
                              <p className="font-semibold text-sm text-[#1C1300]">{f.aluno_nome}</p>
                            </td>
                            <td className="px-6 py-3">
                              <p className="text-sm text-gray-600">{f.resp_nome}</p>
                              <p className="text-xs text-gray-400">{f.resp_telefone}</p>
                            </td>
                            <td className="px-6 py-3">
                              <Badge variant="gray">{f.turmas?.nome}</Badge>
                            </td>
                            <td className="px-6 py-3 text-xs text-gray-500">{new Date(f.created_at).toLocaleDateString()}</td>
                            <td className="px-6 py-3">
                              <button onClick={() => handleCall(f)} className="text-xs px-2.5 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg font-semibold hover:bg-amber-100 transition-colors flex items-center gap-1">
                                <UserCheck size={11} /> Chamar
                              </button>
                            </td>
                          </tr>
                        ))}
                        {alunosFila.length === 0 && (
                          <tr>
                             <td colSpan={5} className="px-6 py-10 text-center text-gray-500">Nenhum aluno na fila.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Gráfico */}
                <div className="bg-white rounded-2xl border border-amber-50 shadow-sm p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <TrendingUp size={17} className="text-amber-500" />
                    <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[#1C1300] text-base">Alunos por turma</h2>
                  </div>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={170}>
                      <BarChart data={chartData} barSize={32}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#FEF9EC" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ borderRadius: 12, border: "1px solid #FDE68A", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}
                          cursor={{ fill: "#FFFBEB" }}
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                          {chartData.map((entry: any) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[170px] flex items-center justify-center text-gray-400 text-sm">Nenhum dado para exibir</div>
                  )}
                </div>
              </div>

              {/* Ficha lateral */}
              <div className="w-72 flex-shrink-0">
                {selectedAluno ? (
                <div className="bg-white rounded-2xl border border-amber-50 shadow-sm overflow-hidden sticky top-0">
                  <div className="p-5 border-b border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Ficha do aluno</p>
                    <div className="flex items-center gap-3">
                      <Avatar alt={selectedAluno.aluno_nome} size={52} />
                      <div>
                        <p className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[#1C1300] text-sm leading-tight">{selectedAluno.aluno_nome}</p>
                        <Badge variant={selectedAluno.status === "Ativo" ? "green" : "gray"}>{selectedAluno.status}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-400 mb-2">Dados da matrícula</p>
                      {[
                        { label: "Turma", value: selectedAluno.turmas?.nome || "---" },
                        { label: "Matriculado em", value: new Date(selectedAluno.created_at).toLocaleDateString() },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between py-1.5 border-b border-gray-50">
                          <span className="text-xs text-gray-500">{label}</span>
                          <span className="text-xs font-semibold text-gray-800">{value}</span>
                        </div>
                      ))}
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-gray-400 mb-2">Responsável / Contato</p>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <User size={11} className="text-gray-400" />
                          {selectedAluno.resp_nome}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Phone size={11} className="text-gray-400" /> {selectedAluno.resp_telefone}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 pt-0 space-y-2">
                    <button className="w-full h-10 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 transition-colors flex items-center justify-center gap-2">
                      <FileText size={14} /> Ver ficha completa
                    </button>
                    <button className="w-full h-10 bg-blue-50 text-blue-700 border border-blue-200 text-sm font-bold rounded-xl hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 opacity-50 cursor-not-allowed" disabled>
                      <RefreshCw size={14} /> Transferir de turma
                    </button>
                    <button onClick={() => handleCancel(selectedAluno)} className="w-full h-10 bg-red-50 text-red-700 border border-red-200 text-sm font-bold rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                      <UserX size={14} /> Cancelar matrícula
                    </button>
                  </div>
                </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-amber-50 shadow-sm overflow-hidden sticky top-0 p-5 text-center text-gray-400 text-sm">
                    Selecione um aluno na tabela para ver a ficha completa.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
