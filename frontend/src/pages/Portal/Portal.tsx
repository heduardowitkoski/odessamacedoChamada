import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Filter, Pencil, BookOpen, Plus, ListOrdered, ChevronRight, Award, Users, Clock, X, Loader2 } from "lucide-react";
import { SpotBar } from "../../components/ui/SpotBar";
import { supabase } from "../../lib/supabase";

// Interface baseada no banco de dados e UI
interface Turma {
  id: string;
  nome: string;
  turno: string;
  capacidade: number;
}

const MOCK_EXTRAS = {
  faixa: "Geral",
  descricao: "Turma de artes do centro Odessa Macedo",
};

// cores por turma
const COLOR_MAP: Record<string, { accent: string; badge: string; badgeText: string; btnFull: string; btnOpen: string; dot: string }> = {
  yellow:  { accent: "border-yellow-300", badge: "bg-yellow-100", badgeText: "text-yellow-800", btnFull: "bg-amber-500 hover:bg-amber-600",   btnOpen: "bg-yellow-500 hover:bg-yellow-600",  dot: "bg-yellow-400" },
  orange:  { accent: "border-orange-300", badge: "bg-orange-100", badgeText: "text-orange-800", btnFull: "bg-orange-500 hover:bg-orange-600",  btnOpen: "bg-orange-500 hover:bg-orange-600",  dot: "bg-orange-400" },
  teal:    { accent: "border-teal-300",   badge: "bg-teal-100",   badgeText: "text-teal-800",   btnFull: "bg-amber-500 hover:bg-amber-600",   btnOpen: "bg-teal-500 hover:bg-teal-600",     dot: "bg-teal-400"   },
  blue:    { accent: "border-blue-300",   badge: "bg-blue-100",   badgeText: "text-blue-800",   btnFull: "bg-amber-500 hover:bg-amber-600",   btnOpen: "bg-blue-500 hover:bg-blue-600",     dot: "bg-blue-400"   },
  purple:  { accent: "border-purple-300", badge: "bg-purple-100", badgeText: "text-purple-800", btnFull: "bg-amber-500 hover:bg-amber-600",   btnOpen: "bg-purple-500 hover:bg-purple-600", dot: "bg-purple-400" },
  green:   { accent: "border-green-300",  badge: "bg-green-100",  badgeText: "text-green-800",  btnFull: "bg-amber-500 hover:bg-amber-600",   btnOpen: "bg-green-500 hover:bg-green-600",   dot: "bg-green-400"  },
  amber:   { accent: "border-amber-300",  badge: "bg-amber-100",  badgeText: "text-amber-800",  btnFull: "bg-amber-500 hover:bg-amber-600",   btnOpen: "bg-amber-500 hover:bg-amber-600",   dot: "bg-amber-400"  },
};

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'https://odessamacedochamada.onrender.com';

