import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Users, ListOrdered, BookOpen, BarChart2, Settings, UserCheck, Clock, Pencil, LogOut, Bell, Download, Plus, UserX, FileText, User, Phone, TrendingUp, CheckSquare, AlertTriangle, Calendar, Save, Check, X, HelpCircle, ShieldCheck, Mail, Copy, CheckCircle, Loader2, Trash2, Sparkles, ArrowLeft, Search, CheckCircle2, Menu, GraduationCap, History
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Avatar } from "../../components/ui/Avatar";
import { Badge } from "../../components/ui/Badge";
import { supabase } from "../../lib/supabase";
import MuralBoard from "../../components/mural/MuralBoard";
import { clearUserSession, getCurrentUser, saveUserSession, type UserProfile } from "../../lib/auth";
import ReportsTab from "./ReportsTab";
import StudentHistoryModal from "../../components/ui/StudentHistoryModal";
import {
  getApiBase,
  fetchAlunosPorTurmaComStats,
  type TurmaAlunosResumo,
  fetchLogs,
  exportarLogsCSV,
  type AuditLog,
} from "../../lib/api";
function extractAgeRange(nome: string): { idade_minima: number; idade_maxima: number } {
  if (!nome) return { idade_minima: 0, idade_maxima: 120 };
  const matchRange = nome.match(/(\d+)\s*a\s*(\d+)/i);
  if (matchRange) {
    return { idade_minima: parseInt(matchRange[1], 10), idade_maxima: parseInt(matchRange[2], 10) };
  }
  const matchPlus = nome.match(/(\d+)\s*\+/);
  if (matchPlus) {
    const min = parseInt(matchPlus[1], 10);
    return { idade_minima: min, idade_maxima: min >= 60 ? 120 : 59 };
  }
  if (/infantil a/i.test(nome)) return { idade_minima: 5, idade_maxima: 7 };
  if (/infantil b/i.test(nome)) return { idade_minima: 8, idade_maxima: 10 };
  if (/juvenil a/i.test(nome)) return { idade_minima: 11, idade_maxima: 13 };
  if (/juvenil b/i.test(nome)) return { idade_minima: 14, idade_maxima: 17 };
  if (/adulto/i.test(nome)) return { idade_minima: 18, idade_maxima: 59 };
  if (/melhor idade|idoso/i.test(nome)) return { idade_minima: 60, idade_maxima: 120 };
  return { idade_minima: 0, idade_maxima: 120 };
}

