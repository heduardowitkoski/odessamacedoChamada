import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';

export interface Turma {
  id: string;
  nome: string;
  turno: string;
  capacidade: number;
  created_at: string;
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
  status: string;
  created_at: string;
  turmas?: Turma;
}

export interface Frequencia {
  id: string;
  aluno_id: string;
  data: string;
  presente: boolean;
  justificativa?: string;
  created_at: string;
}

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly filePath = path.join(process.cwd(), 'data', 'db.json');

  constructor(private readonly supabaseService: SupabaseService) {
    this.ensureFileExists();
  }

  private ensureFileExists() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.filePath)) {
      const initial = { turmas: [], alunos: [], frequencias: [], lista_espera: [] };
      fs.writeFileSync(this.filePath, JSON.stringify(initial, null, 2), 'utf-8');
    }
  }

  private readDb(): { turmas: Turma[]; alunos: Aluno[]; frequencias: Frequencia[]; lista_espera: any[] } {
    try {
      this.ensureFileExists();
      const content = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(content);
    } catch (e) {
      this.logger.error('Erro ao ler db.json: ' + e.message);
      return { turmas: [], alunos: [], frequencias: [], lista_espera: [] };
    }
  }

  private writeDb(data: { turmas: Turma[]; alunos: Aluno[]; frequencias: Frequencia[]; lista_espera: any[] }) {
    try {
      this.ensureFileExists();
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      this.logger.error('Erro ao salvar db.json: ' + e.message);
    }
  }

  // --- TURMAS ---
  async getTurmas(): Promise<Turma[]> {
    try {
      const { data, error } = await this.supabaseService
        .getClient()
        .from('turmas')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        // Sync local
        const db = this.readDb();
        db.turmas = data;
        this.writeDb(db);
        return data;
      }
    } catch (err) {
      // Usa local
    }

    const db = this.readDb();
    return db.turmas;
  }

  async getTurmaById(id: string): Promise<Turma | null> {
    const turmas = await this.getTurmas();
    return turmas.find((t) => t.id === id) || null;
  }

  async createTurma(data: { nome: string; turno: string; capacidade: number }): Promise<Turma> {
    const nova: Turma = {
      id: randomUUID(),
      nome: data.nome,
      turno: data.turno,
      capacidade: Number(data.capacidade) || 0,
      created_at: new Date().toISOString(),
    };

    const db = this.readDb();
    db.turmas.unshift(nova);
    this.writeDb(db);

    try {
      await this.supabaseService.getClient().from('turmas').insert([nova]);
    } catch (e) {}

    return nova;
  }

  // --- ALUNOS ---
  async getAlunos(): Promise<Aluno[]> {
    let alunosList: Aluno[] = [];

    try {
      const { data, error } = await this.supabaseService
        .getClient()
        .from('alunos')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        alunosList = data;
        const db = this.readDb();
        db.alunos = data;
        this.writeDb(db);
      }
    } catch (err) {
      // Usa local
    }

    if (alunosList.length === 0) {
      const db = this.readDb();
      alunosList = db.alunos;
    }

    // Attach turmas
    const turmas = await this.getTurmas();
    const mapTurmas = new Map<string, Turma>();
    turmas.forEach((t) => mapTurmas.set(t.id, t));

    return alunosList.map((a) => ({
      ...a,
      turmas: mapTurmas.get(a.turma_id) || {
        id: a.turma_id,
        nome: 'Turma de Artes',
        turno: 'Geral',
        capacidade: 0,
        created_at: a.created_at,
      },
    }));
  }

  async createAluno(dto: any): Promise<Aluno> {
    const turmas = await this.getTurmas();
    let selectedTurma = turmas.find((t) => t.id === dto.turma_id);

    // Se não encontrou por ID exato, seleciona a primeira turma disponível
    if (!selectedTurma && turmas.length > 0) {
      selectedTurma = turmas[0];
    }

    let status = 'Ativo';
    if (selectedTurma && selectedTurma.capacidade <= 0) {
      status = 'Fila';
    }

    const novo: Aluno = {
      id: randomUUID(),
      turma_id: selectedTurma ? selectedTurma.id : dto.turma_id || randomUUID(),
      resp_nome: dto.resp_nome || 'Responsável',
      resp_cpf: dto.resp_cpf || '',
      resp_rg: dto.resp_rg || '',
      resp_email: dto.resp_email || '',
      resp_telefone: dto.resp_telefone || '(53) 99999-0000',
      resp_endereco: dto.resp_endereco || '',
      resp_cep: dto.resp_cep || '',
      resp_bairro: dto.resp_bairro || '',
      aluno_nome: dto.aluno_nome || 'Aluno',
      aluno_nascimento: dto.aluno_nascimento || new Date().toISOString().split('T')[0],
      aluno_sexo: dto.aluno_sexo || '',
      aluno_cpf: dto.aluno_cpf || '',
      aluno_escola: dto.aluno_escola || '',
      aluno_experiencia: dto.aluno_experiencia || '',
      aluno_necessidades: dto.aluno_necessidades || '',
      status: status,
      created_at: new Date().toISOString(),
    };

    const db = this.readDb();
    db.alunos.unshift(novo);

    // Se virou ativo e a turma tem capacidade, desconta 1 vaga
    if (status === 'Ativo' && selectedTurma && selectedTurma.capacidade > 0) {
      const idx = db.turmas.findIndex((t) => t.id === selectedTurma?.id);
      if (idx !== -1) {
        db.turmas[idx].capacidade -= 1;
      }
    }

    this.writeDb(db);

    try {
      await this.supabaseService.getClient().from('alunos').insert([novo]);
    } catch (e) {}

    return {
      ...novo,
      turmas: selectedTurma,
    };
  }

  async updateAlunoStatus(id: string, novoStatus: string, turma_id: string): Promise<Aluno | null> {
    const db = this.readDb();
    const alunoIdx = db.alunos.findIndex((a) => a.id === id);
    if (alunoIdx === -1) return null;

    db.alunos[alunoIdx].status = novoStatus;

    if (novoStatus === 'Inativo') {
      const tIdx = db.turmas.findIndex((t) => t.id === turma_id);
      if (tIdx !== -1) db.turmas[tIdx].capacidade += 1;
    } else if (novoStatus === 'Ativo') {
      const tIdx = db.turmas.findIndex((t) => t.id === turma_id);
      if (tIdx !== -1 && db.turmas[tIdx].capacidade > 0) {
        db.turmas[tIdx].capacidade -= 1;
      }
    }

    this.writeDb(db);

    try {
      await this.supabaseService.getClient().from('alunos').update({ status: novoStatus }).eq('id', id);
    } catch (e) {}

    return db.alunos[alunoIdx];
  }

  // --- FREQUÊNCIAS ---
  async getFrequencias(turma_id: string, dataStr: string) {
    const todosAlunos = await this.getAlunos();
    const alunosTurma = todosAlunos.filter((a) => a.turma_id === turma_id && a.status !== 'Inativo');

    const db = this.readDb();
    const freqsDesteDia = db.frequencias.filter((f) => f.data === dataStr);
    const mapFreq = new Map<string, Frequencia>();
    freqsDesteDia.forEach((f) => mapFreq.set(f.aluno_id, f));

    return alunosTurma.map((aluno) => {
      const reg = mapFreq.get(aluno.id);
      let statusCalc: 'PRESENTE' | 'FALTA' | 'JUSTIFICADA' = 'PRESENTE';
      let obsCalc = '';

      if (reg) {
        obsCalc = reg.justificativa || '';
        if (reg.presente) {
          statusCalc = 'PRESENTE';
        } else if (reg.justificativa && reg.justificativa.includes('JUSTIFICADA')) {
          statusCalc = 'JUSTIFICADA';
        } else {
          statusCalc = 'FALTA';
        }
      }

      return {
        ...aluno,
        frequencia: {
          status: statusCalc,
          observacao: obsCalc,
          id: reg?.id,
        },
      };
    });
  }

  async saveFrequencias(turma_id: string, dataStr: string, registros: { aluno_id: string; status: string; observacao?: string }[]) {
    const db = this.readDb();

    for (const r of registros) {
      const isPresente = r.status === 'PRESENTE';
      const just = r.status === 'JUSTIFICADA'
        ? (r.observacao ? `[JUSTIFICADA] ${r.observacao}` : '[JUSTIFICADA]')
        : (r.observacao || '');

      const idx = db.frequencias.findIndex((f) => f.aluno_id === r.aluno_id && f.data === dataStr);
      if (idx !== -1) {
        db.frequencias[idx].presente = isPresente;
        db.frequencias[idx].justificativa = just;
      } else {
        db.frequencias.push({
          id: randomUUID(),
          aluno_id: r.aluno_id,
          data: dataStr,
          presente: isPresente,
          justificativa: just,
          created_at: new Date().toISOString(),
        });
      }
    }

    this.writeDb(db);
    return { success: true };
  }

  async getAlertasFaltas() {
    const todosAlunos = await this.getAlunos();
    const alunosAtivos = todosAlunos.filter((a) => a.status === 'Ativo');
    const db = this.readDb();

    const alertas: any[] = [];
    for (const aluno of alunosAtivos) {
      const freqs = db.frequencias
        .filter((f) => f.aluno_id === aluno.id)
        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
        .slice(0, 10);

      let faltasConsecutivas = 0;
      for (const freq of freqs) {
        if (!freq.presente && (!freq.justificativa || !freq.justificativa.includes('JUSTIFICADA'))) {
          faltasConsecutivas++;
        } else {
          break;
        }
      }

      if (faltasConsecutivas >= 3) {
        alertas.push({
          aluno,
          faltasConsecutivas,
          ultimaFalta: freqs[0]?.data,
        });
      }
    }

    return alertas;
  }
}