export default function PortalScreen() {
  const [activeFilter, setActiveFilter] = useState("Todas");
  const [search, setSearch] = useState("");
  const [turmasDb, setTurmasDb] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ matriculados: 0, fila: 0, vagas: 0 });

  // Modal verificar posição na fila
  const [showFilaModal, setShowFilaModal] = useState(false);
  const [filaEmail, setFilaEmail] = useState("");
  const [filaLoading, setFilaLoading] = useState(false);
  const [filaErro, setFilaErro] = useState("");
  const navigate = useNavigate();

  const filters = ["Todas", "Com vagas", "Turma cheia"];

  useEffect(() => {
    fetch(`${API_BASE}/turmas`)
      .then((res) => res.json())
      .then((data) => {
        setTurmasDb(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Erro ao buscar turmas", err);
        setLoading(false);
      });

    // Buscar stats de alunos para o Hero
    fetch(`${API_BASE}/alunos`)
      .then((res) => res.json())
      .then((alunos: any[]) => {
        if (Array.isArray(alunos)) {
          setStats((prev) => ({
            ...prev,
            matriculados: alunos.filter((a) => a.status === "Ativo").length,
            fila: alunos.filter((a) => a.status === "Fila").length,
          }));
        }
      })
      .catch(() => {});
  }, []);

  // Atualiza vagas abertas quando turmas carregam
  useEffect(() => {
    if (turmasDb.length > 0) {
      const vagasAbertas = turmasDb.reduce((acc, t) => acc + Math.max(0, t.capacidade), 0);
      setStats((prev) => ({ ...prev, vagas: vagasAbertas }));
    }
  }, [turmasDb]);

  const displayed = turmasDb.filter((t) => {
    const spots = t.capacidade;
    if (activeFilter === "Com vagas") return spots > 0;
    if (activeFilter === "Turma cheia") return spots === 0;
    return true;
  }).filter((t) =>
    search === "" ||
    t.nome.toLowerCase().includes(search.toLowerCase()) ||
    t.turno.toLowerCase().includes(search.toLowerCase())
  );

  const handleVerificarFila = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filaEmail.trim()) return;
    setFilaLoading(true);
    setFilaErro("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email?.toLowerCase() === filaEmail.trim().toLowerCase()) {
        navigate("/responsavel");
        return;
      }
      navigate("/login");
    } catch {
      setFilaErro("Ocorreu um erro. Tente novamente.");
    } finally {
      setFilaLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF7] font-['Inter',sans-serif]">
      {/* Header */}
      <header className="bg-white border-b border-amber-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1440px] mx-auto px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
              <Pencil size={16} className="text-white" />
            </div>
            <div className="leading-tight">
              <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[#1C1300] text-sm block">Centro de Desenvolvimento da Expressão</span>
              <span className="text-amber-600 text-xs font-semibold">Odessa Macedo · Aulas de Desenho</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-7">
            {["Início", "Turmas", "Agenda", "Contato"].map((item) => (
              <button key={item} className={`text-sm font-medium transition-colors ${item === "Turmas" ? "text-amber-600" : "text-gray-500 hover:text-gray-900"}`}>
                {item}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button
              id="btn-verificar-fila"
              onClick={() => setShowFilaModal(true)}
              className="px-4 py-2 text-sm font-semibold text-amber-700 border border-amber-200 rounded-xl hover:bg-amber-50 transition-colors"
            >
              Verificar posição na fila
            </button>
            <Link to="/admin" className="px-4 py-2 text-sm font-semibold text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-colors shadow-sm">
              Área administrativa
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#1C1300] to-[#3D2800] text-white overflow-hidden relative">
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
          backgroundImage: "repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)",
          backgroundSize: "30px 30px"
        }} />
        <div className="max-w-[1440px] mx-auto px-8 py-16 flex flex-col md:flex-row items-center gap-12 relative">
          <div className="flex-1">
            <span className="inline-flex items-center gap-2 bg-amber-400/20 border border-amber-400/30 text-amber-200 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
              <Award size={12} /> Programa Cultural da Prefeitura de Bagé
            </span>
            <h1 className="font-['Plus_Jakarta_Sans',sans-serif] text-4xl md:text-5xl font-extrabold leading-tight mb-4">
              Aulas de Desenho<br />
              <span className="text-amber-300">para todas as idades</span>
            </h1>
            <p className="text-amber-100/80 text-base max-w-lg mb-8 leading-relaxed">
              Turmas organizadas por faixa etária, do Infantil ao Melhor Idade. Verifique as vagas disponíveis e faça sua inscrição ou entre na fila de espera.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Link to="/inscrever" className="px-6 py-3 bg-amber-400 text-[#1C1300] text-sm font-bold rounded-xl hover:bg-amber-300 transition-colors shadow-lg flex items-center gap-2">
                <Plus size={16} /> Inscrever-se agora
              </Link>
              <button
                onClick={() => setShowFilaModal(true)}
                className="px-6 py-3 bg-white/10 text-white text-sm font-semibold rounded-xl hover:bg-white/20 transition-colors border border-white/20 flex items-center gap-2"
              >
                <ListOrdered size={16} /> Ver fila de espera
              </button>
            </div>
          </div>

          {/* Stats dinâmicas do Hero */}
          <div className="flex gap-4 flex-wrap justify-center md:justify-end">
            {[
              { label: "Alunos matriculados", value: stats.matriculados, sub: "em turmas ativas", icon: <Users size={18} className="text-amber-300" /> },
              { label: "Na fila de espera",   value: stats.fila,         sub: "aguardando vaga",  icon: <Clock size={18} className="text-amber-300" /> },
              { label: "Vagas abertas",        value: stats.vagas,        sub: "disponíveis agora", icon: <Award size={18} className="text-amber-300" /> },
            ].map(({ label, value, sub, icon }) => (
              <div key={label} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-6 py-5 text-center min-w-[130px]">
                <div className="flex justify-center mb-1">{icon}</div>
                <p className="text-3xl font-['Plus_Jakarta_Sans',sans-serif] font-extrabold text-amber-300">{value}</p>
                <p className="text-amber-100 text-xs font-semibold mt-1">{label}</p>
                <p className="text-amber-300/60 text-[10px] mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="max-w-[1440px] mx-auto px-8 py-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              type="text"
              placeholder="Buscar turma ou turno..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 pl-10 pr-4 rounded-xl border border-amber-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white w-64"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeFilter === f
                    ? "bg-amber-500 text-white shadow-md"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-amber-300 hover:text-amber-700"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Turmas grid */}
      <main className="max-w-[1440px] mx-auto px-8 pb-16">
        <div className="flex gap-8">
          <div className="flex-1">
            <p className="text-sm text-gray-400 mb-5">
              <span className="font-semibold text-gray-700">{displayed.length}</span> turmas encontradas
            </p>

            {loading ? (
               <div className="text-gray-500 py-10 text-center animate-pulse">Carregando turmas do banco de dados...</div>
            ) : displayed.length === 0 ? (
               <div className="text-gray-500 py-10 text-center bg-white rounded-2xl border border-dashed border-gray-300">Nenhuma turma encontrada. Cadastre no painel admin!</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {displayed.map((turma) => {
                  const getColor = (nome: string) => {
                    if (nome.includes("Infantil A")) return "yellow";
                    if (nome.includes("Infantil B")) return "orange";
                    if (nome.includes("Juvenil A")) return "teal";
                    if (nome.includes("Juvenil B")) return "blue";
                    if (nome.includes("Adulto")) return "purple";
                    if (nome.includes("Melhor Idade")) return "green";
                    return "amber";
                  };
                  const colorKey = getColor(turma.nome);
                  const c = COLOR_MAP[colorKey];
                  const spots = turma.capacidade;
                  const total = 15;
                  const isFull = spots <= 0;

                  return (
                    <div key={turma.id} className={`bg-white rounded-2xl border-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all ${isFull ? "border-gray-200" : c.accent}`}>
                      <div className={`h-2 rounded-t-2xl ${c.dot}`} />

                      <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[#1C1300] text-base leading-tight">{turma.nome}</h3>
                            <span className={`inline-block mt-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full ${c.badge} ${c.badgeText}`}>
                              {turma.turno}
                            </span>
                          </div>
                          {isFull ? (
                            <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full whitespace-nowrap">Turma cheia</span>
                          ) : (
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                              Há vagas
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-gray-500 leading-relaxed mb-4">{MOCK_EXTRAS.descricao}</p>

                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
                          <BookOpen size={12} />
                          {turma.turno}
                        </div>

                        <SpotBar spots={spots} total={total} />

                        <div className="mt-4 flex gap-2">
                          {isFull ? (
                            <Link to="/inscrever" className="flex-1 h-9 bg-amber-500 text-white text-sm font-semibold rounded-xl hover:bg-amber-600 transition-colors flex items-center justify-center gap-1.5">
                              <ListOrdered size={14} /> Entrar na fila
                            </Link>
                          ) : (
                            <Link to="/inscrever" className={`flex-1 h-9 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 ${c.btnOpen}`}>
                              <Plus size={14} /> Inscrever-se
                            </Link>
                          )}
                          <button className="h-9 w-9 border border-gray-200 text-gray-400 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center">
                            <ChevronRight size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal: Verificar posição na fila */}
      {showFilaModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-amber-100">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <ListOrdered size={16} />
                </div>
                <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-base text-[#1C1300]">
                  Verificar posição na fila
                </h3>
              </div>
              <button
                onClick={() => { setShowFilaModal(false); setFilaErro(""); setFilaEmail(""); }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Informe o e-mail cadastrado na inscrição para acessar o portal do responsável e ver a situação do aluno na fila de espera.
            </p>

            <form onSubmit={handleVerificarFila} className="space-y-3">
              <input
                type="email"
                required
                placeholder="seu@email.com"
                value={filaEmail}
                onChange={(e) => setFilaEmail(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 focus:bg-white"
              />
              {filaErro && <p className="text-xs text-red-600">{filaErro}</p>}
              <button
                type="submit"
                disabled={filaLoading}
                className="w-full h-10 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {filaLoading ? <><Loader2 size={14} className="animate-spin" /> Verificando...</> : "Acessar minha conta"}
              </button>
            </form>

            <p className="text-center text-xs text-gray-400 mt-3">
              Ainda não tem conta?{" "}
              <Link to="/inscrever" className="text-amber-600 font-semibold hover:underline" onClick={() => setShowFilaModal(false)}>
                Inscreva-se aqui
              </Link>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
