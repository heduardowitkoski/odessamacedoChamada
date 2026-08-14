import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Filter, Pencil, BookOpen, Plus, ListOrdered, ChevronRight, Award } from "lucide-react";
import { SpotBar } from "../../components/ui/SpotBar";

// Interface baseada no banco de dados e UI
interface Turma {
  id: string;
  nome: string;
  turno: string;
  capacidade: number;
}

// Simulando propriedades que na UI antiga eram "hardcoded" e que ainda não temos no DB real
// Futuramente o backend também retornará essas infos (faixa, descricão, etc)
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
    fetch("https://odessamacedochamada.onrender.com/turmas")
      .then((res) => res.json())
      .then((data) => {
        setTurmasDb(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Erro ao buscar turmas", err);
        setLoading(false);
      });
  }, []);

  const displayed = turmasDb.filter((t) => {
    // Por enquanto simulamos os spots vazios como se sempre tivesse vaga, já que a API ainda não conta alunos
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
            <button className="px-4 py-2 text-sm font-semibold text-amber-700 border border-amber-200 rounded-xl hover:bg-amber-50 transition-colors">
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
              <button className="px-6 py-3 bg-white/10 text-white text-sm font-semibold rounded-xl hover:bg-white/20 transition-colors border border-white/20 flex items-center gap-2">
                <ListOrdered size={16} /> Ver fila de espera
              </button>
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
                              {spots} vaga{spots > 1 ? "s" : ""}
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
    </div>
  );
}
