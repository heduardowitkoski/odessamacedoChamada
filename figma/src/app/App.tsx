import { useState } from "react";
import {
  Search, Users, Clock, CheckCircle,
  AlertCircle, Bell, Settings, BarChart2, Home, FileText,
  LogOut, Filter, Download, MoreHorizontal, Plus, ChevronRight,
  ArrowRight, Award, TrendingUp, User, Phone,
  ClipboardList, ListOrdered, UserCheck, UserX, RefreshCw,
  Pencil, Palette, Baby, BookOpen
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────────

type Screen = "portal" | "aluno" | "admin";
type FormStep = 0 | 1 | 2 | 3;

// ─── Turmas de Desenho por Faixa Etária ──────────────────────────────────────

const TURMAS = [
  {
    id: "infantil-a",
    label: "Turma Infantil A",
    faixa: "5 a 7 anos",
    horario: "Terça · 14h às 15h",
    descricao: "Introdução ao desenho por meio de brincadeiras, cores e formas básicas.",
    color: "yellow",
    spots: 3,
    total: 15,
  },
  {
    id: "infantil-b",
    label: "Turma Infantil B",
    faixa: "8 a 10 anos",
    horario: "Quarta · 14h às 15h30",
    descricao: "Técnicas de observação, perspectiva simples e narrativas visuais.",
    color: "orange",
    spots: 0,
    total: 15,
  },
  {
    id: "juvenil-a",
    label: "Turma Juvenil A",
    faixa: "11 a 13 anos",
    horario: "Quinta · 14h às 15h30",
    descricao: "Desenho de figura humana, croqui e introdução ao grafite e carvão.",
    color: "teal",
    spots: 4,
    total: 12,
  },
  {
    id: "juvenil-b",
    label: "Turma Juvenil B",
    faixa: "14 a 17 anos",
    horario: "Sexta · 14h às 16h",
    descricao: "Técnicas avançadas: perspectiva, luz e sombra, composição e portfólio.",
    color: "blue",
    spots: 0,
    total: 12,
  },
  {
    id: "adulto",
    label: "Turma Adulto",
    faixa: "18 anos ou mais",
    horario: "Terça · 18h30 às 20h",
    descricao: "Desenho artístico livre, apreciação estética e técnicas mistas.",
    color: "purple",
    spots: 6,
    total: 15,
  },
  {
    id: "idoso",
    label: "Turma Melhor Idade",
    faixa: "60 anos ou mais",
    horario: "Quarta · 9h às 10h30",
    descricao: "Atividade terapêutica com foco em expressão criativa e bem-estar.",
    color: "green",
    spots: 5,
    total: 12,
  },
];

const ALUNOS = [
  { id: 1, name: "Ana Beatriz Souza", turma: "Turma Infantil A", faixa: "5 a 7 anos", age: 6, guardian: "Maria Souza", phone: "(53) 99801-2345", since: "Mar/2025", status: "Ativo", img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&auto=format" },
  { id: 2, name: "Lucas Ferreira", turma: "Turma Juvenil A", faixa: "11 a 13 anos", age: 12, guardian: "João Ferreira", phone: "(53) 99812-3456", since: "Jan/2025", status: "Ativo", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&auto=format" },
  { id: 3, name: "Sofia Ribeiro", turma: "Turma Juvenil B", faixa: "14 a 17 anos", age: 15, guardian: "Carla Ribeiro", phone: "(53) 99823-4567", since: "Jun/2024", status: "Ativo", img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&auto=format" },
  { id: 4, name: "Pedro Alves", turma: "Turma Infantil B", faixa: "8 a 10 anos", age: 9, guardian: "Roberto Alves", phone: "(53) 99834-5678", since: "Ago/2024", status: "Ativo", img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&auto=format" },
  { id: 5, name: "Dona Tereza Barros", turma: "Turma Melhor Idade", faixa: "60 anos ou mais", age: 67, guardian: "—", phone: "(53) 99845-6789", since: "Fev/2025", status: "Ativo", img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&auto=format" },
  { id: 6, name: "Marcos Vinicius Lima", turma: "Turma Adulto", faixa: "18 anos ou mais", age: 34, guardian: "—", phone: "(53) 99856-0011", since: "Abr/2025", status: "Inativo", img: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&auto=format" },
];

const FILA_ESPERA = [
  { pos: 1, name: "Valentina Lima", turma: "Turma Infantil B", faixa: "8 a 10 anos", age: 8, guardian: "Ana Lima", phone: "(53) 99878-9012", date: "10/06/2025", priority: "Social" },
  { pos: 2, name: "Thiago Martins", turma: "Turma Juvenil B", faixa: "14 a 17 anos", age: 14, guardian: "Paulo Martins", phone: "(53) 99867-8901", date: "12/06/2025", priority: "Normal" },
  { pos: 3, name: "Guilherme Santos", turma: "Turma Infantil B", faixa: "8 a 10 anos", age: 10, guardian: "Teresa Santos", phone: "(53) 99889-0123", date: "15/06/2025", priority: "Normal" },
  { pos: 4, name: "Marina Gonçalves", turma: "Turma Juvenil B", faixa: "14 a 17 anos", age: 16, guardian: "Lucia Gonçalves", phone: "(53) 99856-7890", date: "18/06/2025", priority: "Social" },
  { pos: 5, name: "Larissa Pereira", turma: "Turma Infantil B", faixa: "8 a 10 anos", age: 9, guardian: "Marcos Pereira", phone: "(53) 99890-1234", date: "20/06/2025", priority: "Normal" },
];

const CHART_DATA = [
  { name: "Infantil A", value: 12, color: "#EAB308" },
  { name: "Infantil B", value: 15, color: "#F97316" },
  { name: "Juvenil A", value: 8, color: "#14B8A6" },
  { name: "Juvenil B", value: 12, color: "#3B82F6" },
  { name: "Adulto", value: 9, color: "#8B5CF6" },
  { name: "M. Idade", value: 7, color: "#22C55E" },
];

const SCHEDULE = [
  { day: "Terça-feira", classes: ["Turma Infantil A · 14h–15h", "Turma Adulto · 18h30–20h"] },
  { day: "Quarta-feira", classes: ["Turma Melhor Idade · 9h–10h30", "Turma Infantil B · 14h–15h30"] },
  { day: "Quinta-feira", classes: ["Turma Juvenil A · 14h–15h30"] },
  { day: "Sexta-feira", classes: ["Turma Juvenil B · 14h–16h"] },
];

// ─── Shared ───────────────────────────────────────────────────────────────────

function Badge({ children, variant = "teal" }: { children: React.ReactNode; variant?: string }) {
  const s: Record<string, string> = {
    teal: "bg-teal-100 text-teal-700",
    green: "bg-green-100 text-green-700",
    orange: "bg-orange-100 text-orange-700",
    yellow: "bg-yellow-100 text-yellow-700",
    red: "bg-red-100 text-red-700",
    gray: "bg-gray-100 text-gray-600",
    blue: "bg-blue-100 text-blue-700",
    purple: "bg-purple-100 text-purple-700",
    pink: "bg-pink-100 text-pink-700",
    social: "bg-amber-100 text-amber-700",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${s[variant] || s.teal}`}>
      {children}
    </span>
  );
}

function Avatar({ src, alt, size = 40, fallback }: { src?: string; alt: string; size?: number; fallback?: string }) {
  return (
    <div className="rounded-full overflow-hidden bg-amber-100 flex-shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
      {src ? (
        <img src={src} alt={alt} width={size} height={size} className="w-full h-full object-cover" />
      ) : (
        <span className="text-amber-700 font-bold text-sm">{fallback || alt[0]}</span>
      )}
    </div>
  );
}

function SpotBar({ spots, total }: { spots: number; total: number }) {
  const pct = Math.round(((total - spots) / total) * 100);
  const isFull = spots === 0;
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{total - spots}/{total} alunos</span>
        <span className={`font-semibold ${isFull ? "text-red-500" : "text-emerald-600"}`}>
          {isFull ? "Turma cheia" : `${spots} vaga${spots > 1 ? "s" : ""}`}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isFull ? "bg-red-400" : pct >= 80 ? "bg-orange-400" : "bg-emerald-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// cores por turma
const COLOR_MAP: Record<string, { accent: string; badge: string; badgeText: string; btnFull: string; btnOpen: string; dot: string }> = {
  yellow:  { accent: "border-yellow-300", badge: "bg-yellow-100", badgeText: "text-yellow-800", btnFull: "bg-amber-500 hover:bg-amber-600",   btnOpen: "bg-yellow-500 hover:bg-yellow-600",  dot: "bg-yellow-400" },
  orange:  { accent: "border-orange-300", badge: "bg-orange-100", badgeText: "text-orange-800", btnFull: "bg-orange-500 hover:bg-orange-600",  btnOpen: "bg-orange-500 hover:bg-orange-600",  dot: "bg-orange-400" },
  teal:    { accent: "border-teal-300",   badge: "bg-teal-100",   badgeText: "text-teal-800",   btnFull: "bg-amber-500 hover:bg-amber-600",   btnOpen: "bg-teal-500 hover:bg-teal-600",     dot: "bg-teal-400"   },
  blue:    { accent: "border-blue-300",   badge: "bg-blue-100",   badgeText: "text-blue-800",   btnFull: "bg-amber-500 hover:bg-amber-600",   btnOpen: "bg-blue-500 hover:bg-blue-600",     dot: "bg-blue-400"   },
  purple:  { accent: "border-purple-300", badge: "bg-purple-100", badgeText: "text-purple-800", btnFull: "bg-amber-500 hover:bg-amber-600",   btnOpen: "bg-purple-500 hover:bg-purple-600", dot: "bg-purple-400" },
  green:   { accent: "border-green-300",  badge: "bg-green-100",  badgeText: "text-green-800",  btnFull: "bg-amber-500 hover:bg-amber-600",   btnOpen: "bg-green-500 hover:bg-green-600",   dot: "bg-green-400"  },
};

// ─── Tela 1: Portal Público ───────────────────────────────────────────────────

function PortalScreen() {
  const [activeFilter, setActiveFilter] = useState("Todas");
  const [search, setSearch] = useState("");

  const filters = ["Todas", "Com vagas", "Turma cheia"];
  const displayed = TURMAS.filter((t) => {
    if (activeFilter === "Com vagas") return t.spots > 0;
    if (activeFilter === "Turma cheia") return t.spots === 0;
    return true;
  }).filter((t) =>
    search === "" ||
    t.label.toLowerCase().includes(search.toLowerCase()) ||
    t.faixa.toLowerCase().includes(search.toLowerCase())
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
            <button className="px-4 py-2 text-sm font-semibold text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-colors shadow-sm">
              Área administrativa
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#1C1300] to-[#3D2800] text-white overflow-hidden relative">
        {/* decorative pencil lines */}
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
              <button className="px-6 py-3 bg-amber-400 text-[#1C1300] text-sm font-bold rounded-xl hover:bg-amber-300 transition-colors shadow-lg flex items-center gap-2">
                <Plus size={16} /> Inscrever-se agora
              </button>
              <button className="px-6 py-3 bg-white/10 text-white text-sm font-semibold rounded-xl hover:bg-white/20 transition-colors border border-white/20 flex items-center gap-2">
                <ListOrdered size={16} /> Ver fila de espera
              </button>
            </div>
          </div>

          <div className="flex gap-4 flex-wrap justify-center md:justify-end">
            {[
              { label: "Alunos matriculados", value: "63", sub: "em 6 turmas" },
              { label: "Na fila de espera", value: "19", sub: "aguardando vaga" },
              { label: "Vagas abertas", value: "18", sub: "disponíveis agora" },
            ].map(({ label, value, sub }) => (
              <div key={label} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-6 py-5 text-center min-w-[120px]">
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
              placeholder="Buscar turma ou faixa etária..."
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayed.map((turma) => {
                const c = COLOR_MAP[turma.color];
                const isFull = turma.spots === 0;
                return (
                  <div key={turma.id} className={`bg-white rounded-2xl border-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all ${isFull ? "border-gray-200" : c.accent}`}>
                    {/* Color stripe */}
                    <div className={`h-2 rounded-t-2xl ${c.dot}`} />

                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[#1C1300] text-base leading-tight">{turma.label}</h3>
                          <span className={`inline-block mt-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full ${c.badge} ${c.badgeText}`}>
                            {turma.faixa}
                          </span>
                        </div>
                        {isFull ? (
                          <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full whitespace-nowrap">Turma cheia</span>
                        ) : (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                            {turma.spots} vaga{turma.spots > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-500 leading-relaxed mb-4">{turma.descricao}</p>

                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
                        <BookOpen size={12} />
                        {turma.horario}
                      </div>

                      <SpotBar spots={turma.spots} total={turma.total} />

                      <div className="mt-4 flex gap-2">
                        {isFull ? (
                          <button className="flex-1 h-9 bg-amber-500 text-white text-sm font-semibold rounded-xl hover:bg-amber-600 transition-colors flex items-center justify-center gap-1.5">
                            <ListOrdered size={14} /> Entrar na fila
                          </button>
                        ) : (
                          <button className={`flex-1 h-9 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 ${c.btnOpen}`}>
                            <Plus size={14} /> Inscrever-se
                          </button>
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
          </div>

          {/* Sidebar */}
          <div className="w-72 flex-shrink-0 space-y-5">
            {/* Agenda */}
            <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Palette size={15} className="text-amber-500" />
                <h4 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[#1C1300] text-sm">Grade de horários</h4>
              </div>
              <div className="space-y-3.5">
                {SCHEDULE.map(({ day, classes }) => (
                  <div key={day}>
                    <p className="text-xs font-bold text-amber-700 mb-1">{day}</p>
                    {classes.map((c) => (
                      <p key={c} className="text-xs text-gray-500 pl-2.5 border-l-2 border-amber-200 mb-0.5 leading-relaxed">{c}</p>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Fila resumo */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <ListOrdered size={15} className="text-amber-600" />
                <h4 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-amber-900 text-sm">Fila de espera</h4>
                <span className="ml-auto bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">19</span>
              </div>
              <div className="space-y-2.5">
                {FILA_ESPERA.slice(0, 4).map(({ pos, name, turma }) => (
                  <div key={pos} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{pos}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-amber-900 truncate">{name}</p>
                      <p className="text-[10px] text-amber-600">{turma}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="mt-4 w-full h-9 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 transition-colors">
                Ver lista completa
              </button>
            </div>

            {/* CTA */}
            <div className="bg-gradient-to-br from-[#1C1300] to-[#3D2800] rounded-2xl p-5 text-white">
              <Pencil size={22} className="mb-2 text-amber-300" />
              <h4 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-base mb-1">Sem custo para o aluno</h4>
              <p className="text-amber-200/80 text-xs mb-4 leading-relaxed">As aulas são gratuitas e os materiais de desenho são fornecidos pelo Centro.</p>
              <button className="w-full h-9 bg-amber-400 text-[#1C1300] text-sm font-bold rounded-xl hover:bg-amber-300 transition-colors">
                Fazer inscrição gratuita
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#1C1300] text-amber-400/70 py-8">
        <div className="max-w-[1440px] mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center">
              <Pencil size={12} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-amber-200">Centro de Desenvolvimento da Expressão Odessa Macedo</span>
          </div>
          <p className="text-xs text-amber-600">© 2025 Prefeitura de Bagé · Secretaria Municipal de Cultura</p>
          <div className="flex items-center gap-5 text-xs">
            {["Política de vagas", "Contato", "Localização"].map((l) => (
              <button key={l} className="hover:text-amber-200 transition-colors">{l}</button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Tela 2: Formulário de Inscrição ─────────────────────────────────────────

function AlunoScreen() {
  const [step, setStep] = useState<FormStep>(0);
  const [turma, setTurma] = useState("");
  const [turno, setTurno] = useState<string[]>([]);

  const steps = ["Responsável", "Aluno", "Turma", "Confirmação"];

  const selectedTurma = TURMAS.find((t) => t.id === turma);

  return (
    <div className="min-h-screen bg-[#FAFAF7] font-['Inter',sans-serif]">
      {/* Header */}
      <header className="bg-white border-b border-amber-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1440px] mx-auto px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
              <Pencil size={15} className="text-white" />
            </div>
            <div>
              <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[#1C1300] text-sm block">CDE Odessa Macedo</span>
              <span className="text-amber-500 text-xs font-medium">Formulário de Inscrição · Desenho</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="text-sm text-gray-500 hover:text-gray-900 font-medium">← Voltar ao portal</button>
          </div>
        </div>
      </header>

      <div className="max-w-[1440px] mx-auto px-8 py-10">
        <div className="mb-7">
          <h1 className="font-['Plus_Jakarta_Sans',sans-serif] text-3xl font-extrabold text-[#1C1300] mb-1">Inscrição nas Aulas de Desenho</h1>
          <p className="text-gray-500 text-sm">Preencha os dados abaixo. Se a turma escolhida não tiver vagas, você será incluído(a) na fila de espera automaticamente.</p>
        </div>

        {/* Alerta gratuidade */}
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3.5 mb-8 max-w-xl">
          <CheckCircle size={18} className="text-emerald-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-emerald-900">Inscrição e aulas totalmente gratuitas</p>
            <p className="text-xs text-emerald-700">Materiais de desenho fornecidos pelo Centro. Frequência obrigatória.</p>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Form */}
          <div className="flex-1 max-w-3xl">
            {/* Stepper */}
            <div className="flex items-center mb-8">
              {steps.map((s, i) => (
                <div key={s} className="flex items-center">
                  <button onClick={() => setStep(i as FormStep)} className="flex flex-col items-center gap-1.5">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      i < step ? "bg-green-500 text-white" : i === step ? "bg-amber-500 text-white shadow-md shadow-amber-200" : "bg-gray-100 text-gray-400"
                    }`}>
                      {i < step ? <CheckCircle size={17} /> : i + 1}
                    </div>
                    <span className={`text-xs font-semibold whitespace-nowrap ${i === step ? "text-amber-700" : "text-gray-400"}`}>{s}</span>
                  </button>
                  {i < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 mb-5 min-w-[40px] ${i < step ? "bg-green-400" : "bg-gray-200"}`} />
                  )}
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-amber-50 shadow-sm p-7">
              {/* Step 0 — Responsável */}
              {step === 0 && (
                <div>
                  <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl text-[#1C1300] mb-1">Dados do responsável</h2>
                  <p className="text-xs text-gray-400 mb-5">Para alunos menores de 18 anos, preencha os dados do responsável legal. Para adultos e melhor idade, preencha seus próprios dados.</p>
                  <div className="grid grid-cols-2 gap-5">
                    {[
                      { label: "Nome completo", placeholder: "Nome do responsável ou do próprio aluno (adulto)", col: 2 },
                      { label: "CPF", placeholder: "000.000.000-00", col: 1 },
                      { label: "RG", placeholder: "0000000000", col: 1 },
                      { label: "E-mail", placeholder: "email@exemplo.com", col: 1 },
                      { label: "Telefone / WhatsApp", placeholder: "(53) 99999-0000", col: 1 },
                      { label: "Endereço", placeholder: "Rua, número, bairro", col: 2 },
                      { label: "CEP", placeholder: "96400-000", col: 1 },
                      { label: "Bairro / Cidade", placeholder: "Bagé/RS", col: 1 },
                    ].map(({ label, placeholder, col }) => (
                      <div key={label} className={col === 2 ? "col-span-2" : ""}>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
                        <input placeholder={placeholder} className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 focus:bg-white transition-colors" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 1 — Aluno */}
              {step === 1 && (
                <div>
                  <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl text-[#1C1300] mb-1">Dados do aluno</h2>
                  <p className="text-xs text-gray-400 mb-5">Preencha os dados de quem vai frequentar as aulas. A faixa etária determinará a turma disponível.</p>
                  <div className="grid grid-cols-2 gap-5">
                    {[
                      { label: "Nome completo do aluno", placeholder: "Nome completo", col: 2 },
                      { label: "Data de nascimento", placeholder: "DD/MM/AAAA", col: 1 },
                      { label: "Sexo", placeholder: "Selecionar...", col: 1 },
                      { label: "CPF do aluno (se tiver)", placeholder: "000.000.000-00", col: 1 },
                      { label: "Escola / Instituição de ensino", placeholder: "Nome da escola", col: 1 },
                    ].map(({ label, placeholder, col }) => (
                      <div key={label} className={col === 2 ? "col-span-2" : ""}>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
                        <input placeholder={placeholder} className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 focus:bg-white transition-colors" />
                      </div>
                    ))}
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Possui experiência prévia em desenho?</label>
                      <div className="flex gap-2">
                        {["Nenhuma", "Um pouco", "Sim, tenho prática"].map((v) => (
                          <button key={v} className="px-4 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 hover:border-amber-300 hover:text-amber-700 transition-all">
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Necessidades especiais ou observações</label>
                      <textarea rows={2} placeholder="Alergias a materiais, dificuldades motoras, etc..." className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 focus:bg-white resize-none transition-colors" />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2 — Turma */}
              {step === 2 && (
                <div>
                  <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl text-[#1C1300] mb-1">Escolha da turma</h2>
                  <p className="text-xs text-gray-400 mb-5">Selecione a turma correspondente à faixa etária do aluno. Turmas cheias entrarão automaticamente na fila de espera.</p>
                  <div className="space-y-3 mb-6">
                    {TURMAS.map((t) => {
                      const c = COLOR_MAP[t.color];
                      const isFull = t.spots === 0;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setTurma(t.id)}
                          className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4 ${
                            turma === t.id
                              ? `${c.accent} bg-amber-50`
                              : "border-gray-200 hover:border-amber-200 bg-white"
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${c.badge}`}>
                            <Pencil size={16} className={c.badgeText} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-sm text-[#1C1300]">{t.label}</p>
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.badge} ${c.badgeText}`}>{t.faixa}</span>
                            </div>
                            <p className="text-xs text-gray-400 mb-2">{t.horario}</p>
                            <SpotBar spots={t.spots} total={t.total} />
                          </div>
                          {isFull && (
                            <span className="text-xs text-amber-700 bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap flex-shrink-0">→ Fila</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {selectedTurma?.spots === 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                      <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-amber-900">Esta turma está sem vagas no momento</p>
                        <p className="text-xs text-amber-700 mt-0.5">Ao confirmar, você será incluído(a) na lista de espera. Entraremos em contato assim que surgir uma vaga.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3 — Confirmação */}
              {step === 3 && (
                <div>
                  <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl text-[#1C1300] mb-2">Revisão da inscrição</h2>
                  <p className="text-gray-500 text-sm mb-6">Verifique os dados antes de confirmar.</p>
                  <div className="space-y-3">
                    {[
                      { section: "Responsável", items: ["Maria Souza", "CPF: 123.456.789-00", "(53) 99801-2345"], ok: true },
                      { section: "Aluno", items: ["Ana Beatriz Souza", "Nascimento: 14/03/2019 · 6 anos", "Sem experiência prévia"], ok: true },
                      { section: "Turma selecionada", items: [
                        selectedTurma ? selectedTurma.label : "Nenhuma turma selecionada",
                        selectedTurma ? `Faixa: ${selectedTurma.faixa}` : "",
                        selectedTurma ? `Horário: ${selectedTurma.horario}` : "",
                      ].filter(Boolean), ok: !!selectedTurma },
                    ].map(({ section, items, ok }) => (
                      <div key={section} className={`rounded-xl border p-4 ${ok ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
                        <div className="flex items-center gap-2 mb-2">
                          {ok ? <CheckCircle size={16} className="text-green-600" /> : <AlertCircle size={16} className="text-amber-600" />}
                          <span className="font-semibold text-sm text-gray-800">{section}</span>
                        </div>
                        <ul className="ml-5 space-y-0.5">
                          {items.map((item) => <li key={item} className="text-xs text-gray-600">{item}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <p className="mt-5 text-xs text-gray-500 bg-gray-50 rounded-xl p-4 leading-relaxed">
                    Ao confirmar, você declara que as informações são verdadeiras e concorda com as normas do Centro de Desenvolvimento da Expressão Odessa Macedo, incluindo a política de frequência mínima de 75%.
                  </p>
                </div>
              )}
            </div>

            {/* Navegação */}
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => setStep((s) => Math.max(0, s - 1) as FormStep)}
                disabled={step === 0}
                className="px-6 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:border-gray-300 disabled:opacity-40 transition-colors"
              >
                Voltar
              </button>
              <div className="flex items-center gap-3">
                <button className="px-6 py-2.5 text-sm font-semibold text-amber-700 border border-amber-200 rounded-xl hover:bg-amber-50 transition-colors">
                  Salvar rascunho
                </button>
                {step < 3 ? (
                  <button
                    onClick={() => setStep((s) => Math.min(3, s + 1) as FormStep)}
                    className="px-6 py-2.5 text-sm font-semibold text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-colors shadow-sm flex items-center gap-2"
                  >
                    Próxima etapa <ArrowRight size={16} />
                  </button>
                ) : (
                  <button className="px-6 py-2.5 text-sm font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2">
                    <CheckCircle size={16} /> {selectedTurma?.spots === 0 ? "Entrar na fila de espera" : "Confirmar matrícula"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Preview lateral */}
          <div className="w-64 flex-shrink-0">
            <div className="sticky top-24">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Resumo</p>
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-amber-100">
                <div className="h-24 bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <Pencil size={32} className="text-white/60" />
                </div>
                <div className="p-4">
                  <p className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[#1C1300] text-sm mb-0.5">Ana Beatriz Souza</p>
                  <p className="text-xs text-gray-400 mb-3">6 anos</p>
                  {selectedTurma && (
                    <div className="mb-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                      <p className="text-xs font-bold text-amber-800">{selectedTurma.label}</p>
                      <p className="text-xs text-amber-600 mt-0.5">{selectedTurma.faixa}</p>
                      <p className="text-xs text-amber-500 mt-0.5">{selectedTurma.horario}</p>
                      {selectedTurma.spots === 0 && (
                        <p className="text-xs font-bold text-red-600 mt-1.5">⚠ Entrará na fila</p>
                      )}
                    </div>
                  )}
                  <div className="w-full h-8 bg-amber-500 rounded-xl flex items-center justify-center text-white text-xs font-bold">
                    Confirmar inscrição
                  </div>
                </div>
              </div>
              <div className="mt-3 bg-amber-50 rounded-xl p-3 text-xs text-amber-800 leading-relaxed">
                <strong>Documentos:</strong> documento de identidade do aluno (ou certidão de nascimento para menores) e comprovante de residência.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tela 3: Painel Administrativo ───────────────────────────────────────────

function AdminScreen() {
  const [selectedAluno, setSelectedAluno] = useState(ALUNOS[0]);
  const [activeMenu, setActiveMenu] = useState("Alunos");
  const [activeTab, setActiveTab] = useState<"alunos" | "fila">("alunos");

  const menuItems = [
    { icon: <Home size={17} />, label: "Dashboard" },
    { icon: <Users size={17} />, label: "Alunos", badge: 63 },
    { icon: <ListOrdered size={17} />, label: "Fila de espera", badge: 19 },
    { icon: <BookOpen size={17} />, label: "Turmas" },
    { icon: <BarChart2 size={17} />, label: "Relatórios" },
    { icon: <Settings size={17} />, label: "Configurações" },
  ];

  const stats = [
    { label: "Alunos matriculados", value: "63", icon: <UserCheck size={20} />, color: "text-amber-600", bg: "bg-amber-100" },
    { label: "Na fila de espera", value: "19", icon: <Clock size={20} />, color: "text-orange-600", bg: "bg-orange-100" },
    { label: "Vagas abertas", value: "18", icon: <Pencil size={20} />, color: "text-emerald-600", bg: "bg-emerald-100" },
    { label: "Turmas ativas", value: "6", icon: <Palette size={20} />, color: "text-blue-600", bg: "bg-blue-100" },
  ];

  const turmaVariant: Record<string, string> = {
    "Turma Infantil A": "yellow",
    "Turma Infantil B": "orange",
    "Turma Juvenil A": "teal",
    "Turma Juvenil B": "blue",
    "Turma Adulto": "purple",
    "Turma Melhor Idade": "green",
  };

  return (
    <div className="min-h-screen bg-[#FAFAF7] font-['Inter',sans-serif] flex">
      {/* Sidebar */}
      <aside className="w-60 bg-[#1C1300] flex flex-col flex-shrink-0">
        <div className="h-16 flex items-center gap-3 px-5 border-b border-amber-900/40">
          <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center">
            <Pencil size={13} className="text-white" />
          </div>
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
            <button className="text-amber-400/70 hover:text-white transition-colors">
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
            <button className="flex items-center gap-2 text-sm text-white bg-amber-500 font-medium rounded-xl px-3 py-2 hover:bg-amber-600 transition-colors">
              <Plus size={15} /> Nova inscrição
            </button>
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
                      { id: "alunos" as const, label: "Alunos matriculados", count: 63 },
                      { id: "fila" as const, label: "Fila de espera", count: 19 },
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
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                      <input placeholder="Buscar..." className="h-9 pl-8 pr-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 w-44" />
                    </div>
                    <button className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 rounded-xl px-3 py-2 hover:bg-gray-50">
                      <Filter size={13} /> Filtrar
                    </button>
                  </div>
                </div>

                {activeTab === "alunos" ? (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {["Aluno", "Turma", "Faixa etária", "Matriculado em", "Status", ""].map((h) => (
                          <th key={h} className="text-left text-xs font-semibold text-gray-400 px-6 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ALUNOS.map((a) => (
                        <tr
                          key={a.id}
                          onClick={() => setSelectedAluno(a)}
                          className={`border-b border-gray-50 cursor-pointer transition-colors ${selectedAluno.id === a.id ? "bg-amber-50" : "hover:bg-gray-50"}`}
                        >
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar src={a.img} alt={a.name} size={34} />
                              <div>
                                <p className="font-semibold text-sm text-[#1C1300]">{a.name}</p>
                                <p className="text-xs text-gray-400">{a.age} anos</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <Badge variant={turmaVariant[a.turma] || "gray"}>{a.turma}</Badge>
                          </td>
                          <td className="px-6 py-3 text-xs text-gray-500">{a.faixa}</td>
                          <td className="px-6 py-3 text-xs text-gray-500">{a.since}</td>
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
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {["Pos.", "Nome", "Turma desejada", "Faixa", "Prioridade", "Inscrito em", ""].map((h) => (
                          <th key={h} className="text-left text-xs font-semibold text-gray-400 px-6 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {FILA_ESPERA.map((f) => (
                        <tr key={f.pos} className="border-b border-gray-50 hover:bg-amber-50/40 transition-colors">
                          <td className="px-6 py-3">
                            <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">{f.pos}</span>
                          </td>
                          <td className="px-6 py-3">
                            <p className="font-semibold text-sm text-[#1C1300]">{f.name}</p>
                            <p className="text-xs text-gray-400">{f.age} anos · {f.guardian}</p>
                          </td>
                          <td className="px-6 py-3">
                            <Badge variant={turmaVariant[f.turma] || "gray"}>{f.turma}</Badge>
                          </td>
                          <td className="px-6 py-3 text-xs text-gray-500">{f.faixa}</td>
                          <td className="px-6 py-3">
                            <Badge variant={f.priority === "Social" ? "social" : "gray"}>{f.priority}</Badge>
                          </td>
                          <td className="px-6 py-3 text-xs text-gray-500">{f.date}</td>
                          <td className="px-6 py-3">
                            <button className="text-xs px-2.5 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg font-semibold hover:bg-amber-100 transition-colors flex items-center gap-1">
                              <UserCheck size={11} /> Chamar
                            </button>
                          </td>
                        </tr>
                      ))}
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
                <ResponsiveContainer width="100%" height={170}>
                  <BarChart data={CHART_DATA} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#FEF9EC" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: "1px solid #FDE68A", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}
                      cursor={{ fill: "#FFFBEB" }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {CHART_DATA.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Ficha lateral */}
            <div className="w-72 flex-shrink-0">
              <div className="bg-white rounded-2xl border border-amber-50 shadow-sm overflow-hidden sticky top-0">
                <div className="p-5 border-b border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Ficha do aluno</p>
                  <div className="flex items-center gap-3">
                    <Avatar src={selectedAluno.img} alt={selectedAluno.name} size={52} />
                    <div>
                      <p className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[#1C1300] text-sm leading-tight">{selectedAluno.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{selectedAluno.age} anos</p>
                      <Badge variant={selectedAluno.status === "Ativo" ? "green" : "gray"}>{selectedAluno.status}</Badge>
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 mb-2">Dados da matrícula</p>
                    {[
                      { label: "Turma", value: selectedAluno.turma },
                      { label: "Faixa etária", value: selectedAluno.faixa },
                      { label: "Matriculado em", value: selectedAluno.since },
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
                        {selectedAluno.guardian === "—" ? "Próprio aluno (adulto)" : selectedAluno.guardian}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Phone size={11} className="text-gray-400" /> {selectedAluno.phone}
                      </div>
                    </div>
                  </div>

                  {/* Frequência */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 mb-2">Frequência — Junho 2025</p>
                    <div className="flex gap-1 flex-wrap">
                      {Array.from({ length: 8 }, (_, i) => (
                        <div key={i} className={`w-6 h-6 rounded-md text-[9px] font-bold flex items-center justify-center ${
                          i < 6 ? "bg-amber-400 text-white" : i === 6 ? "bg-red-100 text-red-500" : "bg-gray-100 text-gray-400"
                        }`}>
                          {i < 6 ? "✓" : i === 6 ? "✗" : "—"}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">75% de presença · 6/8 aulas</p>
                  </div>
                </div>

                <div className="p-5 pt-0 space-y-2">
                  <button className="w-full h-10 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 transition-colors flex items-center justify-center gap-2">
                    <FileText size={14} /> Ver ficha completa
                  </button>
                  <button className="w-full h-10 bg-blue-50 text-blue-700 border border-blue-200 text-sm font-bold rounded-xl hover:bg-blue-100 transition-colors flex items-center justify-center gap-2">
                    <RefreshCw size={14} /> Transferir de turma
                  </button>
                  <button className="w-full h-10 bg-red-50 text-red-700 border border-red-200 text-sm font-bold rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                    <UserX size={14} /> Cancelar matrícula
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>("portal");

  const tabs: { id: Screen; label: string }[] = [
    { id: "portal", label: "Portal Público" },
    { id: "aluno", label: "Formulário de Inscrição" },
    { id: "admin", label: "Painel Administrativo" },
  ];

  return (
    <div className="min-h-screen bg-[#0E0800] flex flex-col">
      <div className="flex-shrink-0 px-8 py-4 flex items-center gap-2">
        <span className="text-amber-400/70 text-xs font-semibold uppercase tracking-widest mr-3">Protótipo UI/UX —</span>
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            onClick={() => setScreen(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              screen === tab.id
                ? "bg-amber-500 text-white shadow-lg shadow-amber-900/50"
                : "text-amber-400/70 border border-amber-800/40 hover:border-amber-600 hover:text-amber-200"
            }`}
          >
            <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${screen === tab.id ? "bg-white/20" : "bg-amber-900/40"}`}>
              {i + 1}
            </span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 px-4 pb-4">
        <div className="rounded-2xl overflow-hidden border border-amber-800/20 shadow-2xl shadow-amber-950/50">
          {screen === "portal" && <PortalScreen />}
          {screen === "aluno" && <AlunoScreen />}
          {screen === "admin" && <AdminScreen />}
        </div>
      </div>
    </div>
  );
}
