import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Home, Users, ListOrdered, BookOpen, BarChart2, Settings, UserCheck, Clock, Pencil, Palette, LogOut, Bell, Download, Plus, MoreHorizontal, UserX, RefreshCw, FileText, User, Phone, TrendingUp
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Avatar } from "../../components/ui/Avatar";
import { Badge } from "../../components/ui/Badge";
import { supabase } from "../../lib/supabase";

export default function AdminDashboard() {
  const [alunosDb, setAlunosDb] = useState<any[]>([]);
  const [turmasDb, setTurmasDb] = useState<any[]>([]);
  const [selectedAluno, setSelectedAluno] = useState<any>(null);
  const [activeMenu, setActiveMenu] = useState("Alunos");
  const [activeTab, setActiveTab] = useState<"alunos" | "fila">("alunos");
  const navigate = useNavigate();

  const fetchAlunos = () => {
    fetch("http://localhost:3000/alunos")
      .then(res => res.json())
      .then(data => setAlunosDb(data))
      .catch(err => console.error(err));
  };

  const fetchTurmas = () => {
    fetch("http://localhost:3000/turmas")
      .then(res => res.json())
      .then(data => setTurmasDb(data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchAlunos();
    fetchTurmas();
  }, []);

  const alunosAtivos = alunosDb.filter(a => a.status === 'Ativo');
  const alunosFila = alunosDb.filter(a => a.status === 'Fila');
  
  const vagasAbertas = turmasDb.reduce((acc, curr) => acc + (curr.capacidade > 0 ? curr.capacidade : 0), 0);
  const turmasAtivas = turmasDb.length;

  const generateChartData = (alunos: any[]) => {
    const turmasCount = alunos.reduce((acc, curr) => {
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
      const res = await fetch(`http://localhost:3000/alunos/${aluno.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Ativo", turma_id: aluno.turma_id })
      });
      if (res.ok) {
        alert("Aluno chamado com sucesso!");
        fetchAlunos();
        fetchTurmas();
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
      const res = await fetch(`http://localhost:3000/alunos/${aluno.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Inativo", turma_id: aluno.turma_id })
      });
      if (res.ok) {
        alert("Matrícula cancelada com sucesso!");
        setSelectedAluno(null);
        fetchAlunos();
        fetchTurmas();
      } else {
        const err = await res.json();
        alert("Erro ao cancelar: " + err.message);
      }
    } catch (e) {
      alert("Erro de conexão");
    }
  };

  const menuItems = [
    { icon: <Home size={17} />, label: "Dashboard" },
    { icon: <Users size={17} />, label: "Alunos", badge: alunosAtivos.length },
    { icon: <ListOrdered size={17} />, label: "Fila de espera", badge: alunosFila.length },
    { icon: <BookOpen size={17} />, label: "Turmas" },
    { icon: <BarChart2 size={17} />, label: "Relatórios" },
    { icon: <Settings size={17} />, label: "Configurações" },
  ];

  const stats = [
    { label: "Alunos matriculados", value: alunosAtivos.length, icon: <UserCheck size={20} />, color: "text-amber-600", bg: "bg-amber-100" },
    { label: "Na fila de espera", value: alunosFila.length, icon: <Clock size={20} />, color: "text-orange-600", bg: "bg-orange-100" },
    { label: "Vagas abertas", value: vagasAbertas, icon: <Pencil size={20} />, color: "text-emerald-600", bg: "bg-emerald-100" },
    { label: "Turmas ativas", value: turmasAtivas, icon: <Palette size={20} />, color: "text-blue-600", bg: "bg-blue-100" },
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
          {menuItems.map(({ icon, label, badge }) => (
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
                <span className={`text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${label === "Fila de espera" ? "bg-orange-500" : "bg-amber-600"}`}>
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
            <h1 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[#1C1300] text-lg">Gestão de Alunos · Aulas de Desenho</h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full"></span>
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
                        {chartData.map((entry) => (
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
        </div>
      </div>
    </div>
  );
}
