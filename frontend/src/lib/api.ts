// Helper centralizado para comunicação com a API do Backend

export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3000';
    }
  }
  return (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
}

export const API_BASE = getApiBase();

export interface Turma {
  id: string;
  nome: string;
  turno: string;
  capacidade: number;
  idade_minima?: number;
  idade_maxima?: number;
  created_at?: string;
}

export interface Aluno {
  id: string;
  turma_id: string;
  resp_nome: string;
  resp_cpf?: string;
  resp_rg?: string;
  resp_email?: string;
  resp_telefone: string;
  resp_endereco?: string;
  resp_cep?: string;
  resp_bairro?: string;
  aluno_nome: string;
  aluno_nascimento: string;
  aluno_sexo?: string;
  aluno_cpf?: string;
  aluno_escola?: string;
  aluno_experiencia?: string;
  aluno_necessidades?: string;
  status: 'Ativo' | 'Fila' | 'Inativo';
  created_at: string;
  turmas?: Turma;
}

export interface AlunoStats {
  totalAulas: number;
  presencas: number;
  faltas: number;
  justificadas: number;
  frequenciaPercentual: number;
  faltasConsecutivas: number;
  ultimaFalta?: string;
}

export interface HistoricoItem {
  id: string;
  data: string;
  presente: boolean;
  status: 'PRESENTE' | 'FALTA' | 'JUSTIFICADA';
  observacao?: string;
  created_at?: string;
}

export interface AlunoComStats extends Aluno {
  stats: AlunoStats;
}

export interface TurmaAlunosResumo {
  turma: Turma;
  alunos: AlunoComStats[];
  totalAlunos: number;
  ativos: number;
  fila: number;
}

export interface AlunoHistoricoResponse {
  aluno: Aluno;
  stats: AlunoStats;
  historico: HistoricoItem[];
}

// Métodos da API
export async function fetchTurmas(): Promise<Turma[]> {
  const res = await fetch(`${getApiBase()}/turmas`);
  if (!res.ok) throw new Error('Falha ao buscar turmas');
  return res.json();
}

export async function fetchAlunos(): Promise<Aluno[]> {
  const res = await fetch(`${getApiBase()}/alunos`);
  if (!res.ok) throw new Error('Falha ao buscar alunos');
  return res.json();
}

export async function fetchAlunosPorTurmaComStats(turmaId: string): Promise<TurmaAlunosResumo> {
  const res = await fetch(`${getApiBase()}/frequencias/turma/${turmaId}/alunos-resumo`);
  if (!res.ok) throw new Error('Falha ao buscar alunos da turma');
  return res.json();
}

export async function fetchHistoricoAluno(alunoId: string): Promise<AlunoHistoricoResponse> {
  const res = await fetch(`${getApiBase()}/frequencias/aluno/${alunoId}`);
  if (!res.ok) throw new Error('Falha ao buscar histórico do aluno');
  return res.json();
}

export async function justificarFalta(alunoId: string, dataStr: string, observacao: string) {
  const res = await fetch(`${getApiBase()}/frequencias/justificar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ aluno_id: alunoId, data: dataStr, observacao }),
  });
  if (!res.ok) throw new Error('Falha ao justificar falta');
  return res.json();
}

export async function fetchAlertasFaltas() {
  const res = await fetch(`${getApiBase()}/frequencias/alertas`);
  if (!res.ok) return [];
  return res.json();
}

export async function salvarLoteFrequencia(turmaId: string, dataStr: string, registros: any[]) {
  const res = await fetch(`${getApiBase()}/frequencias/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      turma_id: turmaId,
      data: dataStr,
      registros,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Falha ao salvar frequências');
  }
  return res.json();
}
