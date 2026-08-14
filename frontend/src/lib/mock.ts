export const TURMAS = [
  { id: "infantil-a", label: "Turma Infantil A", faixa: "5 a 7 anos", horario: "Terça · 14h às 15h", descricao: "Introdução ao desenho por meio de brincadeiras, cores e formas básicas.", color: "yellow", spots: 3, total: 15 },
  { id: "infantil-b", label: "Turma Infantil B", faixa: "8 a 10 anos", horario: "Quarta · 14h às 15h30", descricao: "Técnicas de observação, perspectiva simples e narrativas visuais.", color: "orange", spots: 0, total: 15 },
  { id: "juvenil-a", label: "Turma Juvenil A", faixa: "11 a 13 anos", horario: "Quinta · 14h às 15h30", descricao: "Desenho de figura humana, croqui e introdução ao grafite e carvão.", color: "teal", spots: 4, total: 12 },
  { id: "juvenil-b", label: "Turma Juvenil B", faixa: "14 a 17 anos", horario: "Sexta · 14h às 16h", descricao: "Técnicas avançadas: perspectiva, luz e sombra, composição e portfólio.", color: "blue", spots: 0, total: 12 },
  { id: "adulto", label: "Turma Adulto", faixa: "18 anos ou mais", horario: "Terça · 18h30 às 20h", descricao: "Desenho artístico livre, apreciação estética e técnicas mistas.", color: "purple", spots: 6, total: 15 },
  { id: "idoso", label: "Turma Melhor Idade", faixa: "60 anos ou mais", horario: "Quarta · 9h às 10h30", descricao: "Atividade terapêutica com foco em expressão criativa e bem-estar.", color: "green", spots: 5, total: 12 },
];

export const ALUNOS = [
  { id: 1, name: "Ana Beatriz Souza", turma: "Turma Infantil A", faixa: "5 a 7 anos", age: 6, guardian: "Maria Souza", phone: "(53) 99801-2345", since: "Mar/2025", status: "Ativo", img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&auto=format" },
  { id: 2, name: "Lucas Ferreira", turma: "Turma Juvenil A", faixa: "11 a 13 anos", age: 12, guardian: "João Ferreira", phone: "(53) 99812-3456", since: "Jan/2025", status: "Ativo", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&auto=format" },
  { id: 3, name: "Sofia Ribeiro", turma: "Turma Juvenil B", faixa: "14 a 17 anos", age: 15, guardian: "Carla Ribeiro", phone: "(53) 99823-4567", since: "Jun/2024", status: "Ativo", img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&auto=format" },
  { id: 4, name: "Pedro Alves", turma: "Turma Infantil B", faixa: "8 a 10 anos", age: 9, guardian: "Roberto Alves", phone: "(53) 99834-5678", since: "Ago/2024", status: "Ativo", img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&auto=format" },
  { id: 5, name: "Dona Tereza Barros", turma: "Turma Melhor Idade", faixa: "60 anos ou mais", age: 67, guardian: "—", phone: "(53) 99845-6789", since: "Fev/2025", status: "Ativo", img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&auto=format" },
  { id: 6, name: "Marcos Vinicius Lima", turma: "Turma Adulto", faixa: "18 anos ou mais", age: 34, guardian: "—", phone: "(53) 99856-0011", since: "Abr/2025", status: "Inativo", img: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&auto=format" },
];

export const FILA_ESPERA = [
  { pos: 1, name: "Valentina Lima", turma: "Turma Infantil B", faixa: "8 a 10 anos", age: 8, guardian: "Ana Lima", phone: "(53) 99878-9012", date: "10/06/2025", priority: "Social" },
  { pos: 2, name: "Thiago Martins", turma: "Turma Juvenil B", faixa: "14 a 17 anos", age: 14, guardian: "Paulo Martins", phone: "(53) 99867-8901", date: "12/06/2025", priority: "Normal" },
  { pos: 3, name: "Guilherme Santos", turma: "Turma Infantil B", faixa: "8 a 10 anos", age: 10, guardian: "Teresa Santos", phone: "(53) 99889-0123", date: "15/06/2025", priority: "Normal" },
  { pos: 4, name: "Marina Gonçalves", turma: "Turma Juvenil B", faixa: "14 a 17 anos", age: 16, guardian: "Lucia Gonçalves", phone: "(53) 99856-7890", date: "18/06/2025", priority: "Social" },
  { pos: 5, name: "Larissa Pereira", turma: "Turma Infantil B", faixa: "8 a 10 anos", age: 9, guardian: "Marcos Pereira", phone: "(53) 99890-1234", date: "20/06/2025", priority: "Normal" },
];

export const CHART_DATA = [
  { name: "Infantil A", value: 12, color: "#EAB308" },
  { name: "Infantil B", value: 15, color: "#F97316" },
  { name: "Juvenil A", value: 8, color: "#14B8A6" },
  { name: "Juvenil B", value: 12, color: "#3B82F6" },
  { name: "Adulto", value: 9, color: "#8B5CF6" },
  { name: "M. Idade", value: 7, color: "#22C55E" },
];

export const COLOR_MAP: Record<string, { accent: string; badge: string; badgeText: string; btnFull: string; btnOpen: string; dot: string }> = {
  yellow:  { accent: "border-yellow-300", badge: "bg-yellow-100", badgeText: "text-yellow-800", btnFull: "bg-amber-500 hover:bg-amber-600",   btnOpen: "bg-yellow-500 hover:bg-yellow-600",  dot: "bg-yellow-400" },
  orange:  { accent: "border-orange-300", badge: "bg-orange-100", badgeText: "text-orange-800", btnFull: "bg-orange-500 hover:bg-orange-600",  btnOpen: "bg-orange-500 hover:bg-orange-600",  dot: "bg-orange-400" },
  teal:    { accent: "border-teal-300",   badge: "bg-teal-100",   badgeText: "text-teal-800",   btnFull: "bg-amber-500 hover:bg-amber-600",   btnOpen: "bg-teal-500 hover:bg-teal-600",     dot: "bg-teal-400"   },
  blue:    { accent: "border-blue-300",   badge: "bg-blue-100",   badgeText: "text-blue-800",   btnFull: "bg-amber-500 hover:bg-amber-600",   btnOpen: "bg-blue-500 hover:bg-blue-600",     dot: "bg-blue-400"   },
  purple:  { accent: "border-purple-300", badge: "bg-purple-100", badgeText: "text-purple-800", btnFull: "bg-amber-500 hover:bg-amber-600",   btnOpen: "bg-purple-500 hover:bg-purple-600", dot: "bg-purple-400" },
  green:   { accent: "border-green-300",  badge: "bg-green-100",  badgeText: "text-green-800",  btnFull: "bg-amber-500 hover:bg-amber-600",   btnOpen: "bg-green-500 hover:bg-green-600",   dot: "bg-green-400"  },
  amber:   { accent: "border-amber-300",  badge: "bg-amber-100",  badgeText: "text-amber-800",  btnFull: "bg-amber-500 hover:bg-amber-600",   btnOpen: "bg-amber-500 hover:bg-amber-600",   dot: "bg-amber-400"  },
};
