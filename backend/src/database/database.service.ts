import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';

export interface Turma {
  id: string;
  nome: string;
  turno: string;
  capacidade: number;
  idade_minima?: number;
  idade_maxima?: number;
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

export interface MuralItem {
  id: string;
  titulo: string;
  descricao: string;
  turma_id?: string;
  turma_nome?: string;
  autor_nome: string;
  autor_role?: 'admin' | 'professor';
  tecnica?: string;
  imagens: string[];
  created_at: string;
}

export function extractAgeRange(nome: string): { idade_minima: number; idade_maxima: number } {
  if (!nome) return { idade_minima: 0, idade_maxima: 120 };
  const matchRange = nome.match(/(\d+)\s*a\s*(\d+)/i);
  if (matchRange) {
    return { idade_minima: parseInt(matchRange[1], 10), idade_maxima: parseInt(matchRange[2], 10) };
  }
  const matchPlus = nome.match(/(\d+)\s*\+/);
  if (matchPlus) {
    const min = parseInt(matchPlus[1], 10);
    return { idade_minima: min, idade_maxima: min >= 60 ? 120 : 59 };
  }
  if (/infantil a/i.test(nome)) return { idade_minima: 5, idade_maxima: 7 };
  if (/infantil b/i.test(nome)) return { idade_minima: 8, idade_maxima: 10 };
  if (/juvenil a/i.test(nome)) return { idade_minima: 11, idade_maxima: 13 };
  if (/juvenil b/i.test(nome)) return { idade_minima: 14, idade_maxima: 17 };
  if (/adulto/i.test(nome)) return { idade_minima: 18, idade_maxima: 59 };
  if (/melhor idade|idoso/i.test(nome)) return { idade_minima: 60, idade_maxima: 120 };
  return { idade_minima: 0, idade_maxima: 120 };
}

async function withTimeout<T = any>(promise: any, timeoutMs = 3000, fallbackValue: any = null): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallbackValue), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } catch {
    return fallbackValue;
  } finally {
    clearTimeout(timer!);
  }
}

