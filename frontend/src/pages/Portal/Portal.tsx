import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Pencil, BookOpen, ChevronRight, Award, Palette, Sparkles } from "lucide-react";
import { TURMAS as MOCK_TURMAS, COLOR_MAP } from "../../lib/mock";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

interface Turma {
  id: string;
  nome?: string;
  label?: string;
  turno?: string;
  faixa?: string;
  horario?: string;
  descricao?: string;
  color?: string;
}

export default function PortalScreen() {
  const [search, setSearch] = useState("");
  const [turmasDb, setTurmasDb] = useState<Turma[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/turmas`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setTurmasDb(data);
        } else {
          setTurmasDb(MOCK_TURMAS as any[]);
        }
      })
      .catch((err) => {
        console.error("Erro ao buscar turmas:", err);
        setTurmasDb(MOCK_TURMAS as any[]);
      });
  }, []);

  const listaTurmas = (turmasDb.length > 0 ? turmasDb : MOCK_TURMAS).map((t: any, index) => {
    const defaultColors = ["yellow", "orange", "teal", "blue", "purple", "green", "amber"];
    return {
      id: t.id || `turma-${index}`,
      nome: t.nome || t.label || `Turma ${index + 1}`,
      turno: t.turno || t.horario || "Geral",
      faixa: t.faixa || "Todas as idades",
      descricao: t.descricao || "Aulas práticas de desenho e artes visuais no Centro Odessa Macedo.",
      color: t.color || defaultColors[index % defaultColors.length],
    };
  });

  const displayed = listaTurmas.filter((t) =>
    search === "" ||
    t.nome.toLowerCase().includes(search.toLowerCase()) ||
    t.turno.toLowerCase().includes(search.toLowerCase()) ||
    t.descricao.toLowerCase().includes(search.toLowerCase())
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
            <Link to="/inscrever" className="px-4 py-2 text-sm font-semibold text-amber-700 border border-amber-200 rounded-xl hover:bg-amber-50 transition-colors">
              Fazer Inscrição
            </Link>
            <Link to="/admin" className="px-4 py-2 text-sm font-semibold text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-colors shadow-sm">
              Área Administrativa
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner: Fundo Marrom Escuro Sofisticado, Linhas Diagonais Douradas em CSS, Branco + Dourado */}
      <section
        className="relative overflow-hidden text-white py-14 px-8 border-b border-amber-500/40 shadow-xl"
        style={{
          backgroundColor: "#160D05",
          backgroundImage: `
            radial-gradient(circle at 20% 50%, rgba(67, 36, 12, 0.5) 0%, rgba(22, 13, 5, 0.95) 75%),
            repeating-linear-gradient(45deg, rgba(217, 119, 6, 0.07) 0px, rgba(217, 119, 6, 0.07) 1px, transparent 1px, transparent 24px),
            repeating-linear-gradient(-45deg, rgba(217, 119, 6, 0.07) 0px, rgba(217, 119, 6, 0.07) 1px, transparent 1px, transparent 24px)
          `,
        }}
      >
        {/* Padrão Geométrico de Linhas e Contornos Dourados em Losango */}
        <div className="absolute inset-0 pointer-events-none opacity-25">
          <div className="absolute -top-16 -right-16 w-80 h-80 border-2 border-amber-400 rotate-45 rounded-3xl" />
          <div className="absolute top-1/2 -right-8 w-60 h-60 border border-amber-300 rotate-45 rounded-2xl" />
          <div className="absolute -bottom-20 left-1/4 w-96 h-96 border border-amber-400/40 rotate-45 rounded-3xl" />
          <div className="absolute top-4 left-1/2 w-40 h-40 border border-amber-300/30 rotate-45 rounded-xl" />
        </div>

        <div className="max-w-[1440px] mx-auto relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="max-w-2xl">
            {/* Badge Superior: Borda dourada, texto dourado, fundo marrom translúcido */}
            <div className="inline-flex items-center gap-2 bg-[#261508]/80 border border-amber-400/70 backdrop-blur-sm rounded-full px-4 py-1.5 text-xs font-semibold mb-4 text-amber-300 shadow-sm">
              <Award size={14} className="text-amber-400" />
              <span>Bagé/RS · Secretaria Municipal de Cultura</span>
            </div>

            {/* Título: 'Aulas Gratuitas de' em Branco e 'Desenho Artístico' em Dourado */}
            <h1 className="font-['Plus_Jakarta_Sans',sans-serif] font-extrabold text-3xl md:text-4xl lg:text-5xl leading-tight mb-4 tracking-tight">
              <span className="text-white block">Aulas Gratuitas de</span>
              <span className="text-amber-400 block mt-1">Desenho Artístico</span>
            </h1>

            {/* Descrição: Off-white adaptado ao novo fundo marrom escuro */}
            <p className="text-amber-100/90 text-base md:text-lg leading-relaxed mb-8 max-w-xl font-medium">
              Inscrições abertas para crianças, jovens, adultos e melhor idade. Turmas com acompanhamento pedagógico e material fornecido pelo Centro.
            </p>

            {/* Botões: Mantendo rotas, ações e textos originais */}
            <div className="flex flex-wrap items-center gap-4">
              <Link
                to="/inscrever"
                className="px-6 py-3.5 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-[#1C1300] font-extrabold rounded-xl text-sm hover:from-amber-300 hover:to-yellow-400 transition-all shadow-lg shadow-amber-950/40 transform hover:-translate-y-0.5"
              >
                Quero me inscrever agora
              </Link>
              <a
                href="#turmas"
                className="px-6 py-3.5 bg-[#261508]/60 border border-amber-400/50 text-white font-semibold rounded-xl text-sm hover:bg-[#381F0C]/80 hover:border-amber-400 transition-all backdrop-blur-xs"
              >
                Ver todas as turmas
              </a>
            </div>
          </div>

          {/* Elemento Decorativo à Direita: Moldura em Losango Dourada e Fundo Marrom Translúcido */}
          <div className="relative hidden md:flex items-center justify-center p-8">
            {/* Losango Externo com Borda Dourada */}
            <div className="w-56 h-56 border-2 border-amber-400/80 rotate-45 rounded-3xl flex items-center justify-center bg-gradient-to-br from-[#2D1A0A]/90 to-[#180E05]/95 shadow-2xl shadow-black/80 backdrop-blur-md">
              {/* Losango Interno com Contorno Dourado */}
              <div className="w-44 h-44 border border-amber-400/50 rounded-2xl flex items-center justify-center bg-[#231407]/80">
                {/* Ícone e Conteúdo Central */}
                <div className="-rotate-45 flex flex-col items-center text-center p-2">
                  <div className="w-14 h-14 rounded-2xl bg-amber-400 flex items-center justify-center text-[#1C1300] mb-2 shadow-lg">
                    <Palette size={28} className="text-[#1C1300]" />
                  </div>
                  <span className="font-bold text-xs text-white uppercase tracking-wider block">CDE Odessa</span>
                  <span className="text-[11px] text-amber-300 font-semibold flex items-center gap-1 justify-center">
                    <Sparkles size={11} className="text-amber-400" /> 100% Gratuito
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main id="turmas" className="max-w-[1440px] mx-auto px-8 py-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-extrabold text-2xl text-[#1C1300]">Turmas Disponíveis</h2>
            <p className="text-gray-500 text-sm mt-0.5">Encontre a turma ideal de acordo com a idade e horário.</p>
          </div>

          <div className="relative w-full md:w-72">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por turma ou horário..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all shadow-xs"
            />
          </div>
        </div>

        {/* Grid de Turmas sem contadores de alunos ou vagas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayed.map((t) => {
            const c = COLOR_MAP[t.color || "amber"] || COLOR_MAP.amber;

            return (
              <div
                key={t.id}
                className={`bg-white rounded-2xl border-2 ${c.accent} shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${c.badge} ${c.badgeText}`}>
                      {t.turno}
                    </span>
                    <span className="text-xs font-semibold text-gray-400">{t.faixa}</span>
                  </div>

                  <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-lg text-[#1C1300] mb-2">{t.nome}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{t.descricao}</p>
                </div>

                <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-medium">Inscrição gratuita</span>
                  <Link
                    to="/inscrever"
                    className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-1.5 shadow-xs ${c.btnOpen}`}
                  >
                    Inscrever-se <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {displayed.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <BookOpen size={36} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-semibold text-sm">Nenhuma turma encontrada</p>
            <p className="text-gray-400 text-xs mt-1">Tente ajustar seus termos de busca.</p>
          </div>
        )}
      </main>
    </div>
  );
}
