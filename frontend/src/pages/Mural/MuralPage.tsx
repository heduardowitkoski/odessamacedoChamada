import { Link } from 'react-router-dom';
import { Pencil, ArrowLeft, ShieldCheck, GraduationCap, Users } from 'lucide-react';
import MuralBoard from '../../components/mural/MuralBoard';
import { getCurrentUser } from '../../lib/auth';

export default function MuralPage() {
  const currentUser = getCurrentUser();

  const getDashboardLink = () => {
    if (!currentUser) return '/login';
    if (currentUser.role === 'admin') return '/admin';
    if (currentUser.role === 'professor') return '/professor';
    return '/responsavel';
  };

  const getDashboardLabel = () => {
    if (!currentUser) return 'Acessar';
    if (currentUser.role === 'admin') return 'Painel Admin';
    if (currentUser.role === 'professor') return 'Portal Professor';
    return 'Portal Família';
  };

  return (
    <div className="min-h-screen bg-[#FAFAF7] font-['Inter',sans-serif]">
      {/* Header Fiel ao Design Original */}
      <header className="bg-white border-b border-amber-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shrink-0">
              <Pencil size={16} className="text-white" />
            </div>
            <div className="leading-tight min-w-0">
              <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[#1C1300] text-xs sm:text-sm block truncate">
                <span className="hidden sm:inline">Centro de Desenvolvimento da Expressão</span>
                <span className="sm:hidden">CDE Odessa Macedo</span>
              </span>
              <span className="text-amber-600 text-[11px] sm:text-xs font-semibold hidden sm:block truncate">
                Odessa Macedo · Aulas de Desenho
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-7">
            <Link to="/" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
              Início
            </Link>
            <Link to="/" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
              Turmas
            </Link>
            <span className="text-sm font-bold text-amber-600 border-b-2 border-amber-500 pb-0.5">
              Mural de Obras
            </span>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              to="/"
              className="px-2.5 sm:px-4 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <ArrowLeft size={14} /> <span className="hidden xs:inline">Voltar</span>
            </Link>

            <Link
              to={getDashboardLink()}
              className="px-2.5 sm:px-4 py-2 text-xs font-semibold text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-colors shadow-sm flex items-center gap-1.5 whitespace-nowrap"
            >
              {currentUser?.role === 'admin' && <ShieldCheck size={14} />}
              {currentUser?.role === 'professor' && <GraduationCap size={14} />}
              {currentUser?.role === 'responsavel' && <Users size={14} />}
              <span>{getDashboardLabel()}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero do Mural */}
      <div className="bg-gradient-to-b from-amber-50/60 to-transparent py-6 sm:py-8 border-b border-amber-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <span className="inline-block text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-full mb-2">
            Exposição & Galeria Artística
          </span>
          <h1 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl sm:text-2xl md:text-3xl text-[#1C1300]">
            Mural de Obras & Produções dos Alunos
          </h1>
          <p className="text-gray-600 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            Espaço de valorização da criatividade dos estudantes: confira as fotos, técnicas e processos artísticos desenvolvidos nas turmas do CDE Odessa Macedo.
          </p>
        </div>
      </div>

      {/* Conteúdo do Mural */}
      <main className="py-4 sm:py-6">
        <MuralBoard />
      </main>
    </div>
  );
}
