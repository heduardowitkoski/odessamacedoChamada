// Helper centralizado para comunicação com a API do Backend

export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      host.startsWith('172.')
    ) {
      return `http://${host}:3000`;
    }
  }
  return (import.meta as any).env?.VITE_API_URL || 'https://odessamacedochamada.onrender.com';
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
  resp_parentesco?: string;
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
  status: 'PRESENTE' | 'FALTA' | 'JUSTIFICADA';
  observacao?: string;
}

export interface AlunoComStats extends Aluno {
  stats: AlunoStats;
  historico: HistoricoItem[];
}

export interface TurmaAlunosResumo {
  turma: Turma;
  totalAlunos: number;
  capacidade: number;
  mediaFrequencia: number;
  alunos: AlunoComStats[];
}

export interface AlunoHistoricoResponse {
  aluno: Aluno;
  stats: AlunoStats;
  historico: HistoricoItem[];
}

export interface AuditLog {
  id: string;
  created_at: string;
  acao: string;
  detalhes?: string;
  aluno_nome?: string;
  turma_nome?: string;
  autor_nome?: string;
  autor_email?: string;
  autor_role?: string;
  categoria?: string;
}

// ----------------------------------------------------------------------
// Métodos de API
// ----------------------------------------------------------------------

export async function fetchAlunosPorTurmaComStats(turmaId: string): Promise<TurmaAlunosResumo> {
  const base = getApiBase();
  const res = await fetch(`${base}/frequencias/turma/${turmaId}/alunos-resumo`);
  if (!res.ok) {
    throw new Error('Falha ao carregar alunos e estatísticas da turma');
  }
  return res.json();
}

export async function fetchHistoricoAluno(alunoId: string): Promise<AlunoHistoricoResponse> {
  const base = getApiBase();
  const res = await fetch(`${base}/frequencias/aluno/${alunoId}`);
  if (!res.ok) {
    throw new Error('Falha ao carregar histórico do aluno');
  }
  return res.json();
}

export async function justificarFalta(alunoId: string, data: string, justificativa: string): Promise<{ success: boolean; message: string }> {
  const base = getApiBase();
  const res = await fetch(`${base}/frequencias/justificar`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ aluno_id: alunoId, data, justificativa }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Erro ao justificar falta');
  }
  return res.json();
}

export async function fetchLogs(): Promise<AuditLog[]> {
  const base = getApiBase();
  const res = await fetch(`${base}/admin/logs`);
  if (!res.ok) {
    throw new Error('Falha ao buscar logs de auditoria');
  }
  return res.json();
}

export async function exportarLogsCSV(): Promise<string> {
  const base = getApiBase();
  const res = await fetch(`${base}/admin/logs/exportar`);
  if (!res.ok) {
    throw new Error('Falha ao exportar logs em CSV');
  }
  const data = await res.json();
  return data.csv;
}
