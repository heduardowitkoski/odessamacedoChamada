import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Filter, Pencil, BookOpen, Plus, ListOrdered, ChevronRight, Award, Sparkles, ArrowRight } from "lucide-react";
import { SpotBar } from "../../components/ui/SpotBar";

// Interface baseada no banco de dados e UI
interface Turma {
  id: string;
  nome: string;
  turno: string;
  capacidade: number;
}

// Simulando propriedades que na UI antiga eram "hardcoded" e que ainda não temos no DB real
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

export default function PortalScreen() {
  const [activeFilter, setActiveFilter] = useState("Todas");
  const [search, setSearch] = useState("");
  const [turmasDb, setTurmasDb] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);

  const filters = ["Todas", "Com vagas", "Turma cheia"];

  useEffect(() => {
    const apiBase = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:3000'
      : (import.meta as any).env?.VITE_API_URL || 'https://odessamacedochamada.onrender.com';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    fetch(`${apiBase}/turmas`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        clearTimeout(timeout);
        if (Array.isArray(data) && data.length > 0) {
          setTurmasDb(data);
          setLoading(false);
          return;
        }
        throw new Error('Fallback');
      })
      .catch(() => {
        // Fallback robusto garantindo que o portal nunca fique quebrado ou travado
        setTurmasDb([
          { id: "infantil-a", nome: "Turma Infantil A", turno: "Terça · 14h às 15h", capacidade: 3 },
          { id: "infantil-b", nome: "Turma Infantil B", turno: "Quarta · 14h às 15h30", capacidade: 0 },
          { id: "juvenil-a", nome: "Turma Juvenil A", turno: "Quinta · 14h às 15h30", capacidade: 4 },
          { id: "juvenil-b", nome: "Turma Juvenil B", turno: "Sexta · 14h às 16h", capacidade: 0 },
          { id: "adulto", nome: "Turma Adulto", turno: "Terça · 18h30 às 20h", capacidade: 6 },
          { id: "idoso", nome: "Turma Melhor Idade", turno: "Quarta · 9h às 10h30", capacidade: 5 },
        ]);
        setLoading(false);
      });
  }, []);

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

  return (
    <div className="min-h-screen bg-[#FAFAF7] font-['Inter',sans-serif]">
      {/* Header */}
      <header className="bg-white border-b border-amber-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1440px] mx-auto px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
              <Pencil size={16} className="text-white" />
            </div>
            <div className="leading-tight">
              <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[#1C1300] text-sm block">Centro de Desenvolvimento da Expressão</span>
              <span className="text-amber-600 text-xs font-semibold">Odessa Macedo · Aulas de Desenho</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-7">
            <Link to="/" className="text-sm font-semibold text-amber-600">
              Turmas
            </Link>
            <Link to="/mural" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1.5">
              <span>Mural & Obras</span>
              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded-full">Novo</span>
            </Link>
            <Link to="/login" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
              Diário & Login
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/mural" className="hidden sm:inline-flex px-4 py-2 text-sm font-semibold text-amber-700 border border-amber-200 rounded-xl hover:bg-amber-50 transition-colors items-center gap-1.5">
              <Sparkles size={14} className="text-amber-500" />
              Ver Mural
            </Link>
            <Link to="/login" className="px-4 py-2 text-sm font-semibold text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-colors shadow-sm">
              Acesso ao Sistema
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
              <Link to="/mural" className="px-6 py-3 bg-white/10 text-white text-sm font-semibold rounded-xl hover:bg-white/20 transition-colors border border-white/20 flex items-center gap-2">
                <Sparkles size={16} className="text-amber-300" /> Explorar Galeria de Obras
              </Link>
            </div>
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
                  const getColor = (nome?: string) => {
                    if (!nome) return "amber";
                    if (nome.includes("Infantil A")) return "yellow";
                    if (nome.includes("Infantil B")) return "orange";
                    if (nome.includes("Juvenil A")) return "teal";
                    if (nome.includes("Juvenil B")) return "blue";
                    if (nome.includes("Adulto")) return "purple";
                    if (nome.includes("Melhor Idade")) return "green";
                    return "amber";
                  };
                  const colorKey = getColor(turma?.nome);
                  const c = COLOR_MAP[colorKey] || COLOR_MAP.amber;
                  const spots = turma?.capacidade ?? 0;
                  const total = 15; // Lotação padrão máxima
                  const isFull = spots <= 0;
                  
                  return (
                    <div key={turma.id} className={`bg-white rounded-2xl border-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all ${isFull ? "border-gray-200" : c.accent}`}>
                      {/* Color stripe */}
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

            {/* Destaque do Mural de Tarefas e Obras */}
            <div className="mt-12 bg-white rounded-3xl border border-amber-200/80 p-6 md:p-8 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shrink-0 shadow-md">
                  <Sparkles size={22} />
                </div>
                <div>
                  <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-base md:text-lg text-[#1C1300]">
                    Mural de Atividades & Galeria de Desenhos
                  </h3>
                  <p className="text-xs md:text-sm text-gray-500 mt-1 max-w-xl leading-relaxed">
                    Confira a exposição dos trabalhos artísticos, desenhos, técnicas de pintura e criações desenvolvidas pelas turmas do CDE Odessa Macedo.
                  </p>
                </div>
              </div>

              <Link
                to="/mural"
                className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-2 shrink-0"
              >
                <span>Acessar Mural</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