export default function AdminDashboard() {
  const [alunosDb, setAlunosDb] = useState<any[]>([]);
  const [turmasDb, setTurmasDb] = useState<any[]>([]);
  const [selectedAluno, setSelectedAluno] = useState<any>(null);
  const [activeMenu, setActiveMenu] = useState("Alunos");
  const [activeTab, setActiveTab] = useState<"alunos" | "fila">("alunos");
  const [sidebarOpen, setSidebarOpen] = useState(typeof window !== "undefined" ? window.innerWidth >= 1024 : false);

  // Estados para Módulo de Frequência
  const [selectedTurmaFreq, setSelectedTurmaFreq] = useState<string>("");
  const [selectedDataFreq, setSelectedDataFreq] = useState<string>(new Date().toISOString().split("T")[0]);
  const [listaFrequencia, setListaFrequencia] = useState<any[]>([]);
  const [alertasFaltas, setAlertasFaltas] = useState<any[]>([]);
  const [savingFreq, setSavingFreq] = useState<boolean>(false);
  const [editandoChamada, setEditandoChamada] = useState<boolean>(false);

  // Estados para Detalhes da Turma e Alunos
  const [selectedTurmaView, setSelectedTurmaView] = useState<any>(null);
  const [turmaAlunosData, setTurmaAlunosData] = useState<TurmaAlunosResumo | null>(null);
  const [loadingTurmaView, setLoadingTurmaView] = useState<boolean>(false);
  const [filtroAlunosTurma, setFiltroAlunosTurma] = useState<string>("");

  // Estado para Modal de Histórico Individual do Aluno
  const [studentHistoryModalId, setStudentHistoryModalId] = useState<string | null>(null);

  // Estados para Criar Nova Turma
  const [showModalNovaTurma, setShowModalNovaTurma] = useState(false);
  const [novaTurma, setNovaTurma] = useState({ nome: '', turno: '', capacidade: 15, idade_minima: 5, idade_maxima: 17 });
  const [savingTurma, setSavingTurma] = useState(false);

  // Estados para Editar Turma
  const [turmaParaEditar, setTurmaParaEditar] = useState<any>(null);
  const [editandoTurma, setEditandoTurma] = useState(false);

  // Estados para Gestão de Administradores
  const [admins, setAdmins] = useState<any[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [showModalNovoAdmin, setShowModalNovoAdmin] = useState(false);
  const [novoAdmin, setNovoAdmin] = useState({ nome: '', email: '', password: '' });
  const [savingAdmin, setSavingAdmin] = useState(false);

  // Estados para Chamar Aluno da Fila & Envio de E-mail
  const [alunoParaChamar, setAlunoParaChamar] = useState<any>(null);
  const [turmaDestinoChamar, setTurmaDestinoChamar] = useState<string>('');
  const [chamandoAluno, setChamandoAluno] = useState(false);
  const [resultadoChamada, setResultadoChamada] = useState<{
    aluno: any;
    action_link: string | null;
    email_enviado: boolean;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Estados para Edição de Aluno
  const [alunoParaEditar, setAlunoParaEditar] = useState<any>(null);
  const [editandoAluno, setEditandoAluno] = useState(false);
  const [alunoEditForm, setAlunoEditForm] = useState<any>({});

  // Estados para Editar Administrador
  const [adminParaEditar, setAdminParaEditar] = useState<any>(null);
  const [editandoAdmin, setEditandoAdmin] = useState(false);
  const [adminEditForm, setAdminEditForm] = useState({ nome: '', email: '' });

  // Estados para Gestão de Professores
  const [professores, setProfessores] = useState<any[]>([]);
  const [loadingProfessores, setLoadingProfessores] = useState(false);
  const [showModalNovoProfessor, setShowModalNovoProfessor] = useState(false);
  const [novoProfessor, setNovoProfessor] = useState({ nome: '', email: '', telefone: '', especialidade: '', turma_ids: [] as string[] });
  const [savingProfessor, setSavingProfessor] = useState(false);
  const [professorParaEditar, setProfessorParaEditar] = useState<any>(null);
  const [editandoProfessor, setEditandoProfessor] = useState(false);
  const [professorEditForm, setProfessorEditForm] = useState<any>({ nome: '', email: '', telefone: '', especialidade: '', turma_ids: [] });

  // Estados para Meus Dados (Configurações)
  const [meuPerfil, setMeuPerfil] = useState<UserProfile | null>(() => getCurrentUser());
  const [perfilForm, setPerfilForm] = useState({
    name: meuPerfil?.name || 'Coordenação CDE Odessa Macedo',
    email: meuPerfil?.email || 'admin@cultura.bage.rs.gov.br',
    cargo: meuPerfil?.cargo || 'Administrador Geral',
  });
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [sucessoPerfil, setSucessoPerfil] = useState(false);

  // Estados para Auditoria de Logs
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [filtroLogCategoria, setFiltroLogCategoria] = useState<string>('todos');
  const [filtroLogBusca, setFiltroLogBusca] = useState<string>('');
  const [exportandoLogs, setExportandoLogs] = useState(false);

  const navigate = useNavigate();

  const carregarLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await fetchLogs();
      setLogs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('Erro ao carregar logs:', e);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleExportarLogs = async () => {
    setExportandoLogs(true);
    try {
      const csv = await exportarLogsCSV();
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `auditoria_logs_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert('Erro ao exportar logs: ' + (err.message || 'Tente novamente'));
    } finally {
      setExportandoLogs(false);
    }
  };

  const fetchAlunos = async () => {
    try {
      const res = await fetch(`${getApiBase()}/alunos`);
      let alunosApi: any[] = [];
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) alunosApi = data;
      }

      // Consulta complementar direta à tabela lista_espera no Supabase
      try {
        const { data: filaSupabase, error: filaErr } = await supabase
          .from('lista_espera')
          .select('*, turmas(*)')
          .or('status.eq.aguardando,status.is.null')
          .order('created_at', { ascending: false });

        if (!filaErr && Array.isArray(filaSupabase) && filaSupabase.length > 0) {
          const idsExistentes = new Set(alunosApi.map((a: any) => a.id));
          for (const item of filaSupabase) {
            if (!idsExistentes.has(item.id)) {
              alunosApi.push({
                ...item,
                aluno_nome: item.aluno_nome || item.nome_aluno || 'Aluno',
                resp_nome: item.resp_nome || item.nome_responsavel || 'Responsável',
                resp_telefone: item.resp_telefone || item.telefone_responsavel || '—',
                resp_email: item.resp_email || item.email_responsavel || '',
                aluno_nascimento: item.aluno_nascimento || item.data_nascimento || '',
                status: 'Fila',
                turmas: item.turmas || turmasDb.find((t) => t.id === item.turma_id) || undefined,
              });
              idsExistentes.add(item.id);
            }
          }
        }
      } catch (e) {
        console.warn('Aviso ao consultar lista_espera do Supabase:', e);
      }

      setAlunosDb(alunosApi);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTurmas = () => {
    fetch(`${getApiBase()}/turmas`)
      .then(res => res.json())
      .then(data => {
        setTurmasDb(Array.isArray(data) ? data : []);
      })
      .catch(err => console.error(err));
  };

  const fetchAlertasFaltas = () => {
    fetch(`${getApiBase()}/frequencias/alertas`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAlertasFaltas(data);
      })
      .catch(err => console.error(err));
  };

  const fetchFrequencia = (turmaId: string, dataStr: string) => {
    if (!turmaId) return;
    fetch(`${getApiBase()}/frequencias/turma/${turmaId}?data=${dataStr}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setListaFrequencia(data.map((item: any) => ({
            aluno_id: item.id,
            aluno_nome: item.aluno_nome || item.resp_nome || "Aluno sem nome",
            resp_nome: item.resp_nome || "—",
            resp_telefone: item.resp_telefone || "—",
            status: item.frequencia?.status || "PRESENTE",
            observacao: item.frequencia?.observacao || "",
          })));
        }
      })
      .catch(err => console.error(err));
  };

  const fetchAdmins = () => {
    setLoadingAdmins(true);
    fetch(`${getApiBase()}/admin/usuarios`)
      .then(res => res.json())
      .then(data => {
        setAdmins(Array.isArray(data) ? data : []);
        setLoadingAdmins(false);
      })
      .catch(err => {
        console.error(err);
        setLoadingAdmins(false);
      });
  };

  // Abrir Turma para visualizar todos os alunos matriculados e estatísticas
  const handleOpenTurma = async (turma: any) => {
    setSelectedTurmaView(turma);
    setLoadingTurmaView(true);
    try {
      const data = await fetchAlunosPorTurmaComStats(turma.id);
      setTurmaAlunosData(data);
    } catch (err) {
      console.error("Erro ao carregar alunos da turma:", err);
    } finally {
      setLoadingTurmaView(false);
    }
  };

  const refreshTurmaAlunos = async () => {
    if (selectedTurmaView) {
      try {
        const data = await fetchAlunosPorTurmaComStats(selectedTurmaView.id);
        setTurmaAlunosData(data);
      } catch (err) {
        console.error(err);
      }
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    fetchAlunos();
    fetchTurmas();
    fetchAlertasFaltas();
    fetchAdmins();
    fetchProfessores();
    carregarLogs();
  }, []);

  useEffect(() => {
    if (turmasDb.length > 0 && alunosDb.length > 0 && !selectedTurmaFreq) {
      const turmaComAlunos = turmasDb.find(t => alunosDb.some(a => a.turma_id === t.id && a.status === 'Ativo'));
      if (turmaComAlunos) {
        setSelectedTurmaFreq(turmaComAlunos.id);
      } else if (turmasDb.length > 0) {
        setSelectedTurmaFreq(turmasDb[0].id);
      }
    }
  }, [turmasDb, alunosDb, selectedTurmaFreq]);

  useEffect(() => {
    if (activeMenu === "Frequência" && selectedTurmaFreq && selectedDataFreq) {
      fetchFrequencia(selectedTurmaFreq, selectedDataFreq);
    }
  }, [activeMenu, selectedTurmaFreq, selectedDataFreq]);

  const alunosAtivos = alunosDb.filter(a => a.status === 'Ativo');
  const alunosFila = alunosDb.filter(a => a.status === 'Fila' || a.status === 'aguardando');

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

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoAdmin.email.trim() || !novoAdmin.password) {
      alert("Por favor, preencha o e-mail e a senha.");
      return;
    }
    if (novoAdmin.password.length < 6) {
      alert("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    setSavingAdmin(true);
    try {
      const res = await fetch(`${getApiBase()}/admin/usuarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(novoAdmin),
      });
      const data = await res.json();
      if (res.ok) {
        alert("Novo administrador cadastrado com sucesso!");
        setShowModalNovoAdmin(false);
        setNovoAdmin({ nome: '', email: '', password: '' });
        fetchAdmins();
      } else {
        alert("Erro ao criar administrador: " + (data.message || "Erro desconhecido"));
      }
    } catch (e) {
      alert("Erro de conexão ao criar administrador.");
    } finally {
      setSavingAdmin(false);
    }
  };

  const handleDeleteAdmin = async (admin: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email?.toLowerCase() === admin.email?.toLowerCase()) {
      alert("Você não pode excluir sua própria conta de administrador enquanto estiver conectado.");
      return;
    }
    if (!window.confirm(`Deseja realmente remover o administrador ${admin.nome || admin.email}?`)) {
      return;
    }
    try {
      const res = await fetch(`${getApiBase()}/admin/usuarios/${admin.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        alert("Administrador removido com sucesso!");
        fetchAdmins();
      } else {
        const err = await res.json();
        alert("Erro ao remover: " + err.message);
      }
    } catch (e) {
      alert("Erro de conexão");
    }
  };

  const fetchProfessores = () => {
    setLoadingProfessores(true);
    fetch(`${getApiBase()}/admin/professores`)
      .then(res => res.json())
      .then(data => {
        setProfessores(Array.isArray(data) ? data : []);
        setLoadingProfessores(false);
      })
      .catch(err => {
        console.error(err);
        setLoadingProfessores(false);
      });
  };

  const handleCreateProfessor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoProfessor.nome.trim() || !novoProfessor.email.trim()) {
      alert("Preencha o nome e o e-mail do professor.");
      return;
    }
    setSavingProfessor(true);
    try {
      const res = await fetch(`${getApiBase()}/admin/professores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(novoProfessor),
      });
      const data = await res.json();
      if (res.ok) {
        alert("Professor cadastrado com sucesso!");
        setShowModalNovoProfessor(false);
        setNovoProfessor({ nome: '', email: '', telefone: '', especialidade: '', turma_ids: [] });
        fetchProfessores();
      } else {
        alert("Erro ao cadastrar professor: " + (data.message || "Erro desconhecido"));
      }
    } catch {
      alert("Erro de conexão ao cadastrar professor.");
    } finally {
      setSavingProfessor(false);
    }
  };

  const handleDeleteProfessor = async (prof: any) => {
    if (!window.confirm(`Deseja realmente remover o professor ${prof.nome}?`)) {
      return;
    }
    try {
      const res = await fetch(`${getApiBase()}/admin/professores/${prof.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        alert("Professor removido com sucesso!");
        fetchProfessores();
      } else {
        const err = await res.json();
        alert("Erro ao remover: " + (err.message || 'Erro desconhecido'));
      }
    } catch {
      alert("Erro de conexão ao remover professor.");
    }
  };

  const handleOpenEditProfessor = (prof: any) => {
    setProfessorParaEditar(prof);
    setProfessorEditForm({
      nome: prof.nome || '',
      email: prof.email || '',
      telefone: prof.telefone || '',
      especialidade: prof.especialidade || '',
      turma_ids: Array.isArray(prof.turmas) ? prof.turmas.map((t: any) => t.id) : (prof.turma_ids || []),
    });
  };

  const handleSaveEditProfessor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!professorParaEditar) return;
    setEditandoProfessor(true);
    try {
      const res = await fetch(`${getApiBase()}/admin/professores/${professorParaEditar.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(professorEditForm),
      });
      if (res.ok) {
        alert('Dados do professor atualizados com sucesso!');
        setProfessorParaEditar(null);
        fetchProfessores();
      } else {
        const err = await res.json();
        alert('Erro ao atualizar professor: ' + (err.message || 'Tente novamente'));
      }
    } catch {
      alert('Erro de conexão ao atualizar professor.');
    } finally {
      setEditandoProfessor(false);
    }
  };

  const handleOpenEditAdmin = (admin: any) => {
    setAdminParaEditar(admin);
    setAdminEditForm({
      nome: admin.nome || '',
      email: admin.email || '',
    });
  };

  const handleSaveEditAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminParaEditar) return;
    setEditandoAdmin(true);
    try {
      const res = await fetch(`${getApiBase()}/admin/usuarios/${adminParaEditar.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminEditForm),
      });
      if (res.ok) {
        alert('Dados do administrador atualizados com sucesso!');
        setAdminParaEditar(null);
        fetchAdmins();
      } else {
        const err = await res.json();
        alert('Erro ao atualizar: ' + (err.message || 'Tente novamente'));
      }
    } catch {
      alert('Erro de conexão ao atualizar administrador.');
    } finally {
      setEditandoAdmin(false);
    }
  };

  const handleOpenEditAluno = (aluno: any) => {
    setAlunoParaEditar(aluno);
    setAlunoEditForm({
      aluno_nome: aluno.aluno_nome || '',
      aluno_nascimento: aluno.aluno_nascimento ? aluno.aluno_nascimento.split('T')[0] : '',
      aluno_cpf: aluno.aluno_cpf || '',
      aluno_sexo: aluno.aluno_sexo || '',
      turma_id: aluno.turma_id || '',
      resp_nome: aluno.resp_nome || '',
      resp_cpf: aluno.resp_cpf || '',
      resp_email: aluno.resp_email || '',
      resp_telefone: aluno.resp_telefone || '',
      resp_parentesco: aluno.resp_parentesco || '',
      resp_endereco: aluno.resp_endereco || '',
      resp_bairro: aluno.resp_bairro || '',
      resp_cep: aluno.resp_cep || '',
      aluno_necessidades: aluno.aluno_necessidades || '',
    });
  };

  const handleSaveEditAluno = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alunoParaEditar) return;
    setEditandoAluno(true);
    try {
      const res = await fetch(`${getApiBase()}/alunos/${alunoParaEditar.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alunoEditForm),
      });

      // Atualização direta no Supabase para integridade imediata
      try {
        await supabase.from('alunos').update({
          aluno_nome: alunoEditForm.aluno_nome,
          aluno_nascimento: alunoEditForm.aluno_nascimento,
          aluno_cpf: alunoEditForm.aluno_cpf,
          aluno_sexo: alunoEditForm.aluno_sexo,
          turma_id: alunoEditForm.turma_id,
          resp_nome: alunoEditForm.resp_nome,
          resp_cpf: alunoEditForm.resp_cpf,
          resp_email: alunoEditForm.resp_email,
          resp_telefone: alunoEditForm.resp_telefone,
          resp_parentesco: alunoEditForm.resp_parentesco,
          resp_endereco: alunoEditForm.resp_endereco,
          resp_bairro: alunoEditForm.resp_bairro,
          resp_cep: alunoEditForm.resp_cep,
        }).eq('id', alunoParaEditar.id);

        await supabase.from('lista_espera').update({
          aluno_nome: alunoEditForm.aluno_nome,
          nome_aluno: alunoEditForm.aluno_nome,
          data_nascimento: alunoEditForm.aluno_nascimento,
          aluno_nascimento: alunoEditForm.aluno_nascimento,
          resp_nome: alunoEditForm.resp_nome,
          nome_responsavel: alunoEditForm.resp_nome,
          resp_email: alunoEditForm.resp_email,
          email_responsavel: alunoEditForm.resp_email,
          resp_telefone: alunoEditForm.resp_telefone,
          telefone_responsavel: alunoEditForm.resp_telefone,
          turma_id: alunoEditForm.turma_id,
        }).eq('id', alunoParaEditar.id);
      } catch (errSup) {
        console.warn('Aviso ao sincronizar direto no Supabase:', errSup);
      }

      if (res.ok) {
        alert('Dados cadastrais do aluno atualizados com sucesso!');
        const updated = { ...alunoParaEditar, ...alunoEditForm };
        if (selectedAluno?.id === alunoParaEditar.id) {
          setSelectedAluno(updated);
        }
        setAlunoParaEditar(null);
        await fetchAlunos();
        await fetchTurmas();
        await refreshTurmaAlunos();
      } else {
        const err = await res.json();
        alert('Erro ao atualizar: ' + (err.message || 'Tente novamente'));
      }
    } catch {
      alert('Erro de conexão ao salvar alterações do aluno.');
    } finally {
      setEditandoAluno(false);
    }
  };

  const handleSalvarMeuPerfil = (e: React.FormEvent) => {
    e.preventDefault();
    setSalvandoPerfil(true);
    try {
      const atual = getCurrentUser();
      const novoPerfil: UserProfile = {
        id: atual?.id || 'usr-admin-1',
        role: 'admin',
        name: perfilForm.name.trim(),
        email: perfilForm.email.trim(),
        cargo: perfilForm.cargo.trim(),
        avatarUrl: atual?.avatarUrl,
      };
      saveUserSession(novoPerfil);
      setMeuPerfil(novoPerfil);
      setSucessoPerfil(true);
      setTimeout(() => setSucessoPerfil(false), 4000);
      alert('Seus dados foram atualizados com sucesso!');
    } catch {
      alert('Erro ao atualizar seus dados.');
    } finally {
      setSalvandoPerfil(false);
    }
  };

  const abrirModalChamar = (aluno: any) => {
    setAlunoParaChamar(aluno);
    setTurmaDestinoChamar(aluno.turma_id);
    setCopiedLink(false);
  };

  const handleConfirmChamar = async () => {
    if (!alunoParaChamar) return;
    setChamandoAluno(true);
    try {
      const res = await fetch(`${getApiBase()}/alunos/${alunoParaChamar.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Ativo",
          turma_id: turmaDestinoChamar || alunoParaChamar.turma_id,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        // Garante exclusão imediata da tabela lista_espera no Supabase
        try {
          await supabase.from('lista_espera').delete().eq('id', alunoParaChamar.id);
        } catch {}

        fetchAlunos();
        fetchTurmas();
        fetchAlertasFaltas();
        setResultadoChamada({
          aluno: data.aluno || alunoParaChamar,
          action_link: data.action_link || null,
          email_enviado: !!data.email_enviado,
        });
        setAlunoParaChamar(null);
      } else {
        alert("Erro ao chamar aluno: " + (data.message || "Erro desconhecido"));
      }
    } catch (e) {
      alert("Erro de conexão ao chamar aluno.");
    } finally {
      setChamandoAluno(false);
    }
  };

  const handleDelete = async (aluno: any) => {
    if (!aluno) return;
    const nomeAluno = aluno.aluno_nome || aluno.resp_nome || 'o aluno';
    if (!window.confirm(`Deseja realmente remover permanentemente ${nomeAluno} do banco de dados? Esta ação liberará a vaga na turma e apagará o cadastro definitivamente.`)) return;

    try {
      // 1. Chamada à API
      try {
        await fetch(`${getApiBase()}/alunos/${aluno.id}`, { method: "DELETE" });
      } catch {}

      // 2. Garantia de exclusão direta no Supabase (alunos, frequências e lista_espera)
      try {
        if (aluno.status === 'Ativo' && aluno.turma_id) {
          const { data: turma } = await supabase.from('turmas').select('capacidade').eq('id', aluno.turma_id).single();
          if (turma) {
            await supabase.from('turmas').update({ capacidade: turma.capacidade + 1 }).eq('id', aluno.turma_id);
          }
        }
        await supabase.from('frequencias').delete().eq('aluno_id', aluno.id);
        await supabase.from('alunos').delete().eq('id', aluno.id);
        await supabase.from('lista_espera').delete().eq('id', aluno.id);
      } catch (errSup) {
        console.warn("Aviso ao excluir direto do Supabase:", errSup);
      }

      alert("Aluno removido com sucesso do banco de dados!");
      setSelectedAluno(null);
      await fetchAlunos();
      await fetchTurmas();
      await fetchAlertasFaltas();
      await refreshTurmaAlunos();
    } catch (e) {
      alert("Erro ao excluir aluno. Tente novamente.");
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
      const res = await fetch(`${getApiBase()}/frequencias/batch`, {
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
        setEditandoChamada(false);
        fetchAlertasFaltas();
        refreshTurmaAlunos();
        fetchFrequencia(selectedTurmaFreq, selectedDataFreq);
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

  const handleCreateTurma = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaTurma.nome.trim() || !novaTurma.turno.trim()) {
      alert("Por favor, preencha o nome da turma e o turno.");
      return;
    }
    setSavingTurma(true);
    try {
      const res = await fetch(`${getApiBase()}/turmas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: novaTurma.nome.trim(),
          turno: novaTurma.turno.trim(),
          capacidade: Number(novaTurma.capacidade) || 15,
          idade_minima: Number(novaTurma.idade_minima) || 0,
          idade_maxima: Number(novaTurma.idade_maxima) || 120,
        }),
      });

      if (res.ok) {
        alert("Nova turma criada com sucesso!");
        setShowModalNovaTurma(false);
        setNovaTurma({ nome: '', turno: '', capacidade: 15, idade_minima: 5, idade_maxima: 17 });
        fetchTurmas();
      } else {
        const err = await res.json();
        const { error: subErr } = await supabase.from('turmas').insert([{
          nome: novaTurma.nome.trim(),
          turno: novaTurma.turno.trim(),
          capacidade: Number(novaTurma.capacidade) || 15,
          idade_minima: Number(novaTurma.idade_minima) || 0,
          idade_maxima: Number(novaTurma.idade_maxima) || 120,
        }]);

        if (!subErr) {
          alert("Nova turma criada com sucesso!");
          setShowModalNovaTurma(false);
          setNovaTurma({ nome: '', turno: '', capacidade: 15, idade_minima: 5, idade_maxima: 17 });
          fetchTurmas();
        } else {
          alert("Erro ao criar turma: " + (err.message || subErr.message || "Erro desconhecido"));
        }
      }
    } catch (e) {
      alert("Erro de conexão ao criar turma.");
    } finally {
      setSavingTurma(false);
    }
  };

  const handleEditTurma = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turmaParaEditar) return;
    setEditandoTurma(true);
    try {
      const res = await fetch(`${getApiBase()}/turmas/${turmaParaEditar.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: turmaParaEditar.nome.trim(),
          turno: turmaParaEditar.turno.trim(),
          capacidade: Number(turmaParaEditar.capacidade),
          idade_minima: Number(turmaParaEditar.idade_minima),
          idade_maxima: Number(turmaParaEditar.idade_maxima),
        }),
      });
      if (res.ok) {
        alert("Turma atualizada com sucesso!");
        setTurmaParaEditar(null);
        fetchTurmas();
        if (selectedTurmaView && selectedTurmaView.id === turmaParaEditar.id) {
          setSelectedTurmaView({ ...selectedTurmaView, ...turmaParaEditar });
        }
      } else {
        const err = await res.json();
        alert("Erro ao editar turma: " + (err.message || "Erro desconhecido"));
      }
    } catch {
      alert("Erro de conexão ao editar turma.");
    } finally {
      setEditandoTurma(false);
    }
  };

  const handleDeleteTurma = async (turma: any) => {
    if (!window.confirm(`Deseja realmente excluir a turma "${turma.nome}"? Esta ação é irreversível.`)) return;
    try {
      const res = await fetch(`${getApiBase()}/turmas/${turma.id}`, { method: "DELETE" });
      if (res.ok) {
        alert("Turma excluída com sucesso!");
        fetchTurmas();
        if (selectedTurmaView?.id === turma.id) {
          setSelectedTurmaView(null);
        }
      } else {
        const err = await res.json();
        alert("Erro ao excluir: " + (err.message || "Erro desconhecido"));
      }
    } catch {
      alert("Erro de conexão ao excluir turma.");
    }
  };

  const handleExportTurmasCSV = () => {
    try {
      const escape = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;
      const headers = [
        'Nome da Turma',
        'Turno',
        'Faixa Etária',
        'Capacidade de Vagas',
        'Alunos Matriculados (Ativos)',
        'Alunos na Fila de Espera',
        'Situação'
      ];

      const rows = turmasDb.map((t) => {
        const ativos = alunosDb.filter((a) => a.turma_id === t.id && a.status === 'Ativo').length;
        const fila = alunosDb.filter((a) => a.turma_id === t.id && a.status === 'Fila').length;
        const faixa = `${t.idade_minima ?? 0} a ${t.idade_maxima ?? 120} anos`;
        const situacao = t.capacidade > 0 ? `Há ${t.capacidade} vaga(s)` : 'Turma cheia';

        return [
          t.nome,
          t.turno,
          faixa,
          t.capacidade,
          ativos,
          fila,
          situacao
        ];
      });

      const csvContent = [
        headers.map(escape).join(';'),
        ...rows.map((r) => r.map(escape).join(';'))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dados_turmas_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Erro ao exportar dados das turmas.');
    }
  };

  const handleExportCSV = async () => {
    if (activeMenu === "Turmas") {
      if (selectedTurmaView) {
        try {
          const escape = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;
          const headers = ['Aluno', 'Status', 'Responsável', 'Telefone', 'E-mail', 'Presenças', 'Faltas', 'Frequência %'];
          const rows = (turmaAlunosData?.alunos || []).map((a) => [
            a.aluno_nome,
            a.status,
            a.resp_nome,
            a.resp_telefone,
            a.resp_email,
            a.stats?.presencas || 0,
            a.stats?.faltas || 0,
            `${a.stats?.frequenciaPercentual || 100}%`
          ]);
          const csvContent = [
            headers.map(escape).join(';'),
            ...rows.map((r) => r.map(escape).join(';'))
          ].join('\n');

          const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `turma_${selectedTurmaView.nome.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
          a.click();
          URL.revokeObjectURL(url);
          return;
        } catch {
          alert('Erro ao exportar alunos da turma.');
          return;
        }
      } else {
        handleExportTurmasCSV();
        return;
      }
    }

    const turmaId = activeMenu === "Frequência" && selectedTurmaFreq ? selectedTurmaFreq : (selectedTurmaView ? selectedTurmaView.id : '');
    const url = `${getApiBase()}/frequencias/exportar${turmaId ? `?turma_id=${turmaId}` : ''}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Erro ao gerar relatório');
      const blob = await res.blob();
      const urlObj = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = urlObj;
      a.download = `relatorio_frequencias_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(urlObj);
    } catch {
      alert('Erro ao exportar relatório. Verifique a conexão com o servidor.');
    }
  };

  const handleEnviarAlertaFaltas = async (alunoId: string, alunoNome: string) => {
    if (!window.confirm(`Enviar e-mail de alerta de faltas para o responsável de ${alunoNome}?`)) return;
    try {
      const res = await fetch(`${getApiBase()}/frequencias/alertas/enviar-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aluno_id: alunoId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`E-mail de alerta enviado com sucesso para o responsável de ${alunoNome}!`);
      } else {
        alert('Erro ao enviar e-mail: ' + (data.error || 'Tente novamente.'));
      }
    } catch {
      alert('Erro de conexão ao enviar e-mail de alerta.');
    }
  };

  const menuItems = [
    { icon: <Users size={17} />, label: "Alunos", badge: alunosAtivos.length },
    { icon: <ListOrdered size={17} />, label: "Fila de espera", badge: alunosFila.length },
    { 
      icon: <CheckSquare size={17} />, 
      label: "Frequência", 
      badge: alertasFaltas.length > 0 ? alertasFaltas.length : undefined, 
      badgeColor: "bg-red-500" 
    },
    { icon: <BookOpen size={17} />, label: "Turmas" },
    { icon: <GraduationCap size={17} />, label: "Professores", badge: professores.length },
    { icon: <Sparkles size={17} />, label: "Mural" },
    { icon: <ShieldCheck size={17} />, label: "Administradores", badge: admins.length },
    { icon: <History size={17} />, label: "Auditoria", badge: logs.length },
    { icon: <BarChart2 size={17} />, label: "Relatórios" },
    { icon: <Settings size={17} />, label: "Configurações" },
  ];

  const stats = [
    { label: "Alunos matriculados", value: alunosAtivos.length, icon: <UserCheck size={20} />, color: "text-amber-600", bg: "bg-amber-100" },
    { label: "Na fila de espera", value: alunosFila.length, icon: <Clock size={20} />, color: "text-orange-600", bg: "bg-orange-100" },
    { label: "Alertas de faltas (3+)", value: alertasFaltas.length, icon: <AlertTriangle size={20} />, color: "text-red-600", bg: "bg-red-100" },
    { label: "Turmas com vagas", value: turmasDb.filter(t => t.capacidade > 0).length, icon: <Pencil size={20} />, color: "text-emerald-600", bg: "bg-emerald-100" },
  ];

  // Filtro de alunos dentro da visualização da turma
  const alunosTurmaFiltrados = (turmaAlunosData?.alunos || []).filter(a => {
    if (!filtroAlunosTurma.trim()) return true;
    const term = filtroAlunosTurma.toLowerCase();
    return (
      (a.aluno_nome && a.aluno_nome.toLowerCase().includes(term)) ||
      (a.resp_nome && a.resp_nome.toLowerCase().includes(term)) ||
      (a.resp_telefone && a.resp_telefone.includes(term))
    );
  });

  // Estatísticas agregadas da turma selecionada
  const mediaFrequenciaTurma = turmaAlunosData?.alunos && turmaAlunosData.alunos.length > 0
    ? Math.round(turmaAlunosData.alunos.reduce((acc, a) => acc + (a.stats?.frequenciaPercentual || 100), 0) / turmaAlunosData.alunos.length)
    : 100;

  const totalAulasTurma = turmaAlunosData?.alunos && turmaAlunosData.alunos.length > 0
    ? Math.max(...turmaAlunosData.alunos.map(a => a.stats?.totalAulas || 0))
    : 0;

  const alunosEmRiscoTurma = (turmaAlunosData?.alunos || []).filter(a => (a.stats?.faltasConsecutivas || 0) >= 3);

  return (
    <div className="min-h-screen bg-[#FAFAF7] font-['Inter',sans-serif] flex overflow-x-hidden">
      {/* Backdrop no mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`bg-[#1C1300] flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out fixed inset-y-0 left-0 z-50 lg:static lg:z-auto ${
          sidebarOpen ? "w-64 translate-x-0 opacity-100 shadow-2xl lg:shadow-none" : "-translate-x-full lg:translate-x-0 lg:w-0 lg:opacity-0 pointer-events-none overflow-hidden"
        }`}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-amber-900/40 min-w-[240px]">
          <div className="flex items-center gap-3">
            <Link to="/" className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center hover:bg-amber-600">
              <Pencil size={13} className="text-white" />
            </Link>
            <div>
              <p className="text-white text-xs font-bold leading-tight">CDE Odessa Macedo</p>
              <p className="text-amber-400/70 text-[10px]">Painel administrativo</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded-lg text-amber-400/60 hover:text-white hover:bg-amber-900/40 transition-colors"
            title="Recolher menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 mt-2 min-w-[240px]">
          {menuItems.map(({ icon, label, badge, badgeColor }) => (
            <button
              key={label}
              onClick={() => {
                setActiveMenu(label);
                if (label === "Fila de espera") {
                  setActiveTab("fila");
                } else if (label === "Alunos") {
                  setActiveTab("alunos");
                }
                if (typeof window !== "undefined" && window.innerWidth < 1024) {
                  setSidebarOpen(false);
                }
              }}
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

        <div className="p-4 border-t border-amber-900/40 min-w-[240px]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setActiveMenu("Configurações"); if (typeof window !== "undefined" && window.innerWidth < 1024) setSidebarOpen(false); }}
              className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer group"
              title="Ir para Configurações / Editar meus dados"
            >
              <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-bold shrink-0 group-hover:bg-amber-400 transition-colors">
                {meuPerfil?.name ? meuPerfil.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-semibold truncate group-hover:text-amber-300 transition-colors">
                  {meuPerfil?.name || 'Administrador'}
                </p>
                <p className="text-amber-400/70 text-[10px] truncate">
                  {meuPerfil?.cargo || 'Administrador'}
                </p>
              </div>
            </button>
            <button 
              onClick={async () => {
                clearUserSession();
                await supabase.auth.signOut().catch(() => {});
                navigate('/login');
              }}
              className="text-amber-400/70 hover:text-white transition-colors cursor-pointer"
              title="Sair do Painel"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-amber-100 h-16 flex items-center px-3 sm:px-8 gap-2 sm:gap-4 flex-shrink-0 shadow-sm">
          <button
            onClick={() => setSidebarOpen((prev) => !prev)}
            className="p-2 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors cursor-pointer"
            title={sidebarOpen ? "Recolher menu lateral" : "Expandir menu lateral"}
          >
            <Menu size={22} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[#1C1300] text-base sm:text-lg truncate">
              {activeMenu === "Frequência" 
                ? "Registro de Frequência e Chamada Diária" 
                : activeMenu === "Turmas" 
                ? (selectedTurmaView ? `Turma: ${selectedTurmaView.nome} · Gestão de Alunos` : "Gestão de Turmas e Vagas")
                : activeMenu === "Professores"
                ? "Corpo Docente · Gestão de Professores"
                : activeMenu === "Mural"
                ? "Mural de Atividades e Obras"
                : activeMenu === "Administradores"
                ? "Gestão de Administradores"
                : activeMenu === "Auditoria"
                ? "Auditoria e Histórico de Ações do Sistema"
                : activeMenu === "Relatórios"
                ? "Relatórios e Indicadores"
                : activeMenu === "Configurações"
                ? "Configurações da Conta · Meus Dados"
                : activeMenu === "Fila de espera" || activeTab === "fila"
                ? "Fila de Espera · Autorização de Inscrições"
                : "Gestão de Alunos · Aulas de Desenho"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100">
              <Bell size={20} />
              {alertasFaltas.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
              )}
            </button>
            {activeMenu !== "Relatórios" && (
              <button className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-600 font-medium border border-gray-200 rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 hover:bg-gray-50 cursor-pointer shrink-0" onClick={handleExportCSV} title="Exportar planilha CSV">
                <Download size={14} /> <span className="hidden sm:inline">Exportar CSV</span>
              </button>
            )}
            {activeMenu === "Turmas" ? (
              <div className="flex items-center gap-2">
                {selectedTurmaView && (
                  <button
                    onClick={() => setSelectedTurmaView(null)}
                    className="flex items-center gap-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 font-semibold rounded-xl px-3.5 py-2 transition-colors cursor-pointer"
                  >
                    <ArrowLeft size={14} /> Todas as Turmas
                  </button>
                )}
                <button 
                  onClick={() => setShowModalNovaTurma(true)} 
                  className="flex items-center gap-2 text-sm text-white bg-amber-500 font-bold rounded-xl px-3.5 py-2 hover:bg-amber-600 transition-colors shadow-xs cursor-pointer"
                >
                  <Plus size={15} /> Nova turma
                </button>
              </div>
            ) : activeMenu === "Professores" ? (
              <button 
                onClick={() => setShowModalNovoProfessor(true)} 
                className="flex items-center gap-2 text-sm text-white bg-amber-500 font-bold rounded-xl px-3.5 py-2 hover:bg-amber-600 transition-colors shadow-xs cursor-pointer"
              >
                <Plus size={15} /> Novo Professor
              </button>
            ) : activeMenu === "Administradores" ? (
              <button 
                onClick={() => setShowModalNovoAdmin(true)} 
                className="flex items-center gap-2 text-sm text-white bg-amber-500 font-bold rounded-xl px-3.5 py-2 hover:bg-amber-600 transition-colors shadow-xs cursor-pointer"
              >
                <Plus size={15} /> Novo Administrador
              </button>
            ) : activeMenu === "Mural" ? (
              null
            ) : (
              <Link to="/inscrever" className="flex items-center gap-2 text-sm text-white bg-amber-500 font-medium rounded-xl px-3 py-2 hover:bg-amber-600 transition-colors">
                <Plus size={15} /> Nova inscrição
              </Link>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-auto p-3.5 sm:p-7">
          {/* Stats Principais (exibido na maioria dos módulos) */}
          {activeMenu !== "Relatórios" && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-5 sm:mb-7">
              {stats.map(({ label, value, icon, color, bg }) => (
                <div key={label} className="bg-white rounded-2xl p-3 sm:p-5 border border-amber-50 shadow-sm flex items-center gap-2.5 sm:gap-4 min-w-0">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${bg} flex items-center justify-center ${color} shrink-0`}>{icon}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg sm:text-2xl font-['Plus_Jakarta_Sans',sans-serif] font-extrabold text-[#1C1300] truncate">{value}</p>
                    <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5 truncate">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeMenu === "Turmas" ? (
            /* --- MÓDULO DE GESTÃO DE TURMAS --- */
            selectedTurmaView ? (
              /* VISÃO DETALHADA DA TURMA COM SEUS ALUNOS */
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Header da Turma Selecionada */}
                <div className="bg-white rounded-3xl border border-amber-100 shadow-sm p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-gray-100">
                    <div className="flex items-start gap-3.5">
                      <button
                        onClick={() => setSelectedTurmaView(null)}
                        className="p-2.5 bg-gray-100 hover:bg-amber-100 hover:text-amber-800 rounded-xl text-gray-600 transition-colors cursor-pointer mt-0.5"
                        title="Voltar para lista de turmas"
                      >
                        <ArrowLeft size={18} />
                      </button>
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-extrabold text-xl text-[#1C1300]">
                            {selectedTurmaView.nome}
                          </h2>
                          <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                            {selectedTurmaView.turno}
                          </span>
                          {selectedTurmaView.capacidade > 0 ? (
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                              Há {selectedTurmaView.capacidade} vaga(s)
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full">
                              Turma Cheia
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-2">
                          <span>Faixa etária recomendada: <strong>{selectedTurmaView.idade_minima != null ? selectedTurmaView.idade_minima : extractAgeRange(selectedTurmaView.nome).idade_minima} a {selectedTurmaView.idade_maxima != null ? selectedTurmaView.idade_maxima : extractAgeRange(selectedTurmaView.nome).idade_maxima} anos</strong></span>
                          <span>·</span>
                          <span>Capacidade: <strong>{selectedTurmaView.capacidade} vagas</strong></span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        onClick={() => {
                          setSelectedTurmaFreq(selectedTurmaView.id);
                          setActiveMenu("Frequência");
                        }}
                        className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckSquare size={14} /> Fazer Chamada Desta Turma
                      </button>

                      <Link
                        to={`/inscrever?turma_id=${selectedTurmaView.id}`}
                        className="text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5"
                      >
                        <Plus size={14} /> Nova Matrícula Aqui
                      </Link>

                      <button
                        onClick={() => setTurmaParaEditar(selectedTurmaView)}
                        className="text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 px-3.5 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Pencil size={13} /> Editar Turma
                      </button>

                      <button
                        onClick={handleExportCSV}
                        className="text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 px-3.5 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download size={13} /> Exportar CSV
                      </button>
                    </div>
                  </div>

                  {/* 4 Mini Cards de Métricas da Turma */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
                    <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4">
                      <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">Matriculados</span>
                      <p className="text-2xl font-black text-gray-900 mt-1">
                        {turmaAlunosData?.totalAlunos || 0} <span className="text-xs font-medium text-gray-400">/ {selectedTurmaView.capacidade}</span>
                      </p>
                    </div>

                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4">
                      <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Frequência Média</span>
                      <p className="text-2xl font-black text-emerald-700 mt-1">
                        {mediaFrequenciaTurma}%
                      </p>
                    </div>

                    <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4">
                      <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">Aulas Registradas</span>
                      <p className="text-2xl font-black text-blue-700 mt-1">
                        {totalAulasTurma} <span className="text-xs font-medium text-gray-400">aulas</span>
                      </p>
                    </div>

                    <div className="bg-red-50/50 border border-red-100 rounded-2xl p-4">
                      <span className="text-[11px] font-bold text-red-800 uppercase tracking-wider block">Alertas de Absenteísmo</span>
                      <p className="text-2xl font-black text-red-700 mt-1">
                        {alunosEmRiscoTurma.length} <span className="text-xs font-medium text-gray-400">aluno(s)</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tabela de Alunos da Turma */}
                <div className="bg-white rounded-3xl border border-amber-100 shadow-sm p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
                    <div>
                      <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-base text-[#1C1300]">
                        Alunos Matriculados nesta Turma ({alunosTurmaFiltrados.length})
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Clique em qualquer aluno para abrir o histórico individual de faltas, presenças e justificativas.
                      </p>
                    </div>

                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                      <input
                        type="text"
                        placeholder="Buscar aluno ou responsável..."
                        value={filtroAlunosTurma}
                        onChange={(e) => setFiltroAlunosTurma(e.target.value)}
                        className="w-full h-10 pl-10 pr-3.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 focus:bg-white"
                      />
                    </div>
                  </div>

                  {loadingTurmaView ? (
                    <div className="p-12 text-center text-gray-400 text-sm flex flex-col items-center justify-center gap-3">
                      <Loader2 size={24} className="animate-spin text-amber-500" />
                      <span>Carregando dados dos alunos e frequência...</span>
                    </div>
                  ) : alunosTurmaFiltrados.length === 0 ? (
                    <div className="p-12 text-center text-gray-400 text-sm bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                      <p className="font-semibold text-gray-600">Nenhum aluno encontrado nesta turma.</p>
                      <p className="text-xs text-gray-400 mt-1">Você pode inscrever um aluno agora ou chamá-lo da fila de espera.</p>
                      <Link
                        to={`/inscrever?turma_id=${selectedTurmaView.id}`}
                        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition-colors shadow-xs"
                      >
                        <Plus size={14} /> Cadastrar Novo Aluno nesta Turma
                      </Link>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-gray-100 text-xs font-semibold text-gray-400">
                            <th className="px-4 py-3">Aluno</th>
                            <th className="px-4 py-3">Responsável / Contato</th>
                            <th className="px-4 py-3 text-center">Aulas</th>
                            <th className="px-4 py-3 text-center">Presenças</th>
                            <th className="px-4 py-3 text-center">Faltas</th>
                            <th className="px-4 py-3 text-center">Justificadas</th>
                            <th className="px-4 py-3 text-center">Frequência</th>
                            <th className="px-4 py-3 text-center">Situação</th>
                            <th className="px-4 py-3 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-sm">
                          {alunosTurmaFiltrados.map((aluno) => {
                            const stats = aluno.stats || {
                              totalAulas: 0,
                              presencas: 0,
                              faltas: 0,
                              justificadas: 0,
                              frequenciaPercentual: 100,
                              faltasConsecutivas: 0,
                            };
                            const isAlert = (stats.faltasConsecutivas || 0) >= 3;

                            return (
                              <tr
                                key={aluno.id}
                                onClick={() => setStudentHistoryModalId(aluno.id)}
                                className="hover:bg-amber-50/40 cursor-pointer transition-colors group"
                              >
                                <td className="px-4 py-3.5">
                                  <div className="flex items-center gap-3">
                                    <Avatar alt={aluno.aluno_nome} size={36} />
                                    <div>
                                      <p className="font-bold text-sm text-[#1C1300] group-hover:text-amber-700 transition-colors">
                                        {aluno.aluno_nome}
                                      </p>
                                      <span className="text-[11px] text-gray-400 font-mono">
                                        Nasc: {aluno.aluno_nascimento ? aluno.aluno_nascimento.split('T')[0].split('-').reverse().join('/') : '—'}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                <td className="px-4 py-3.5 text-xs text-gray-600">
                                  <p className="font-medium text-gray-900">{aluno.resp_nome}</p>
                                  {aluno.resp_telefone ? (
                                    <a
                                      href={`https://wa.me/55${aluno.resp_telefone.replace(/\D/g, '')}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 mt-0.5"
                                    >
                                      <Phone size={11} /> {aluno.resp_telefone}
                                    </a>
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </td>

                                <td className="px-4 py-3.5 text-center font-bold text-gray-700 text-xs">
                                  {stats.totalAulas}
                                </td>

                                <td className="px-4 py-3.5 text-center">
                                  <span className="inline-block px-2 py-0.5 rounded-md font-bold text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    {stats.presencas}
                                  </span>
                                </td>

                                <td className="px-4 py-3.5 text-center">
                                  <span className={`inline-block px-2 py-0.5 rounded-md font-bold text-xs ${
                                    stats.faltas > 0 ? 'bg-red-50 text-red-700 border border-red-200' : 'text-gray-400'
                                  }`}>
                                    {stats.faltas}
                                  </span>
                                </td>

                                <td className="px-4 py-3.5 text-center">
                                  <span className={`inline-block px-2 py-0.5 rounded-md font-bold text-xs ${
                                    stats.justificadas > 0 ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'text-gray-400'
                                  }`}>
                                    {stats.justificadas}
                                  </span>
                                </td>

                                <td className="px-4 py-3.5 text-center">
                                  <div className="flex flex-col items-center gap-1">
                                    <span className={`text-xs font-bold ${
                                      stats.frequenciaPercentual >= 75 ? 'text-emerald-600' : 'text-red-600'
                                    }`}>
                                      {stats.frequenciaPercentual}%
                                    </span>
                                    <div className="w-14 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                      <div
                                        className={`h-1.5 rounded-full ${
                                          stats.frequenciaPercentual >= 75 ? 'bg-emerald-500' : 'bg-red-500'
                                        }`}
                                        style={{ width: `${stats.frequenciaPercentual}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>

                                <td className="px-4 py-3.5 text-center">
                                  {isAlert ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
                                      <AlertTriangle size={11} /> {stats.faltasConsecutivas} faltas seguidas
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      <CheckCircle2 size={11} /> Regular
                                    </span>
                                  )}
                                </td>

                                <td className="px-4 py-3.5 text-right">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setStudentHistoryModalId(aluno.id);
                                    }}
                                    className="text-xs px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl font-bold transition-all inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                                  >
                                    <FileText size={12} /> Ver Faltas & Histórico
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
              </div>
            ) : (
              /* GRADE GERAL DE TODAS AS TURMAS */
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-amber-50 shadow-sm p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
                    <div>
                      <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-lg text-[#1C1300]">
                        Turmas Cadastradas ({turmasDb.length})
                      </h2>
                      <p className="text-xs text-gray-500">
                        Clique em <strong>"Abrir Turma & Ver Alunos"</strong> para ver todos os estudantes matriculados e acompanhar as faltas individualmente.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleExportTurmasCSV}
                        className="text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 font-semibold px-3.5 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Baixar planilha CSV com os dados de todas as turmas"
                      >
                        <Download size={14} /> Exportar CSV
                      </button>
                      <button
                        onClick={() => setShowModalNovaTurma(true)}
                        className="text-xs text-white bg-amber-500 font-bold px-4 py-2.5 rounded-xl hover:bg-amber-600 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Plus size={15} /> Nova Turma
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {turmasDb.map((turma) => {
                      const alunosAtivosTurma = alunosDb.filter(a => a.turma_id === turma.id && a.status === 'Ativo');
                      const vagas = turma.capacidade;

                      return (
                        <div
                          key={turma.id}
                          className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs hover:border-amber-400 hover:shadow-md transition-all flex flex-col justify-between group"
                        >
                          <div>
                            <div className="flex items-start justify-between mb-3">
                              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                                <BookOpen size={18} />
                              </div>
                              {vagas > 0 ? (
                                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                                  Há vagas ({vagas})
                                </span>
                              ) : (
                                <span className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full">
                                  Turma Cheia
                                </span>
                              )}
                            </div>

                            <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-base text-[#1C1300] mb-1 group-hover:text-amber-800 transition-colors">
                              {turma.nome}
                            </h3>
                            <p className="text-xs text-amber-800 font-semibold mb-2">
                              {turma.turno}
                            </p>
                            <span className="inline-block text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md mb-4">
                              Faixa etária: {turma.idade_minima != null ? turma.idade_minima : extractAgeRange(turma.nome).idade_minima} a {turma.idade_maxima != null ? turma.idade_maxima : extractAgeRange(turma.nome).idade_maxima} anos
                            </span>
                          </div>

                          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 mb-3">
                            <span>Alunos ativos: <strong className="text-gray-900">{alunosAtivosTurma.length}</strong></span>
                            <span>Capacidade: <strong className="text-gray-900">{turma.capacidade}</strong></span>
                          </div>

                          {/* Botão de Destaque: Abrir Turma & Ver Alunos */}
                          <button
                            onClick={() => handleOpenTurma(turma)}
                            className="w-full text-xs py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer mb-2"
                          >
                            <Users size={14} /> Abrir Turma & Ver Alunos ({alunosAtivosTurma.length})
                          </button>

                          <div className="flex gap-2">
                            <button
                              onClick={() => setTurmaParaEditar({ ...turma })}
                              className="flex-1 text-xs py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg font-semibold hover:bg-amber-100 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Pencil size={12} /> Editar
                            </button>
                            <button
                              onClick={() => handleDeleteTurma(turma)}
                              className="flex-1 text-xs py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg font-semibold hover:bg-red-100 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Trash2 size={12} /> Excluir
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )
          ) : activeMenu === "Frequência" ? (
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
                        <div className="mt-3 pt-2 border-t border-gray-100 flex flex-col gap-2">
                          <button
                            onClick={() => setStudentHistoryModalId(aluno.id)}
                            className="w-full text-center text-xs bg-amber-500 hover:bg-amber-600 text-white font-bold py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <FileText size={12} /> Ver Faltas & Justificar
                          </button>
                          <div className="flex gap-2">
                            <a
                              href={`https://wa.me/55${aluno.resp_telefone?.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1 text-center text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 py-1.5 rounded-lg font-semibold hover:bg-emerald-100 transition-colors"
                            >
                              Contatar Resp.
                            </a>
                            <button
                              onClick={() => handleEnviarAlertaFaltas(aluno.id, aluno.aluno_nome)}
                              className="flex-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 py-1.5 rounded-lg font-semibold hover:bg-amber-100 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Mail size={11} /> Enviar Alerta
                            </button>
                            <button
                              onClick={() => handleDelete(aluno)}
                              className="flex-1 text-xs bg-red-50 text-red-700 border border-red-200 py-1.5 rounded-lg font-semibold hover:bg-red-100 transition-colors cursor-pointer"
                            >
                              Excluir
                            </button>
                          </div>
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
                        {turmasDb.map((t) => {
                          const count = alunosDb.filter(a => a.turma_id === t.id && a.status === 'Ativo').length;
                          return (
                            <option key={t.id} value={t.id}>
                              {t.nome} ({t.turno}) — {count} {count === 1 ? 'aluno' : 'alunos'}
                            </option>
                          );
                        })}
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

                  <div className="flex items-center gap-2">
                    {!editandoChamada ? (
                      <button
                        onClick={() => setEditandoChamada(true)}
                        className="text-xs text-white bg-amber-600 hover:bg-amber-700 font-bold px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Pencil size={14} /> Editar Chamada
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditandoChamada(false);
                            fetchFrequencia(selectedTurmaFreq, selectedDataFreq);
                          }}
                          className="text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 font-semibold px-3 py-2 rounded-xl transition-colors cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleMarcarTodosPresentes}
                          className="text-xs text-amber-700 bg-amber-50 border border-amber-200 font-semibold px-3 py-2 rounded-xl hover:bg-amber-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check size={14} /> Marcar Todos Presentes
                        </button>
                        <button
                          onClick={handleSalvarFrequencia}
                          disabled={savingFreq}
                          className="text-xs text-white bg-emerald-600 font-bold px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                        >
                          <Save size={14} /> {savingFreq ? "Salvando..." : "Salvar Chamada"}
                        </button>
                      </>
                    )}
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
                        <th className="px-4 py-3 text-right">Histórico</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listaFrequencia.map((item) => (
                        <tr key={item.aluno_id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar alt={item.aluno_nome} size={32} />
                              <button
                                onClick={() => setStudentHistoryModalId(item.aluno_id)}
                                className="font-semibold text-sm text-[#1C1300] hover:text-amber-700 text-left cursor-pointer"
                              >
                                {item.aluno_nome}
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            <p>{item.resp_nome}</p>
                            <p className="text-gray-400">{item.resp_telefone}</p>
                          </td>
                          <td className="px-4 py-3">
                            {editandoChamada ? (
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
                            ) : (
                              <div className="flex justify-center items-center">
                                {item.status === "PRESENTE" && (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                    <Check size={12} /> Presente
                                  </span>
                                )}
                                {item.status === "FALTA" && (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">
                                    <X size={12} /> Falta
                                  </span>
                                )}
                                {item.status === "JUSTIFICADA" && (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                                    <HelpCircle size={12} /> Falta Justificada
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {editandoChamada ? (
                              <input
                                type="text"
                                placeholder="Ex: Atestado, viagem, motivo..."
                                value={item.observacao}
                                onChange={(e) => handleObservacaoChange(item.aluno_id, e.target.value)}
                                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 text-gray-700"
                              />
                            ) : (
                              <span className="text-xs text-gray-500 italic">
                                {item.observacao || "Sem observações"}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setStudentHistoryModalId(item.aluno_id)}
                              className="p-1.5 text-gray-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              title="Ver todas as faltas do aluno"
                            >
                              <FileText size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {listaFrequencia.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">
                            Nenhum aluno ativo matriculado nesta turma.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : activeMenu === "Professores" ? (
            /* --- MÓDULO DE GESTÃO DE PROFESSORES --- */
            <div className="space-y-6">
              {/* Cards de Resumo dos Professores */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="bg-white rounded-2xl p-5 border border-amber-50 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                    <GraduationCap size={22} />
                  </div>
                  <div>
                    <p className="text-2xl font-['Plus_Jakarta_Sans',sans-serif] font-extrabold text-[#1C1300]">
                      {professores.length}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Professores Cadastrados</p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-amber-50 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                    <BookOpen size={22} />
                  </div>
                  <div>
                    <p className="text-2xl font-['Plus_Jakarta_Sans',sans-serif] font-extrabold text-[#1C1300]">
                      {professores.reduce((acc, p) => acc + (p.total_turmas || (p.turmas?.length || 0)), 0)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Turmas Atendidas</p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-amber-50 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <Users size={22} />
                  </div>
                  <div>
                    <p className="text-2xl font-['Plus_Jakarta_Sans',sans-serif] font-extrabold text-[#1C1300]">
                      {professores.reduce((acc, p) => acc + (p.total_alunos || 0), 0)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Alunos Sob Orientação</p>
                  </div>
                </div>
              </div>

              {/* Tabela de Professores */}
              <div className="bg-white rounded-2xl border border-amber-50 shadow-sm p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
                  <div>
                    <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-lg text-[#1C1300]">
                      Corpo Docente ({professores.length})
                    </h2>
                    <p className="text-xs text-gray-500">
                      Consulte os professores cadastrados, especialidades, turmas alocadas e contagem total de alunos atendidos.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowModalNovoProfessor(true)}
                    className="text-xs text-white bg-amber-500 font-bold px-4 py-2.5 rounded-xl hover:bg-amber-600 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Plus size={15} /> Novo Professor
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs font-semibold text-gray-400">
                        <th className="px-6 py-3">Professor</th>
                        <th className="px-6 py-3">Contato / E-mail</th>
                        <th className="px-6 py-3">Especialidade</th>
                        <th className="px-6 py-3">Turmas Alocadas</th>
                        <th className="px-6 py-3 text-center">Nº Turmas</th>
                        <th className="px-6 py-3 text-center">Nº Alunos</th>
                        <th className="px-6 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-sm">
                      {professores.map((prof) => (
                        <tr key={prof.id} className="hover:bg-amber-50/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center shrink-0">
                                {prof.nome ? prof.nome.charAt(0).toUpperCase() : 'P'}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900">{prof.nome}</p>
                                <p className="text-[11px] text-gray-400">ID: {prof.id.slice(0, 8)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs font-medium text-gray-800">{prof.email}</p>
                            {prof.telefone && (
                              <p className="text-xs text-gray-500 mt-0.5">{prof.telefone}</p>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700">
                              {prof.especialidade || "Artes Visuais & Desenho"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1.5 max-w-xs">
                              {Array.isArray(prof.turmas) && prof.turmas.length > 0 ? (
                                prof.turmas.map((t: any) => (
                                  <span
                                    key={t.id}
                                    onClick={() => handleOpenTurma(t)}
                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200/60 hover:bg-amber-100 cursor-pointer transition-colors"
                                    title={`Ver detalhes e alunos da turma ${t.nome}`}
                                  >
                                    <BookOpen size={10} className="text-amber-600" />
                                    {t.nome} ({t.turno})
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-gray-400 italic">Nenhuma turma vinculada</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              {prof.total_turmas ?? (prof.turmas?.length || 0)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {prof.total_alunos ?? 0}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenEditProfessor(prof)}
                                className="px-3 py-1.5 text-xs text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                                title="Editar dados cadastrais e turmas do professor"
                              >
                                <Pencil size={13} /> Editar
                              </button>
                              <button
                                onClick={() => handleDeleteProfessor(prof)}
                                className="px-3 py-1.5 text-xs text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                                title="Remover professor"
                              >
                                <Trash2 size={13} /> Remover
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {professores.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-gray-400 text-sm">
                            {loadingProfessores ? "Carregando professores..." : "Nenhum professor cadastrado ainda."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : activeMenu === "Administradores" ? (
            /* --- MÓDULO DE GESTÃO DE ADMINISTRADORES --- */
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-amber-50 shadow-sm p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
                  <div>
                    <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-lg text-[#1C1300]">
                      Administradores do Sistema ({admins.length})
                    </h2>
                    <p className="text-xs text-gray-500">
                      Gerencie a equipe autorizada a acessar o painel administrativo da Secretaria de Cultura.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowModalNovoAdmin(true)}
                    className="text-xs text-white bg-amber-500 font-bold px-4 py-2.5 rounded-xl hover:bg-amber-600 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Plus size={15} /> Novo Administrador
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs font-semibold text-gray-400">
                        <th className="px-6 py-3">Nome</th>
                        <th className="px-6 py-3">E-mail</th>
                        <th className="px-6 py-3">Perfil</th>
                        <th className="px-6 py-3">Cadastrado em</th>
                        <th className="px-6 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-sm">
                      {admins.map((adm) => (
                        <tr key={adm.id} className="hover:bg-amber-50/30 transition-colors">
                          <td className="px-6 py-4 font-semibold text-gray-900">
                            {adm.nome || "Administrador"}
                          </td>
                          <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                            {adm.email}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <ShieldCheck size={12} /> Administrador
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-500">
                            {adm.created_at ? new Date(adm.created_at).toLocaleDateString('pt-BR') : "—"}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenEditAdmin(adm)}
                                className="px-3 py-1.5 text-xs text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                                title="Editar dados cadastrais do administrador"
                              >
                                <Pencil size={13} /> Editar
                              </button>
                              <button
                                onClick={() => handleDeleteAdmin(adm)}
                                className="px-3 py-1.5 text-xs text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 size={13} /> Remover
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {admins.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">
                            {loadingAdmins ? "Carregando administradores..." : "Nenhum administrador encontrado."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : activeMenu === "Mural" ? (
            /* --- MODULO DO MURAL DE ATIVIDADES E OBRAS --- */
            <div className="bg-white rounded-2xl border border-amber-50 shadow-sm p-6">
              <MuralBoard embedded={true} allowPublish={true} />
            </div>
          ) : activeMenu === "Relatórios" ? (
            /* --- MÓDULO DE RELATÓRIOS --- */
            <ReportsTab turmas={turmasDb} alertasFaltas={alertasFaltas} />
          ) : activeMenu === "Configurações" ? (
            /* --- MÓDULO DE CONFIGURAÇÕES / EDITAR MEUS DADOS --- */
            <div className="max-w-3xl space-y-6">
              <div className="bg-white rounded-3xl border border-amber-100 shadow-sm p-6 sm:p-8">
                <div className="flex items-center gap-4 pb-6 border-b border-gray-100 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xl font-bold shadow-md">
                    {meuPerfil?.name ? meuPerfil.name.charAt(0).toUpperCase() : 'A'}
                  </div>
                  <div>
                    <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl text-[#1C1300]">
                      Editar Meus Dados
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Atualize suas informações de identificação e perfil institucional de administrador.
                    </p>
                  </div>
                </div>

                {sucessoPerfil && (
                  <div className="mb-6 p-4 rounded-2xl bg-green-50 border border-green-200 flex items-center gap-3 text-green-800 text-xs font-semibold">
                    <CheckCircle className="text-green-600 shrink-0" size={18} />
                    <span>Seus dados foram atualizados com sucesso e salvos para esta sessão.</span>
                  </div>
                )}

                <form onSubmit={handleSalvarMeuPerfil} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        Nome Completo *
                      </label>
                      <input
                        type="text"
                        required
                        value={perfilForm.name}
                        onChange={(e) => setPerfilForm({ ...perfilForm, name: e.target.value })}
                        className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        E-mail de Acesso *
                      </label>
                      <input
                        type="email"
                        required
                        value={perfilForm.email}
                        onChange={(e) => setPerfilForm({ ...perfilForm, email: e.target.value })}
                        className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Cargo / Função Institucional
                    </label>
                    <input
                      type="text"
                      value={perfilForm.cargo}
                      onChange={(e) => setPerfilForm({ ...perfilForm, cargo: e.target.value })}
                      placeholder="Ex: Coordenador(a) Geral, Secretaria de Cultura"
                      className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                    />
                  </div>

                  <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                    <button
                      type="submit"
                      disabled={salvandoPerfil}
                      className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {salvandoPerfil ? (
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
          ) : activeMenu === "Auditoria" ? (
            /* --- MÓDULO DE AUDITORIA E LOGS DO SISTEMA --- */
            <div className="space-y-6">
              {/* Header do Módulo de Auditoria */}
              <div className="bg-white rounded-3xl border border-amber-100 shadow-sm p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                      <History size={24} />
                    </div>
                    <div>
                      <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl text-[#1C1300]">
                        Registro de Auditoria de Ações
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Histórico cronológico de operações críticas: movimentação de fila, chamadas diárias, alterações cadastrais e gestão de usuários.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={carregarLogs}
                      disabled={loadingLogs}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all cursor-pointer disabled:opacity-50"
                      title="Recarregar logs"
                    >
                      {loadingLogs ? <Loader2 size={14} className="animate-spin" /> : <Clock size={14} />}
                      Atualizar
                    </button>
                    <button
                      onClick={handleExportarLogs}
                      disabled={exportandoLogs || logs.length === 0}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#1C1300] hover:bg-black text-amber-400 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {exportandoLogs ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                      Exportar Logs (CSV)
                    </button>
                  </div>
                </div>

                {/* Filtros e Barra de Busca */}
                <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                  {/* Categorias */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { id: 'todos', label: 'Todos os Logs' },
                      { id: 'turma', label: 'Turmas' },
                      { id: 'aluno', label: 'Alunos' },
                      { id: 'fila', label: 'Fila de Espera' },
                      { id: 'frequencia', label: 'Chamadas / Frequência' },
                      { id: 'professor', label: 'Professores' },
                      { id: 'admin', label: 'Administradores' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setFiltroLogCategoria(cat.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          filtroLogCategoria === cat.id
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Busca textual */}
                  <div className="relative min-w-[240px]">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar por ação, autor ou detalhe..."
                      value={filtroLogBusca}
                      onChange={(e) => setFiltroLogBusca(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Tabela de Logs */}
              <div className="bg-white rounded-3xl border border-amber-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 bg-[#FAF7F2] text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                        <th className="py-3.5 px-6">Data / Horário</th>
                        <th className="py-3.5 px-6">Ação Realizada</th>
                        <th className="py-3.5 px-6">Categoria</th>
                        <th className="py-3.5 px-6">Detalhes</th>
                        <th className="py-3.5 px-6">Quem Realizou</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {loadingLogs ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-gray-400">
                            <Loader2 size={24} className="animate-spin mx-auto text-amber-500 mb-2" />
                            Carregando histórico de auditoria...
                          </td>
                        </tr>
                      ) : (() => {
                        const logsFiltrados = logs.filter((l) => {
                          if (filtroLogCategoria !== 'todos' && (l.categoria || 'sistema') !== filtroLogCategoria) {
                            return false;
                          }
                          if (filtroLogBusca.trim()) {
                            const termo = filtroLogBusca.toLowerCase();
                            const matchAcao = (l.acao || '').toLowerCase().includes(termo);
                            const matchDet = (l.detalhes || '').toLowerCase().includes(termo);
                            const matchAutor = (l.autor_nome || '').toLowerCase().includes(termo);
                            const matchEmail = (l.autor_email || '').toLowerCase().includes(termo);
                            if (!matchAcao && !matchDet && !matchAutor && !matchEmail) return false;
                          }
                          return true;
                        });

                        if (logsFiltrados.length === 0) {
                          return (
                            <tr>
                              <td colSpan={5} className="py-12 text-center text-gray-400">
                                <History size={32} className="mx-auto text-gray-300 mb-2" />
                                Nenhum registro de auditoria encontrado com os filtros selecionados.
                              </td>
                            </tr>
                          );
                        }

                        return logsFiltrados.map((log) => {
                          const dateObj = new Date(log.created_at);
                          const dateFormatted = !isNaN(dateObj.getTime())
                            ? dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                            : '-';
                          const timeFormatted = !isNaN(dateObj.getTime())
                            ? dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                            : '';

                          const catBadgeColors: Record<string, string> = {
                            turma: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                            aluno: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                            fila: 'bg-amber-50 text-amber-700 border-amber-200',
                            frequencia: 'bg-blue-50 text-blue-700 border-blue-200',
                            professor: 'bg-purple-50 text-purple-700 border-purple-200',
                            admin: 'bg-rose-50 text-rose-700 border-rose-200',
                            sistema: 'bg-gray-100 text-gray-700 border-gray-200',
                          };

                          return (
                            <tr key={log.id} className="hover:bg-amber-50/40 transition-colors">
                              <td className="py-3.5 px-6 whitespace-nowrap">
                                <div className="font-semibold text-gray-900">{dateFormatted}</div>
                                <div className="text-[11px] text-gray-400 font-mono flex items-center gap-1">
                                  <Clock size={11} />
                                  {timeFormatted}
                                </div>
                              </td>

                              <td className="py-3.5 px-6 font-bold text-gray-800">
                                {log.acao}
                              </td>

                              <td className="py-3.5 px-6 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${catBadgeColors[log.categoria || 'sistema'] || catBadgeColors.sistema}`}>
                                  {log.categoria || 'sistema'}
                                </span>
                              </td>

                              <td className="py-3.5 px-6 text-gray-600 max-w-md break-words">
                                {log.detalhes}
                              </td>

                              <td className="py-3.5 px-6 whitespace-nowrap">
                                <div className="font-medium text-gray-800">
                                  {log.autor_nome || 'Sistema Automático'}
                                </div>
                                {log.autor_email && (
                                  <div className="text-[11px] text-gray-400">
                                    {log.autor_email}
                                  </div>
                                )}
                                {log.autor_role && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-gray-100 text-gray-500 uppercase">
                                    {log.autor_role}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Footer do Card com Total */}
                <div className="px-6 py-4 border-t border-gray-100 bg-[#FAF7F2] flex items-center justify-between text-xs text-gray-500 font-medium">
                  <span>Total de registros catalogados: <strong>{logs.length}</strong></span>
                  <span className="text-[11px] text-gray-400">Retenção segura em banco de dados</span>
                </div>
              </div>
            </div>
          ) : (
            /* --- VISÃO DE ALUNOS & FILA DE ESPERA --- */
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Tabela principal */}
              <div className="flex-1 min-w-0 space-y-6">
                <div className="bg-white rounded-2xl border border-amber-50 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                      {[
                        { id: "alunos" as const, label: "Alunos matriculados", count: alunosAtivos.length },
                        { id: "fila" as const, label: "Fila de espera", count: alunosFila.length },
                      ].map(({ id, label, count }) => (
                        <button
                          key={id}
                          onClick={() => setActiveTab(id)}
                          className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
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
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[500px]">
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
                            <td className="px-6 py-3 text-xs text-gray-500">{a.created_at ? new Date(a.created_at).toLocaleDateString('pt-BR') : '—'}</td>
                            <td className="px-6 py-3">
                              <Badge variant={a.status === "Ativo" ? "green" : "gray"}>{a.status}</Badge>
                            </td>
                            <td className="px-6 py-3 text-right">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditAluno(a);
                                }}
                                className="p-1.5 text-gray-400 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer mr-1"
                                title="Editar dados cadastrais do aluno"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setStudentHistoryModalId(a.id);
                                }}
                                className="p-1.5 text-gray-400 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer mr-1"
                                title="Ver histórico e faltas"
                              >
                                <FileText size={15} />
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
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-gray-100 bg-[#FAF8F5]">
                            <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider px-6 py-3.5">Aluno</th>
                            <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider px-6 py-3.5">Idade / Nascimento</th>
                            <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider px-6 py-3.5">Responsável / Parentesco</th>
                            <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider px-6 py-3.5">Contato</th>
                            <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider px-6 py-3.5">Turma Pretendida</th>
                            <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider px-6 py-3.5">Inscrição</th>
                            <th className="text-right text-xs font-bold text-gray-500 uppercase tracking-wider px-6 py-3.5">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {alunosFila.map((f) => {
                            const turmaPretendida = turmasDb.find(t => t.id === f.turma_id) || f.turmas;
                            return (
                              <tr
                                key={f.id}
                                onClick={() => setSelectedAluno(f)}
                                className={`hover:bg-amber-50/40 transition-colors cursor-pointer ${selectedAluno?.id === f.id ? "bg-amber-50/70" : ""}`}
                              >
                                <td className="px-6 py-3.5">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs">
                                      {(f.aluno_nome || f.resp_nome || 'A').charAt(0)}
                                    </div>
                                    <div>
                                      <p className="font-bold text-sm text-[#1C1300]">{f.aluno_nome || f.resp_nome}</p>
                                      {f.aluno_cpf && <p className="text-[11px] text-gray-400 font-mono">CPF: {f.aluno_cpf}</p>}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-3.5 text-xs text-gray-600">
                                  {f.aluno_nascimento ? (f.aluno_nascimento.includes('-') ? f.aluno_nascimento.split('T')[0].split('-').reverse().join('/') : f.aluno_nascimento) : '—'}
                                </td>
                                <td className="px-6 py-3.5">
                                  <p className="text-xs font-semibold text-gray-800">{f.resp_nome}</p>
                                  {f.resp_parentesco && (
                                    <span className="text-[10px] text-gray-400 block font-medium">({f.resp_parentesco})</span>
                                  )}
                                </td>
                                <td className="px-6 py-3.5">
                                  <a
                                    href={`https://wa.me/55${(f.resp_telefone || '').replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                                  >
                                    <Phone size={12} /> {f.resp_telefone || '—'}
                                  </a>
                                  {f.resp_email && (
                                    <span className="text-[11px] text-gray-400 block truncate max-w-[170px]">{f.resp_email}</span>
                                  )}
                                </td>
                                <td className="px-6 py-3.5">
                                  <Badge variant="amber">{turmaPretendida?.nome || 'Turma Geral'}</Badge>
                                </td>
                                <td className="px-6 py-3.5 text-xs text-gray-400">
                                  {f.created_at ? new Date(f.created_at).toLocaleDateString('pt-BR') : '—'}
                                </td>
                                <td className="px-6 py-3.5 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenEditAluno(f);
                                      }}
                                      className="p-1.5 text-gray-500 hover:text-amber-800 hover:bg-amber-50 rounded-xl transition-colors cursor-pointer border border-gray-200"
                                      title="Editar dados cadastrais do candidato"
                                    >
                                      <Pencil size={14} />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        abrirModalChamar(f);
                                      }}
                                      className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                                      title="Matricular e ativar aluno na turma"
                                    >
                                      <UserCheck size={14} /> Chamar / Aceitar
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(f);
                                      }}
                                      className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors cursor-pointer border border-red-200"
                                      title="Excluir inscrição da fila"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {alunosFila.length === 0 && (
                            <tr>
                              <td colSpan={7} className="px-6 py-12 text-center text-gray-400 text-sm">
                                <Clock size={28} className="mx-auto text-gray-300 mb-2" />
                                Nenhum aluno aguardando na fila de espera no momento.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
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
              <div className="w-full lg:w-72 flex-shrink-0">
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
                        { label: "Matriculado em", value: selectedAluno.created_at ? new Date(selectedAluno.created_at).toLocaleDateString('pt-BR') : '—' },
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
                    <button
                      onClick={() => handleOpenEditAluno(selectedAluno)}
                      className="w-full h-10 bg-amber-50 text-amber-900 border border-amber-200 text-sm font-bold rounded-xl hover:bg-amber-100 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                    >
                      <Pencil size={14} /> Editar dados cadastrais
                    </button>
                    <button
                      onClick={() => setStudentHistoryModalId(selectedAluno.id)}
                      className="w-full h-10 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    >
                      <FileText size={14} /> Ver histórico & faltas
                    </button>
                    <button onClick={() => handleDelete(selectedAluno)} className="w-full h-10 bg-red-50 text-red-700 border border-red-200 text-sm font-bold rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                      <UserX size={14} /> Excluir aluno do banco
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

      {/* Modal Criar Nova Turma */}
      {showModalNovaTurma && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-amber-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                  <BookOpen size={16} />
                </div>
                <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-base text-[#1C1300]">
                  Criar Nova Turma
                </h3>
              </div>
              <button
                onClick={() => setShowModalNovaTurma(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTurma} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nome da Turma *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Turma Infantil C - 6 a 8 anos"
                  value={novaTurma.nome}
                  onChange={(e) => setNovaTurma({ ...novaTurma, nome: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Turno e Horário *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Segunda · 14h às 15h30"
                  value={novaTurma.turno}
                  onChange={(e) => setNovaTurma({ ...novaTurma, turno: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Capacidade Total de Vagas *
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  required
                  value={novaTurma.capacidade}
                  onChange={(e) => setNovaTurma({ ...novaTurma, capacidade: Number(e.target.value) })}
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Idade Mínima (anos) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    required
                    value={novaTurma.idade_minima}
                    onChange={(e) => setNovaTurma({ ...novaTurma, idade_minima: Number(e.target.value) })}
                    className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Idade Máxima (anos) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    required
                    value={novaTurma.idade_maxima}
                    onChange={(e) => setNovaTurma({ ...novaTurma, idade_maxima: Number(e.target.value) })}
                    className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModalNovaTurma(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingTurma}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {savingTurma ? "Criando..." : "Criar Turma"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Turma */}
      {turmaParaEditar && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-amber-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                  <Pencil size={16} />
                </div>
                <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-base text-[#1C1300]">
                  Editar Turma
                </h3>
              </div>
              <button
                onClick={() => setTurmaParaEditar(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditTurma} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nome da Turma *
                </label>
                <input
                  type="text"
                  required
                  value={turmaParaEditar.nome || ""}
                  onChange={(e) => setTurmaParaEditar({ ...turmaParaEditar, nome: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Turno e Horário *
                </label>
                <input
                  type="text"
                  required
                  value={turmaParaEditar.turno || ""}
                  onChange={(e) => setTurmaParaEditar({ ...turmaParaEditar, turno: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Capacidade Total de Vagas *
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  required
                  value={turmaParaEditar.capacidade ?? 0}
                  onChange={(e) => setTurmaParaEditar({ ...turmaParaEditar, capacidade: Number(e.target.value) })}
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Idade Mínima (anos) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    required
                    value={turmaParaEditar.idade_minima ?? extractAgeRange(turmaParaEditar.nome).idade_minima}
                    onChange={(e) => setTurmaParaEditar({ ...turmaParaEditar, idade_minima: Number(e.target.value) })}
                    className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Idade Máxima (anos) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    required
                    value={turmaParaEditar.idade_maxima ?? extractAgeRange(turmaParaEditar.nome).idade_maxima}
                    onChange={(e) => setTurmaParaEditar({ ...turmaParaEditar, idade_maxima: Number(e.target.value) })}
                    className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setTurmaParaEditar(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editandoTurma}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {editandoTurma ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Novo Administrador */}
      {showModalNovoAdmin && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-amber-100">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-base text-[#1C1300]">
                    Novo Administrador
                  </h3>
                  <p className="text-xs text-gray-400">Cadastre um novo usuário com acesso administrativo</p>
                </div>
              </div>
              <button
                onClick={() => setShowModalNovoAdmin(false)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome do servidor ou gestor"
                  value={novoAdmin.nome}
                  onChange={(e) => setNovoAdmin({ ...novoAdmin, nome: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  E-mail Administrativo *
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin@cultura.bage.rs.gov.br"
                  value={novoAdmin.email}
                  onChange={(e) => setNovoAdmin({ ...novoAdmin, email: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Senha Inicial (mínimo 6 caracteres) *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={novoAdmin.password}
                  onChange={(e) => setNovoAdmin({ ...novoAdmin, password: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModalNovoAdmin(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingAdmin}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {savingAdmin ? (
                    <>
                      <Loader2 size={13} className="animate-spin" /> Cadastrando...
                    </>
                  ) : (
                    "Cadastrar Administrador"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Novo Professor */}
      {showModalNovoProfessor && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-amber-100">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <GraduationCap size={18} />
                </div>
                <div>
                  <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-base text-[#1C1300]">
                    Novo Professor
                  </h3>
                  <p className="text-xs text-gray-400">Cadastre um novo professor e atribua suas turmas</p>
                </div>
              </div>
              <button
                onClick={() => setShowModalNovoProfessor(false)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProfessor} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Prof. Mariana Luz"
                  value={novoProfessor.nome}
                  onChange={(e) => setNovoProfessor({ ...novoProfessor, nome: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    E-mail Institucional *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="professor@odessamacedo.com.br"
                    value={novoProfessor.email}
                    onChange={(e) => setNovoProfessor({ ...novoProfessor, email: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="(53) 99999-9999"
                    value={novoProfessor.telefone}
                    onChange={(e) => setNovoProfessor({ ...novoProfessor, telefone: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Especialidade / Matéria
                </label>
                <input
                  type="text"
                  placeholder="Ex: Artes Visuais, Pintura e Desenho Artístico"
                  value={novoProfessor.especialidade}
                  onChange={(e) => setNovoProfessor({ ...novoProfessor, especialidade: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Turmas Atribuídas
                </label>
                <div className="max-h-36 overflow-y-auto border border-gray-200 rounded-xl p-2.5 space-y-1.5 bg-gray-50">
                  {turmasDb.map((t) => {
                    const checked = novoProfessor.turma_ids.includes(t.id);
                    return (
                      <label key={t.id} className="flex items-center gap-2 text-xs text-gray-700 p-1 hover:bg-amber-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNovoProfessor({ ...novoProfessor, turma_ids: [...novoProfessor.turma_ids, t.id] });
                            } else {
                              setNovoProfessor({ ...novoProfessor, turma_ids: novoProfessor.turma_ids.filter((id) => id !== t.id) });
                            }
                          }}
                          className="rounded text-amber-500 focus:ring-amber-400"
                        />
                        <span className="font-medium text-gray-800">{t.nome}</span>
                        <span className="text-gray-400">({t.turno})</span>
                      </label>
                    );
                  })}
                  {turmasDb.length === 0 && (
                    <p className="text-xs text-gray-400 p-1">Nenhuma turma cadastrada.</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModalNovoProfessor(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingProfessor}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {savingProfessor ? (
                    <>
                      <Loader2 size={13} className="animate-spin" /> Cadastrando...
                    </>
                  ) : (
                    "Cadastrar Professor"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Professor */}
      {professorParaEditar && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-amber-100">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Pencil size={18} />
                </div>
                <div>
                  <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-base text-[#1C1300]">
                    Editar Professor
                  </h3>
                  <p className="text-xs text-gray-400">Atualize dados cadastrais e vínculo de turmas</p>
                </div>
              </div>
              <button
                onClick={() => setProfessorParaEditar(null)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditProfessor} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={professorEditForm.nome}
                  onChange={(e) => setProfessorEditForm({ ...professorEditForm, nome: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    E-mail Institucional *
                  </label>
                  <input
                    type="email"
                    required
                    value={professorEditForm.email}
                    onChange={(e) => setProfessorEditForm({ ...professorEditForm, email: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={professorEditForm.telefone}
                    onChange={(e) => setProfessorEditForm({ ...professorEditForm, telefone: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Especialidade / Matéria
                </label>
                <input
                  type="text"
                  value={professorEditForm.especialidade}
                  onChange={(e) => setProfessorEditForm({ ...professorEditForm, especialidade: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Turmas Atribuídas
                </label>
                <div className="max-h-36 overflow-y-auto border border-gray-200 rounded-xl p-2.5 space-y-1.5 bg-gray-50">
                  {turmasDb.map((t) => {
                    const checked = (professorEditForm.turma_ids || []).includes(t.id);
                    return (
                      <label key={t.id} className="flex items-center gap-2 text-xs text-gray-700 p-1 hover:bg-amber-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const current = professorEditForm.turma_ids || [];
                            if (e.target.checked) {
                              setProfessorEditForm({ ...professorEditForm, turma_ids: [...current, t.id] });
                            } else {
                              setProfessorEditForm({ ...professorEditForm, turma_ids: current.filter((id: string) => id !== t.id) });
                            }
                          }}
                          className="rounded text-amber-500 focus:ring-amber-400"
                        />
                        <span className="font-medium text-gray-800">{t.nome}</span>
                        <span className="text-gray-400">({t.turno})</span>
                      </label>
                    );
                  })}
                  {turmasDb.length === 0 && (
                    <p className="text-xs text-gray-400 p-1">Nenhuma turma cadastrada.</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setProfessorParaEditar(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editandoProfessor}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {editandoProfessor ? (
                    <>
                      <Loader2 size={13} className="animate-spin" /> Salvando...
                    </>
                  ) : (
                    "Salvar Alterações"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Chamada da Fila e Envio de E-mail */}
      {alunoParaChamar && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-amber-100">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-green-50 text-green-700 flex items-center justify-center font-bold">
                  <UserCheck size={20} />
                </div>
                <div>
                  <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-base text-[#1C1300]">
                    Chamar Aluno da Fila de Espera
                  </h3>
                  <p className="text-xs text-gray-400">Confirmação de matrícula e envio automático de acesso</p>
                </div>
              </div>
              <button
                onClick={() => setAlunoParaChamar(null)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Aluno:</span>
                  <span className="font-bold text-gray-900">{alunoParaChamar.aluno_nome}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Responsável:</span>
                  <span className="font-semibold text-gray-800">{alunoParaChamar.resp_nome}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">E-mail:</span>
                  <span className="font-semibold text-amber-900">{alunoParaChamar.resp_email || "Não informado"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Telefone / WhatsApp:</span>
                  <span className="font-semibold text-gray-800">{alunoParaChamar.resp_telefone}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Confirmar Turma de Destino *
                </label>
                <select
                  value={turmaDestinoChamar}
                  onChange={(e) => setTurmaDestinoChamar(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 focus:bg-white"
                >
                  {turmasDb.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome} ({t.turno}) — Vagas disponíveis: {t.capacidade}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3.5 bg-gray-50 border border-gray-200/80 rounded-xl text-xs text-gray-600 leading-relaxed space-y-1">
                <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                  <Mail size={13} className="text-amber-600" /> O que acontecerá ao confirmar:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-gray-600 text-[11px]">
                  <li>O status do aluno mudará para <strong>Ativo</strong> e 1 vaga será deduzida da turma.</li>
                  <li>Um usuário com perfil de <strong>Responsável</strong> será criado no sistema.</li>
                  <li>Um e-mail será enviado com as informações da turma e o link para definição de senha.</li>
                  <li>O responsável poderá acompanhar as presenças e faltas do aluno.</li>
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
                      <Loader2 size={14} className="animate-spin" /> Processando chamada...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={14} /> Confirmar e Enviar E-mail
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Resultado da Chamada com Link de Acesso / WhatsApp */}
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
                <strong>{resultadoChamada.aluno.aluno_nome}</strong> agora está com status Ativo na turma.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-green-50/80 border border-green-200 rounded-2xl text-xs text-green-900 flex items-start gap-2.5">
                <Mail size={16} className="text-green-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">E-mail transacional gerado com sucesso</p>
                  <p className="text-[11px] text-green-800 mt-0.5">
                    As instruções de acesso e detalhes da turma foram enviadas para <strong>{resultadoChamada.aluno.resp_email || "o e-mail informado"}</strong>.
                  </p>
                </div>
              </div>

              {resultadoChamada.action_link && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                      <Copy size={13} className="text-amber-600" /> Link de Primeiro Acesso (Backup / WhatsApp)
                    </span>
                    {copiedLink && (
                      <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                        Copiado!
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={resultadoChamada.action_link}
                    className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded-lg text-gray-600 font-mono select-all"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(resultadoChamada.action_link || "");
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 3000);
                      }}
                      className="flex-1 py-2 px-3 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Copy size={13} /> Copiar Link
                    </button>

                    {resultadoChamada.aluno.resp_telefone && (
                      <a
                        href={`https://wa.me/55${resultadoChamada.aluno.resp_telefone.replace(/\D/g, '')}?text=${encodeURIComponent(
                          `Olá ${resultadoChamada.aluno.resp_nome}! Temos uma ótima notícia: o(a) aluno(a) ${resultadoChamada.aluno.aluno_nome} foi chamado(a) da fila e está matriculado(a) nas aulas de desenho do CDE Odessa Macedo! Para acompanhar a frequência e faltas, defina sua senha de acesso pelo link: ${resultadoChamada.action_link}`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-2 px-3 text-xs font-bold text-white bg-green-600 rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Phone size={13} /> Enviar no WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setResultadoChamada(null)}
                  className="w-full py-2.5 px-4 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  Concluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Administrador */}
      {adminParaEditar && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-amber-100">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Pencil size={18} />
                </div>
                <div>
                  <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-base text-[#1C1300]">
                    Editar Administrador
                  </h3>
                  <p className="text-xs text-gray-400">Atualize os dados cadastrais da conta administrativa</p>
                </div>
              </div>
              <button
                onClick={() => setAdminParaEditar(null)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nome do Administrador *
                </label>
                <input
                  type="text"
                  required
                  value={adminEditForm.nome}
                  onChange={(e) => setAdminEditForm({ ...adminEditForm, nome: e.target.value })}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  E-mail institucional *
                </label>
                <input
                  type="email"
                  required
                  value={adminEditForm.email}
                  onChange={(e) => setAdminEditForm({ ...adminEditForm, email: e.target.value })}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setAdminParaEditar(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editandoAdmin}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {editandoAdmin ? (
                    <>
                      <Loader2 size={13} className="animate-spin" /> Salvando...
                    </>
                  ) : (
                    <>
                      <Save size={13} /> Salvar Alterações
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Dados Cadastrais do Aluno / Responsável */}
      {alunoParaEditar && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-amber-100 my-8">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <Pencil size={20} />
                </div>
                <div>
                  <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-lg text-[#1C1300]">
                    Editar Cadastro do Aluno
                  </h3>
                  <p className="text-xs text-gray-500">
                    Modifique os dados cadastrais do aluno e de seu responsável legal
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAlunoParaEditar(null)}
                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-xl hover:bg-gray-100 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEditAluno} className="space-y-5">
              {/* DADOS DO ALUNO */}
              <div>
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-3">
                  1. Dados do Aluno
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Nome Completo do Aluno *</label>
                    <input
                      type="text"
                      required
                      value={alunoEditForm.aluno_nome || ''}
                      onChange={(e) => setAlunoEditForm({ ...alunoEditForm, aluno_nome: e.target.value })}
                      className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Data de Nascimento</label>
                    <input
                      type="date"
                      value={alunoEditForm.aluno_nascimento || ''}
                      onChange={(e) => setAlunoEditForm({ ...alunoEditForm, aluno_nascimento: e.target.value })}
                      className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">CPF do Aluno</label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={alunoEditForm.aluno_cpf || ''}
                      onChange={(e) => setAlunoEditForm({ ...alunoEditForm, aluno_cpf: e.target.value })}
                      className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Gênero / Sexo</label>
                    <select
                      value={alunoEditForm.aluno_sexo || ''}
                      onChange={(e) => setAlunoEditForm({ ...alunoEditForm, aluno_sexo: e.target.value })}
                      className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                    >
                      <option value="">Selecione...</option>
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                      <option value="Outro">Outro / Prefere não informar</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Turma Matriculada / Alocada</label>
                    <select
                      value={alunoEditForm.turma_id || ''}
                      onChange={(e) => setAlunoEditForm({ ...alunoEditForm, turma_id: e.target.value })}
                      className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                    >
                      <option value="">Sem Turma (Geral / Fila)</option>
                      {turmasDb.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nome} ({t.turno}) - {t.capacidade} vaga(s)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* DADOS DO RESPONSÁVEL */}
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-3">
                  2. Dados do Responsável Legal
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Nome do Responsável *</label>
                    <input
                      type="text"
                      required
                      value={alunoEditForm.resp_nome || ''}
                      onChange={(e) => setAlunoEditForm({ ...alunoEditForm, resp_nome: e.target.value })}
                      className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Parentesco</label>
                    <input
                      type="text"
                      placeholder="Ex: Mãe, Pai, Avó, Tutor"
                      value={alunoEditForm.resp_parentesco || ''}
                      onChange={(e) => setAlunoEditForm({ ...alunoEditForm, resp_parentesco: e.target.value })}
                      className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">CPF do Responsável</label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={alunoEditForm.resp_cpf || ''}
                      onChange={(e) => setAlunoEditForm({ ...alunoEditForm, resp_cpf: e.target.value })}
                      className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">E-mail do Responsável</label>
                    <input
                      type="email"
                      value={alunoEditForm.resp_email || ''}
                      onChange={(e) => setAlunoEditForm({ ...alunoEditForm, resp_email: e.target.value })}
                      className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Telefone / WhatsApp</label>
                    <input
                      type="tel"
                      value={alunoEditForm.resp_telefone || ''}
                      onChange={(e) => setAlunoEditForm({ ...alunoEditForm, resp_telefone: e.target.value })}
                      className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Bairro</label>
                    <input
                      type="text"
                      value={alunoEditForm.resp_bairro || ''}
                      onChange={(e) => setAlunoEditForm({ ...alunoEditForm, resp_bairro: e.target.value })}
                      className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Endereço Residencial</label>
                    <input
                      type="text"
                      value={alunoEditForm.resp_endereco || ''}
                      onChange={(e) => setAlunoEditForm({ ...alunoEditForm, resp_endereco: e.target.value })}
                      className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setAlunoParaEditar(null)}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editandoAluno}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {editandoAluno ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Salvando...
                    </>
                  ) : (
                    <>
                      <Save size={14} /> Salvar Dados do Aluno
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Histórico Individual de Faltas e Presenças */}
      {studentHistoryModalId && (
        <StudentHistoryModal
          alunoId={studentHistoryModalId}
          onClose={() => setStudentHistoryModalId(null)}
          onUpdate={() => {
            fetchAlertasFaltas();
            fetchAlunos();
            refreshTurmaAlunos();
          }}
        />
      )}
    </div>
  );
}