interface MemoryStore {
  turmas: Turma[];
  alunos: Aluno[];
  frequencias: Frequencia[];
  lista_espera: any[];
  mural: MuralItem[];
}

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly filePath = path.join(process.cwd(), 'data', 'db.json');

  // Cache Residente em Memória RAM (< 1ms de resposta)
  private memoryDb: MemoryStore = {
    turmas: [],
    alunos: [],
    frequencias: [],
    lista_espera: [],
    mural: [],
  };

  private isSyncing = false;
  private lastSync = 0;
  private readonly SYNC_COOLDOWN_MS = 10000; // 10 segundos entre verificações de segundo plano

  constructor(private readonly supabaseService: SupabaseService) {
    this.initSyncMemoryFromDisk();
  }

  async onModuleInit() {
    this.syncWithSupabaseInBackground();
  }

  private getDefaultMural(): MuralItem[] {
    return [
      {
        id: 'obra-1',
        titulo: 'Estudos de Aguadas em Nanquim e Pincel Oriental',
        descricao: 'Durante a aula prática, os estudantes exploraram as gradações de tons do nanquim diluído em água, exercitando pinceladas fluidas e contrastes de luz e sombra.',
        turma_id: 'juvenil-a',
        turma_nome: 'Turma Juvenil A',
        autor_nome: 'Prof. Carlos Eduardo',
        autor_role: 'professor',
        tecnica: 'Nanquim sobre papel Canson 200g',
        imagens: [
          'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1000&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1544717305-2782549b5136?w=1000&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1000&auto=format&fit=crop&q=80',
        ],
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: 'obra-2',
        titulo: 'Oficina de Aquarela: Botânica e Pássaros do Pampa',
        descricao: 'Trabalhos vibrantes produzidos pelas crianças inspirados na flora nativa e aves da região de Bagé. Muita cor, textura e criatividade expressiva!',
        turma_id: 'infantil-a',
        turma_nome: 'Turma Infantil A',
        autor_nome: 'Profª. Mariana Luz',
        autor_role: 'professor',
        tecnica: 'Aquarela e lápis de cor aquarelável',
        imagens: [
          'https://images.unsplash.com/photo-1582561424760-0321d75e81fa?w=1000&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1000&auto=format&fit=crop&q=80',
        ],
        created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
      },
      {
        id: 'obra-3',
        titulo: 'Croquis de Figura Humana com Carvão Vegetal',
        descricao: 'Exercícios de desenho gestual rápido e captura das proporções anatômicas em poses dinâmicas com pranchetas e cavaletes.',
        turma_id: 'juvenil-b',
        turma_nome: 'Turma Juvenil B',
        autor_nome: 'Prof. Carlos Eduardo',
        autor_role: 'professor',
        tecnica: 'Carvão vegetal e giz pastel seco',
        imagens: [
          'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1000&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1569172122301-bc500f309134?w=1000&auto=format&fit=crop&q=80',
        ],
        created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
      },
      {
        id: 'obra-4',
        titulo: 'Pintura Livre e Técnicas Mistas em Painel',
        descricao: 'Composições figurativas e abstratas explorando espátula, pincel seco e sobreposição cromática com tinta acrílica.',
        turma_id: 'adulto',
        turma_nome: 'Turma Adulto',
        autor_nome: 'Profª. Mariana Luz',
        autor_role: 'professor',
        tecnica: 'Tinta acrílica e colagem sobre tela',
        imagens: [
          'https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?w=1000&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=1000&auto=format&fit=crop&q=80',
        ],
        created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
      },
    ];
  }

  private initSyncMemoryFromDisk() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(content);
        this.memoryDb = {
          turmas: parsed.turmas || [],
          alunos: parsed.alunos || [],
          frequencias: parsed.frequencias || [],
          lista_espera: parsed.lista_espera || [],
          mural: parsed.mural && parsed.mural.length > 0 ? parsed.mural : this.getDefaultMural(),
        };
        this.logger.log(`Cache RAM carregado do disco: ${this.memoryDb.turmas.length} turmas, ${this.memoryDb.alunos.length} alunos.`);
      } else {
        this.memoryDb.mural = this.getDefaultMural();
        fs.writeFileSync(this.filePath, JSON.stringify(this.memoryDb, null, 2), 'utf-8');
      }
    } catch (e: any) {
      this.logger.warn('Aviso ao inicializar cache local: ' + e?.message);
    }
  }

  private async persistToDiskAsync() {
    try {
      const dir = path.dirname(this.filePath);
      await fs.promises.mkdir(dir, { recursive: true });
      await fs.promises.writeFile(this.filePath, JSON.stringify(this.memoryDb, null, 2), 'utf-8');
    } catch (e: any) {
      this.logger.error('Erro ao persistir db.json em segundo plano: ' + e?.message);
    }
  }

  // --- SINCRONIZAÇÃO ASSÍNCRONA EM SEGUNDO PLANO (BACKGROUND SYNC COM TIMEOUT DE 3S) ---
  public syncWithSupabaseInBackground() {
    if (this.isSyncing) return;
    const now = Date.now();
    if (now - this.lastSync < this.SYNC_COOLDOWN_MS) return;

    this.isSyncing = true;
    this.lastSync = now;

    (async () => {
      try {
        const client = this.supabaseService.getClient();

        const [turmasRes, alunosRes, freqRes] = await Promise.all([
          withTimeout<any>(
            client.from('turmas').select('*').order('created_at', { ascending: false }),
            3000,
            { data: null, error: null }
          ),
          withTimeout<any>(
            client.from('alunos').select('*').order('created_at', { ascending: false }),
            3000,
            { data: null, error: null }
          ),
          withTimeout<any>(
            client.from('frequencias').select('*').order('data', { ascending: false }).limit(2000),
            3000,
            { data: null, error: null }
          ),
        ]);

        let updated = false;

        if (turmasRes?.data && Array.isArray(turmasRes.data) && turmasRes.data.length > 0) {
          this.memoryDb.turmas = turmasRes.data.map((t: any) => {
            const fallback = extractAgeRange(t.nome || '');
            return {
              ...t,
              idade_minima: t.idade_minima != null ? Number(t.idade_minima) : fallback.idade_minima,
              idade_maxima: t.idade_maxima != null ? Number(t.idade_maxima) : fallback.idade_maxima,
            };
          });
          updated = true;
        }

        if (alunosRes?.data && Array.isArray(alunosRes.data) && alunosRes.data.length > 0) {
          this.memoryDb.alunos = alunosRes.data;
          updated = true;
        }

        if (freqRes?.data && Array.isArray(freqRes.data) && freqRes.data.length > 0) {
          this.memoryDb.frequencias = freqRes.data;
          updated = true;
        }

        if (updated) {
          await this.persistToDiskAsync();
        }
      } catch (err: any) {
        this.logger.debug('Sincronização em segundo plano: ' + err?.message);
      } finally {
        this.isSyncing = false;
      }
    })();
  }

  // --- TURMAS (RESPOSTA INSTANTÂNEA < 1ms DA RAM) ---
  async getTurmas(): Promise<Turma[]> {
    this.syncWithSupabaseInBackground();
    return this.memoryDb.turmas.map((t) => {
      const fallback = extractAgeRange(t.nome || '');
      return {
        ...t,
        idade_minima: t.idade_minima != null ? Number(t.idade_minima) : fallback.idade_minima,
        idade_maxima: t.idade_maxima != null ? Number(t.idade_maxima) : fallback.idade_maxima,
      };
    });
  }

  async getTurmaById(id: string): Promise<Turma | null> {
    const turma = this.memoryDb.turmas.find((t) => t.id === id);
    if (!turma) return null;
    const fallback = extractAgeRange(turma.nome || '');
    return {
      ...turma,
      idade_minima: turma.idade_minima != null ? Number(turma.idade_minima) : fallback.idade_minima,
      idade_maxima: turma.idade_maxima != null ? Number(turma.idade_maxima) : fallback.idade_maxima,
    };
  }

  async createTurma(data: {
    nome: string;
    turno: string;
    capacidade: number;
    idade_minima?: number;
    idade_maxima?: number;
  }): Promise<Turma> {
    const fallback = extractAgeRange(data.nome || '');
    const nova: Turma = {
      id: randomUUID(),
      nome: data.nome,
      turno: data.turno,
      capacidade: Number(data.capacidade) || 0,
      idade_minima: data.idade_minima != null ? Number(data.idade_minima) : fallback.idade_minima,
      idade_maxima: data.idade_maxima != null ? Number(data.idade_maxima) : fallback.idade_maxima,
      created_at: new Date().toISOString(),
    };

    this.memoryDb.turmas.unshift(nova);
    this.persistToDiskAsync();

    (async () => {
      try {
        const client = this.supabaseService.getClient();
        await withTimeout<any>(
          client.from('turmas').insert([nova]),
          3000,
          null
        );
      } catch (err: any) {
        this.logger.warn('Aviso ao sincronizar turma no Supabase: ' + err?.message);
      }
    })();

    return nova;
  }

  // --- ALUNOS (MAPEAMENTO DIRETO EM MEMÓRIA & RESPOSTA INSTANTÂNEA < 1ms) ---
  async getAlunos(): Promise<Aluno[]> {
    this.syncWithSupabaseInBackground();

    const mapTurmas = new Map<string, Turma>();
    for (const t of this.memoryDb.turmas) {
      mapTurmas.set(t.id, t);
    }

    return this.memoryDb.alunos.map((a) => ({
      ...a,
      turmas: mapTurmas.get(a.turma_id) || {
        id: a.turma_id,
        nome: 'Turma Geral',
        turno: 'Geral',
        capacidade: 0,
        created_at: a.created_at,
      },
    }));
  }

  async createAluno(dto: any): Promise<Aluno> {
    let selectedTurma = this.memoryDb.turmas.find((t) => t.id === dto.turma_id);
    if (!selectedTurma && this.memoryDb.turmas.length > 0) {
      selectedTurma = this.memoryDb.turmas[0];
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

    this.memoryDb.alunos.unshift(novo);

    if (status === 'Ativo' && selectedTurma && selectedTurma.capacidade > 0) {
      selectedTurma.capacidade -= 1;
    }

    this.persistToDiskAsync();

    (async () => {
      try {
        const client = this.supabaseService.getClient();
        await withTimeout<any>(
          client.from('alunos').insert([novo]),
          3000,
          null
        );
        if (status === 'Ativo' && selectedTurma) {
          await withTimeout<any>(
            client.from('turmas').update({ capacidade: selectedTurma.capacidade }).eq('id', selectedTurma.id),
            3000,
            null
          );
        }
      } catch (err: any) {
        this.logger.warn('Aviso ao sincronizar aluno no Supabase: ' + err?.message);
      }
    })();

    return {
      ...novo,
      turmas: selectedTurma,
    };
  }

  async updateAlunoStatus(id: string, novoStatus: string, turma_id: string): Promise<Aluno | null> {
    const aluno = this.memoryDb.alunos.find((a) => a.id === id);
    if (!aluno) return null;

    const statusAnterior = aluno.status;
    aluno.status = novoStatus;
    aluno.turma_id = turma_id;

    const turma = this.memoryDb.turmas.find((t) => t.id === turma_id);
    if (turma) {
      if (statusAnterior !== 'Inativo' && novoStatus === 'Inativo') {
        turma.capacidade += 1;
      } else if (statusAnterior !== 'Ativo' && novoStatus === 'Ativo' && turma.capacidade > 0) {
        turma.capacidade -= 1;
      }
    }

    this.persistToDiskAsync();

    (async () => {
      try {
        const client = this.supabaseService.getClient();
        await withTimeout<any>(
          client.from('alunos').update({ status: novoStatus, turma_id }).eq('id', id),
          3000,
          null
        );
        if (turma) {
          await withTimeout<any>(
            client.from('turmas').update({ capacidade: turma.capacidade }).eq('id', turma_id),
            3000,
            null
          );
        }
      } catch (err: any) {
        this.logger.warn('Aviso ao atualizar status no Supabase: ' + err?.message);
      }
    })();

    return {
      ...aluno,
      turmas: turma,
    };
  }

  async removeAluno(id: string): Promise<{ success: boolean; message: string }> {
    const index = this.memoryDb.alunos.findIndex((a) => a.id === id);
    if (index === -1) {
      return { success: false, message: 'Aluno não encontrado' };
    }

    const [removido] = this.memoryDb.alunos.splice(index, 1);

    if (removido.status === 'Ativo' && removido.turma_id) {
      const turma = this.memoryDb.turmas.find((t) => t.id === removido.turma_id);
      if (turma) {
        turma.capacidade += 1;
      }
    }

    this.memoryDb.frequencias = this.memoryDb.frequencias.filter((f) => f.aluno_id !== id);
    this.persistToDiskAsync();

    (async () => {
      try {
        const client = this.supabaseService.getClient();
        await withTimeout<any>(
          client.from('frequencias').delete().eq('aluno_id', id),
          3000,
          null
        );
        await withTimeout<any>(
          client.from('alunos').delete().eq('id', id),
          3000,
          null
        );
        if (removido.status === 'Ativo' && removido.turma_id) {
          const turma = this.memoryDb.turmas.find((t) => t.id === removido.turma_id);
          if (turma) {
            await withTimeout<any>(
              client.from('turmas').update({ capacidade: turma.capacidade }).eq('id', turma.id),
              3000,
              null
            );
          }
        }
      } catch (err: any) {
        this.logger.warn('Aviso ao excluir aluno no Supabase: ' + err?.message);
      }
    })();

    return { success: true, message: 'Aluno removido com sucesso do banco de dados.' };
  }

  // --- FREQUÊNCIAS & CHAMADA (RESPOSTA INSTANTÂNEA < 1ms DA RAM) ---
  async getFrequencias(turma_id: string, dataStr: string) {
    this.syncWithSupabaseInBackground();

    const alunosTurma = this.memoryDb.alunos.filter(
      (a) => a.turma_id === turma_id && a.status !== 'Inativo'
    );

    const freqsDesteDia = this.memoryDb.frequencias.filter((f) => f.data === dataStr);
    const mapFreq = new Map<string, Frequencia>();
    for (const f of freqsDesteDia) {
      mapFreq.set(f.aluno_id, f);
    }

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
          obsCalc = reg.justificativa.replace('[JUSTIFICADA] ', '').replace('[JUSTIFICADA]', '');
        } else {
          statusCalc = 'FALTA';
        }
      }

      return {
        ...aluno,
        aluno_nome: aluno.aluno_nome || aluno.resp_nome || 'Aluno sem nome',
        frequencia: {
          status: statusCalc,
          observacao: obsCalc,
          id: reg?.id,
        },
      };
    });
  }

  async saveFrequencias(
    turma_id: string,
    dataStr: string,
    registros: { aluno_id: string; status: string; observacao?: string }[]
  ) {
    const payloadParaSupabase: any[] = [];

    for (const r of registros) {
      const isPresente = r.status === 'PRESENTE';
      const just = r.status === 'JUSTIFICADA'
        ? (r.observacao ? `[JUSTIFICADA] ${r.observacao}` : '[JUSTIFICADA]')
        : (r.observacao || '');

      const idx = this.memoryDb.frequencias.findIndex(
        (f) => f.aluno_id === r.aluno_id && f.data === dataStr
      );

      if (idx !== -1) {
        this.memoryDb.frequencias[idx].presente = isPresente;
        this.memoryDb.frequencias[idx].justificativa = just;
      } else {
        const novaFreq: Frequencia = {
          id: randomUUID(),
          aluno_id: r.aluno_id,
          data: dataStr,
          presente: isPresente,
          justificativa: just,
          created_at: new Date().toISOString(),
        };
        this.memoryDb.frequencias.push(novaFreq);
      }

      payloadParaSupabase.push({
        aluno_id: r.aluno_id,
        data: dataStr,
        presente: isPresente,
        justificativa: just || null,
      });
    }

    this.persistToDiskAsync();

    (async () => {
      try {
        const client = this.supabaseService.getClient();
        await withTimeout<any>(
          client.from('frequencias').upsert(payloadParaSupabase, { onConflict: 'aluno_id,data' }),
          3000,
          null
        );
      } catch (err: any) {
        this.logger.warn('Aviso ao sincronizar frequências no Supabase: ' + err?.message);
      }
    })();

    return { success: true };
  }

  // --- ABSENTEÍSMO / ALERTAS (PROCESSAMENTO DIRETO EM MEMÓRIA < 1ms) ---
  async getAlertasFaltas() {
    this.syncWithSupabaseInBackground();

    const alunosAtivos = this.memoryDb.alunos.filter((a) => a.status === 'Ativo');
    const mapTurmas = new Map<string, Turma>();
    for (const t of this.memoryDb.turmas) {
      mapTurmas.set(t.id, t);
    }

    const alertas: any[] = [];

    for (const aluno of alunosAtivos) {
      const freqs = this.memoryDb.frequencias
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
          aluno: {
            ...aluno,
            turmas: mapTurmas.get(aluno.turma_id) || null,
          },
          faltasConsecutivas,
          ultimaFalta: freqs[0]?.data,
        });
      }
    }

    return alertas;
  }

  // --- CONSULTA DO RESPONSÁVEL EM MEMÓRIA (< 1ms) ---
  async getMinhasFaltasPorEmail(email: string) {
    if (!email) return { alunos: [] };
    const cleanEmail = email.trim().toLowerCase();

    this.syncWithSupabaseInBackground();

    const alunosDoResp = this.memoryDb.alunos.filter(
      (a) => a.resp_email && a.resp_email.trim().toLowerCase() === cleanEmail && a.status !== 'Inativo'
    );

    const mapTurmas = new Map<string, Turma>();
    for (const t of this.memoryDb.turmas) {
      mapTurmas.set(t.id, t);
    }

    const resultadoAlunos = alunosDoResp.map((aluno) => {
      const freqs = this.memoryDb.frequencias
        .filter((f) => f.aluno_id === aluno.id)
        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

      const historico = freqs.map((f) => {
        let status: 'PRESENTE' | 'FALTA' | 'JUSTIFICADA' = 'PRESENTE';
        let justificativa = f.justificativa || '';

        if (f.presente) {
          status = 'PRESENTE';
        } else if (justificativa && justificativa.includes('JUSTIFICADA')) {
          status = 'JUSTIFICADA';
          justificativa = justificativa.replace('[JUSTIFICADA]', '').trim();
        } else {
          status = 'FALTA';
        }

        return {
          id: f.id,
          data: f.data,
          status,
          justificativa,
        };
      });

      const totalAulas = historico.length;
      const presencas = historico.filter((h) => h.status === 'PRESENTE').length;
      const justificadas = historico.filter((h) => h.status === 'JUSTIFICADA').length;
      const faltas = historico.filter((h) => h.status === 'FALTA').length;
      const frequenciaPercentual = totalAulas > 0
        ? Math.round(((presencas + justificadas) / totalAulas) * 100)
        : 100;

      return {
        id: aluno.id,
        aluno_nome: aluno.aluno_nome,
        resp_nome: aluno.resp_nome,
        resp_email: aluno.resp_email,
        resp_telefone: aluno.resp_telefone,
        turma: mapTurmas.get(aluno.turma_id) || null,
        status: aluno.status,
        stats: {
          totalAulas,
          presencas,
          faltas,
          justificadas,
          frequenciaPercentual,
        },
        historico,
      };
    });

    return { alunos: resultadoAlunos };
  }

  // --- MURAL DE OBRAS & PRODUÇÕES ARTÍSTICAS (EXCLUSIVO PARA OBRAS E FOTOS) ---
  async getMural(turmaId?: string): Promise<MuralItem[]> {
    if (!this.memoryDb.mural || this.memoryDb.mural.length === 0) {
      this.memoryDb.mural = this.getDefaultMural();
    }
    let items = [...this.memoryDb.mural];
    if (turmaId && turmaId !== 'todas') {
      items = items.filter(
        (m) => !m.turma_id || m.turma_id === '' || m.turma_id === turmaId
      );
    }
    return items.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  async createMuralItem(dto: any): Promise<MuralItem> {
    if (!this.memoryDb.mural) this.memoryDb.mural = this.getDefaultMural();
    const imgs: string[] = Array.isArray(dto.imagens) && dto.imagens.length > 0
      ? dto.imagens.filter((url: string) => url && typeof url === 'string' && url.trim().length > 0)
      : (dto.imagem_url ? [dto.imagem_url] : []);

    const novo: MuralItem = {
      id: randomUUID(),
      titulo: dto.titulo || 'Obra sem título',
      descricao: dto.descricao || '',
      turma_id: dto.turma_id || '',
      turma_nome: dto.turma_nome || 'Todas as Turmas',
      autor_nome: dto.autor_nome || 'Coordenação',
      autor_role: dto.autor_role || 'professor',
      tecnica: dto.tecnica || 'Técnica Mista',
      imagens: imgs.length > 0 ? imgs : ['https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80'],
      created_at: new Date().toISOString(),
    };
    this.memoryDb.mural.unshift(novo);
    this.persistToDiskAsync();
    return novo;
  }

  async updateMuralItem(id: string, dto: any): Promise<MuralItem | null> {
    if (!this.memoryDb.mural) return null;
    const idx = this.memoryDb.mural.findIndex((m) => m.id === id);
    if (idx === -1) return null;

    let imgs = this.memoryDb.mural[idx].imagens;
    if (Array.isArray(dto.imagens) && dto.imagens.length > 0) {
      imgs = dto.imagens.filter((url: string) => url && typeof url === 'string' && url.trim().length > 0);
    } else if (dto.imagem_url) {
      imgs = [dto.imagem_url];
    }

    this.memoryDb.mural[idx] = {
      ...this.memoryDb.mural[idx],
      ...dto,
      imagens: imgs,
    };
    this.persistToDiskAsync();
    return this.memoryDb.mural[idx];
  }

  async deleteMuralItem(id: string): Promise<boolean> {
    if (!this.memoryDb.mural) return false;
    const idx = this.memoryDb.mural.findIndex((m) => m.id === id);
    if (idx === -1) return false;
    this.memoryDb.mural.splice(idx, 1);
    this.persistToDiskAsync();
    return true;
  }
}
