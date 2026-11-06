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
  status: string;
  created_at: string;
  turmas?: Turma;
}

export interface ListaEspera {
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
  status: string; // 'aguardando' | 'aprovado' | 'recusado'
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

export interface AdminUser {
  id: string;
  email: string;
  nome?: string;
  role: string;
  created_at: string;
  last_sign_in_at?: string;
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
  admins: AdminUser[];
  mural: MuralItem[];
}

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);
  private filePath: string;

  // Cache Residente em Memória RAM (< 1ms de resposta)
  private memoryDb: MemoryStore = {
    turmas: [],
    alunos: [],
    frequencias: [],
    lista_espera: [],
    admins: [],
    mural: [],
  };

  private isSyncing = false;
  private lastSync = 0;
  private readonly SYNC_COOLDOWN_MS = 60000;
  private supabaseActive = true;

  constructor(private readonly supabaseService: SupabaseService) {
    this.filePath = this.resolveDbPath();
    this.initSyncMemoryFromDisk();
  }

  async onModuleInit() {
    this.syncWithSupabaseInBackground();
  }

  private resolveDbPath(): string {
    const candidates = [
      path.join(process.cwd(), 'backend', 'data', 'db.json'),
      path.join(process.cwd(), 'data', 'db.json'),
      path.resolve(__dirname, '..', '..', 'data', 'db.json'),
      path.resolve(__dirname, '..', 'data', 'db.json'),
      path.resolve(__dirname, '../../data/db.json'),
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        this.logger.log(`Banco local db.json localizado em: ${p}`);
        return p;
      }
    }

    if (fs.existsSync(path.join(process.cwd(), 'backend'))) {
      const preferred = path.join(process.cwd(), 'backend', 'data', 'db.json');
      return preferred;
    }

    return path.join(process.cwd(), 'data', 'db.json');
  }

  private getDefaultAdmins(): AdminUser[] {
    return [
      {
        id: 'admin-1',
        email: 'cultura@bage.rs.gov.br',
        nome: 'Secretaria de Cultura Bagé',
        role: 'admin',
        created_at: new Date().toISOString(),
      },
      {
        id: 'admin-2',
        email: 'admin@odessamacedo.edu.br',
        nome: 'Coordenação Odessa Macedo',
        role: 'admin',
        created_at: new Date().toISOString(),
      },
    ];
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
          turmas: Array.isArray(parsed.turmas) ? parsed.turmas : [],
          alunos: Array.isArray(parsed.alunos) ? parsed.alunos : [],
          frequencias: Array.isArray(parsed.frequencias) ? parsed.frequencias : [],
          lista_espera: Array.isArray(parsed.lista_espera) ? parsed.lista_espera : [],
          admins: Array.isArray(parsed.admins) && parsed.admins.length > 0 ? parsed.admins : this.getDefaultAdmins(),
          mural: Array.isArray(parsed.mural) && parsed.mural.length > 0 ? parsed.mural : this.getDefaultMural(),
        };
        this.logger.log(`Cache RAM carregado do disco: ${this.memoryDb.turmas.length} turmas, ${this.memoryDb.alunos.length} alunos, ${this.memoryDb.frequencias.length} registros de frequência.`);
      } else {
        this.memoryDb.mural = this.getDefaultMural();
        this.memoryDb.admins = this.getDefaultAdmins();
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

  public syncWithSupabaseInBackground() {
    if (!this.supabaseActive) return;
    if (this.isSyncing) return;
    const now = Date.now();
    if (now - this.lastSync < this.SYNC_COOLDOWN_MS) return;

    this.isSyncing = true;
    this.lastSync = now;

    (async () => {
      try {
        const client = this.supabaseService.getClient();

        const [turmasRes, alunosRes, freqRes, listaEsperaRes] = await Promise.all([
          withTimeout<any>(
            client.from('turmas').select('*').order('created_at', { ascending: false }),
            2000,
            { data: null, error: { message: 'Timeout' } }
          ),
          withTimeout<any>(
            client.from('alunos').select('*').order('created_at', { ascending: false }),
            2000,
            { data: null, error: { message: 'Timeout' } }
          ),
          withTimeout<any>(
            client.from('frequencias').select('*').order('data', { ascending: false }).limit(2000),
            2000,
            { data: null, error: { message: 'Timeout' } }
          ),
          withTimeout<any>(
            client.from('lista_espera').select('*').order('created_at', { ascending: false }),
            2000,
            { data: null, error: { message: 'Timeout' } }
          ),
        ]);

        if (turmasRes?.error?.message?.includes('API key') || alunosRes?.error?.message?.includes('API key')) {
          this.supabaseActive = false;
          this.logger.log('Supabase com chave de demonstração. Operando em modo de banco de dados local ultra-rápido.');
          return;
        }

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

        if (listaEsperaRes?.data && Array.isArray(listaEsperaRes.data)) {
          this.memoryDb.lista_espera = listaEsperaRes.data;
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

  // --- TURMAS (CRUD COMPLETO EM MEMÓRIA & PERSISTÊNCIA EM DISCO) ---
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
    return nova;
  }

  async updateTurma(id: string, dto: Partial<Turma>): Promise<Turma | null> {
    const idx = this.memoryDb.turmas.findIndex((t) => t.id === id);
    if (idx === -1) return null;

    const fallback = extractAgeRange(dto.nome || this.memoryDb.turmas[idx].nome);
    this.memoryDb.turmas[idx] = {
      ...this.memoryDb.turmas[idx],
      ...dto,
      capacidade: dto.capacidade != null ? Number(dto.capacidade) : this.memoryDb.turmas[idx].capacidade,
      idade_minima: dto.idade_minima != null ? Number(dto.idade_minima) : fallback.idade_minima,
      idade_maxima: dto.idade_maxima != null ? Number(dto.idade_maxima) : fallback.idade_maxima,
    };

    this.persistToDiskAsync();
    return this.memoryDb.turmas[idx];
  }

  async removeTurma(id: string): Promise<{ success: boolean; message: string }> {
    const temAlunos = this.memoryDb.alunos.some(
      (a) => a.turma_id === id && a.status !== 'Inativo'
    );
    if (temAlunos) {
      return {
        success: false,
        message: 'Não é possível excluir uma turma que possui alunos ativos ou em fila de espera.',
      };
    }

    const idx = this.memoryDb.turmas.findIndex((t) => t.id === id);
    if (idx === -1) {
      return { success: false, message: 'Turma não encontrada.' };
    }

    this.memoryDb.turmas.splice(idx, 1);
    this.persistToDiskAsync();
    return { success: true, message: 'Turma removida com sucesso.' };
  }

  // --- ALUNOS (MAPEAMENTO DIRETO EM MEMÓRIA & RESPOSTA INSTANTÂNEA) ---
  async getAlunos(): Promise<Aluno[]> {
    this.syncWithSupabaseInBackground();

    const mapTurmas = new Map<string, Turma>();
    for (const t of this.memoryDb.turmas) {
      mapTurmas.set(t.id, t);
    }

    // Alunos já matriculados ou registrados em memoryDb.alunos
    const alunosList: Aluno[] = this.memoryDb.alunos.map((a) => ({
      ...a,
      turmas: mapTurmas.get(a.turma_id) || {
        id: a.turma_id,
        nome: 'Turma Geral',
        turno: 'Geral',
        capacidade: 0,
        created_at: a.created_at,
      },
    }));

    const idsAlunos = new Set(alunosList.map((a) => a.id));

    // Incorpora também registros da lista_espera com status 'aguardando' como Fila
    for (const le of this.memoryDb.lista_espera) {
      if (!idsAlunos.has(le.id) && (le.status === 'aguardando' || !le.status)) {
        const alunoNome = le.aluno_nome || le.nome_aluno || 'Aluno';
        const respNome = le.resp_nome || le.nome_responsavel || 'Responsável';
        const respTel = le.resp_telefone || le.telefone_responsavel || '';
        const respEmail = le.resp_email || le.email_responsavel || '';
        const dataNasc = le.aluno_nascimento || le.data_nascimento || '';

        alunosList.push({
          id: le.id,
          turma_id: le.turma_id || '',
          resp_nome: respNome,
          resp_cpf: le.resp_cpf || '',
          resp_rg: le.resp_rg || '',
          resp_parentesco: le.resp_parentesco || '',
          resp_email: respEmail,
          resp_telefone: respTel,
          resp_endereco: le.resp_endereco || '',
          resp_cep: le.resp_cep || '',
          resp_bairro: le.resp_bairro || '',
          aluno_nome: alunoNome,
          aluno_nascimento: dataNasc,
          aluno_sexo: le.aluno_sexo || '',
          aluno_cpf: le.aluno_cpf || '',
          aluno_escola: le.aluno_escola || '',
          aluno_experiencia: le.aluno_experiencia || '',
          aluno_necessidades: le.aluno_necessidades || '',
          status: 'Fila',
          created_at: le.created_at || new Date().toISOString(),
          turmas: mapTurmas.get(le.turma_id) || undefined,
        });
        idsAlunos.add(le.id);
      }
    }

    return alunosList;
  }

  async getAlunoById(id: string): Promise<Aluno | null> {
    const aluno = this.memoryDb.alunos.find((a) => a.id === id);
    if (!aluno) return null;
    const turma = this.memoryDb.turmas.find((t) => t.id === aluno.turma_id);
    return {
      ...aluno,
      turmas: turma,
    };
  }

  async createAluno(dto: any): Promise<Aluno> {
    let selectedTurma = this.memoryDb.turmas.find((t) => t.id === dto.turma_id);
    if (!selectedTurma && this.memoryDb.turmas.length > 0) {
      selectedTurma = this.memoryDb.turmas[0];
    }

    const status = dto.status || 'Fila';
    
    const novo: Aluno = {
      id: randomUUID(),
      turma_id: selectedTurma ? selectedTurma.id : dto.turma_id || randomUUID(),
      resp_nome: dto.resp_nome || 'Responsável',
      resp_cpf: dto.resp_cpf || '',
      resp_rg: dto.resp_rg || '',
      resp_parentesco: dto.resp_parentesco || '',
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

    if (status === 'Fila' || status === 'aguardando') {
      // Adiciona também na lista de espera para consistência completa
      const itemFila: ListaEspera = {
        ...novo,
        status: 'aguardando',
      };
      this.memoryDb.lista_espera = this.memoryDb.lista_espera.filter((item) => item.id !== novo.id);
      this.memoryDb.lista_espera.unshift(itemFila);
    }

    this.memoryDb.alunos.unshift(novo);

    this.persistToDiskAsync();
    return {
      ...novo,
      turmas: selectedTurma,
    };
  }

  // --- LISTA DE ESPERA (TABELA lista_espera) ---
  async getListaEspera(): Promise<ListaEspera[]> {
    this.syncWithSupabaseInBackground();
    const mapTurmas = new Map<string, Turma>();
    for (const t of this.memoryDb.turmas) {
      mapTurmas.set(t.id, t);
    }

    return this.memoryDb.lista_espera.map((item) => ({
      ...item,
      turmas: mapTurmas.get(item.turma_id) || undefined,
    }));
  }

  async createListaEspera(dto: any): Promise<ListaEspera> {
    let selectedTurma = this.memoryDb.turmas.find((t) => t.id === dto.turma_id);
    if (!selectedTurma && this.memoryDb.turmas.length > 0) {
      selectedTurma = this.memoryDb.turmas[0];
    }

    const novoItem: ListaEspera = {
      id: dto.id || randomUUID(),
      turma_id: selectedTurma ? selectedTurma.id : dto.turma_id || randomUUID(),
      resp_nome: dto.resp_nome || dto.nome_responsavel || 'Responsável',
      resp_cpf: dto.resp_cpf || '',
      resp_rg: dto.resp_rg || '',
      resp_parentesco: dto.resp_parentesco || '',
      resp_email: dto.resp_email || dto.email_responsavel || '',
      resp_telefone: dto.resp_telefone || dto.telefone_responsavel || '(53) 99999-0000',
      resp_endereco: dto.resp_endereco || '',
      resp_cep: dto.resp_cep || '',
      resp_bairro: dto.resp_bairro || '',
      aluno_nome: dto.aluno_nome || dto.nome_aluno || 'Aluno',
      aluno_nascimento: dto.aluno_nascimento || dto.data_nascimento || new Date().toISOString().split('T')[0],
      aluno_sexo: dto.aluno_sexo || '',
      aluno_cpf: dto.aluno_cpf || '',
      aluno_escola: dto.aluno_escola || '',
      aluno_experiencia: dto.aluno_experiencia || '',
      aluno_necessidades: dto.aluno_necessidades || '',
      status: 'aguardando',
      created_at: new Date().toISOString(),
    };

    this.memoryDb.lista_espera.unshift(novoItem);

    // Também espelha como aluno em 'Fila' para compatibilidade total imediata com os painéis
    const espelhoAluno: Aluno = {
      ...novoItem,
      status: 'Fila',
    };
    const existIdx = this.memoryDb.alunos.findIndex((a) => a.id === novoItem.id);
    if (existIdx >= 0) {
      this.memoryDb.alunos[existIdx] = espelhoAluno;
    } else {
      this.memoryDb.alunos.unshift(espelhoAluno);
    }

    this.persistToDiskAsync();
    return {
      ...novoItem,
      turmas: selectedTurma,
    };
  }

  async updateAlunoStatus(id: string, novoStatus: string, turma_id: string): Promise<Aluno | null> {
    let aluno: Aluno | undefined = this.memoryDb.alunos.find((a) => a.id === id);

    // Se não encontrou em alunos, pode ter sido registrado inicialmente em lista_espera
    if (!aluno) {
      const itemFila = this.memoryDb.lista_espera.find((l) => l.id === id);
      if (itemFila) {
        const novoAluno: Aluno = {
          ...itemFila,
          status: 'Fila',
        };
        this.memoryDb.alunos.unshift(novoAluno);
        aluno = novoAluno;
      }
    }

    if (!aluno) return null;

    const statusAnterior = aluno.status;
    aluno.status = novoStatus;
    aluno.turma_id = turma_id;

    // Se foi promovido a 'Ativo', atualiza status na lista_espera para 'aprovado'
    const filaItem = this.memoryDb.lista_espera.find((l) => l.id === id);
    if (filaItem) {
      if (novoStatus === 'Ativo') {
        filaItem.status = 'aprovado';
      } else if (novoStatus === 'Inativo') {
        filaItem.status = 'recusado';
      }
    }

    const turma = this.memoryDb.turmas.find((t) => t.id === turma_id);
    if (turma) {
      if (statusAnterior !== 'Inativo' && novoStatus === 'Inativo') {
        turma.capacidade += 1;
      } else if (statusAnterior !== 'Ativo' && novoStatus === 'Ativo' && turma.capacidade > 0) {
        turma.capacidade -= 1;
      }
    }

    this.persistToDiskAsync();
    return {
      ...aluno,
      turmas: turma,
    };
  }

  async removeAluno(id: string): Promise<{ success: boolean; message: string }> {
    const index = this.memoryDb.alunos.findIndex((a) => a.id === id);
    let removido: Aluno | undefined;
    if (index !== -1) {
      [removido] = this.memoryDb.alunos.splice(index, 1);
    }

    // Também remove de lista_espera se constar
    this.memoryDb.lista_espera = this.memoryDb.lista_espera.filter((l) => l.id !== id);

    if (removido && removido.status === 'Ativo' && removido.turma_id) {
      const turma = this.memoryDb.turmas.find((t) => t.id === removido!.turma_id);
      if (turma) {
        turma.capacidade += 1;
      }
    }

    this.memoryDb.frequencias = this.memoryDb.frequencias.filter((f) => f.aluno_id !== id);
    this.persistToDiskAsync();
    return { success: true, message: 'Aluno removido com sucesso do banco de dados.' };
  }

  // --- TURMA COM ALUNOS E ESTATÍSTICAS DE FREQUÊNCIA ---
  async getAlunosPorTurma(turmaId: string) {
    this.syncWithSupabaseInBackground();

    const turma = this.memoryDb.turmas.find((t) => t.id === turmaId);
    const alunosDaTurma = this.memoryDb.alunos.filter((a) => a.turma_id === turmaId);

    const alunosComStats = alunosDaTurma.map((aluno) => {
      const freqs = this.memoryDb.frequencias
        .filter((f) => f.aluno_id === aluno.id)
        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

      const totalAulas = freqs.length;
      const presencas = freqs.filter((f) => f.presente).length;
      const justificadas = freqs.filter(
        (f) => !f.presente && f.justificativa && f.justificativa.includes('JUSTIFICADA')
      ).length;
      const faltas = freqs.filter(
        (f) => !f.presente && (!f.justificativa || !f.justificativa.includes('JUSTIFICADA'))
      ).length;

      let faltasConsecutivas = 0;
      for (const f of freqs) {
        if (!f.presente && (!f.justificativa || !f.justificativa.includes('JUSTIFICADA'))) {
          faltasConsecutivas++;
        } else {
          break;
        }
      }

      const frequenciaPercentual = totalAulas > 0
        ? Math.round(((presencas + justificadas) / totalAulas) * 100)
        : 100;

      const ultimaFalta = freqs.find((f) => !f.presente)?.data;

      return {
        ...aluno,
        turmas: turma,
        stats: {
          totalAulas,
          presencas,
          faltas,
          justificadas,
          frequenciaPercentual,
          faltasConsecutivas,
          ultimaFalta,
        },
      };
    });

    return {
      turma,
      alunos: alunosComStats,
      totalAlunos: alunosDaTurma.length,
      ativos: alunosDaTurma.filter((a) => a.status === 'Ativo').length,
      fila: alunosDaTurma.filter((a) => a.status === 'Fila').length,
    };
  }

  // --- HISTÓRICO INDIVIDUAL DE FALTAS E CHAMADA DO ALUNO ---
  async getAlunoHistorico(alunoId: string) {
    this.syncWithSupabaseInBackground();

    const aluno = this.memoryDb.alunos.find((a) => a.id === alunoId);
    if (!aluno) return null;

    const turma = this.memoryDb.turmas.find((t) => t.id === aluno.turma_id);

    const freqs = this.memoryDb.frequencias
      .filter((f) => f.aluno_id === alunoId)
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    const historico = freqs.map((f) => {
      let status: 'PRESENTE' | 'FALTA' | 'JUSTIFICADA' = 'PRESENTE';
      let observacao = f.justificativa || '';

      if (f.presente) {
        status = 'PRESENTE';
      } else if (f.justificativa && f.justificativa.includes('JUSTIFICADA')) {
        status = 'JUSTIFICADA';
        observacao = f.justificativa.replace('[JUSTIFICADA]', '').trim();
      } else {
        status = 'FALTA';
      }

      return {
        id: f.id,
        data: f.data,
        presente: f.presente,
        status,
        observacao,
        created_at: f.created_at,
      };
    });

    const totalAulas = historico.length;
    const presencas = historico.filter((h) => h.status === 'PRESENTE').length;
    const justificadas = historico.filter((h) => h.status === 'JUSTIFICADA').length;
    const faltas = historico.filter((h) => h.status === 'FALTA').length;
    const frequenciaPercentual = totalAulas > 0
      ? Math.round(((presencas + justificadas) / totalAulas) * 100)
      : 100;

    let faltasConsecutivas = 0;
    for (const h of historico) {
      if (h.status === 'FALTA') {
        faltasConsecutivas++;
      } else {
        break;
      }
    }

    const ultimaFalta = historico.find((h) => h.status === 'FALTA')?.data;

    return {
      aluno: {
        ...aluno,
        turmas: turma,
      },
      stats: {
        totalAulas,
        presencas,
        faltas,
        justificadas,
        frequenciaPercentual,
        faltasConsecutivas,
        ultimaFalta,
      },
      historico,
    };
  }

  // --- JUSTIFICAR FALTA INDIVIDUAL ---
  async justificarFalta(alunoId: string, dataStr: string, observacao: string) {
    const idx = this.memoryDb.frequencias.findIndex(
      (f) => f.aluno_id === alunoId && f.data === dataStr
    );

    const textoJust = observacao ? `[JUSTIFICADA] ${observacao}` : '[JUSTIFICADA]';

    if (idx !== -1) {
      this.memoryDb.frequencias[idx].presente = false;
      this.memoryDb.frequencias[idx].justificativa = textoJust;
    } else {
      this.memoryDb.frequencias.push({
        id: randomUUID(),
        aluno_id: alunoId,
        data: dataStr,
        presente: false,
        justificativa: textoJust,
        created_at: new Date().toISOString(),
      });
    }

    this.persistToDiskAsync();
    return { success: true, message: 'Falta justificada com sucesso.' };
  }

  // --- FREQUÊNCIAS & CHAMADA DIÁRIA ---
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
    }

    this.persistToDiskAsync();
    return { success: true };
  }

  // --- ABSENTEÍSMO / ALERTAS ---
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

  // --- CONSULTA DO RESPONSÁVEL ---
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

  // --- GESTÃO DE ADMINISTRADORES (OFFLINE E ONLINE) ---
  async getAdmins(): Promise<AdminUser[]> {
    if (!this.memoryDb.admins || this.memoryDb.admins.length === 0) {
      this.memoryDb.admins = this.getDefaultAdmins();
      this.persistToDiskAsync();
    }
    return this.memoryDb.admins;
  }

  async createAdmin(dto: { email: string; password?: string; nome?: string }): Promise<AdminUser> {
    const novo: AdminUser = {
      id: randomUUID(),
      email: dto.email.trim().toLowerCase(),
      nome: dto.nome?.trim() || 'Administrador',
      role: 'admin',
      created_at: new Date().toISOString(),
    };

    if (!this.memoryDb.admins) this.memoryDb.admins = this.getDefaultAdmins();
    this.memoryDb.admins.unshift(novo);
    this.persistToDiskAsync();
    return novo;
  }

  async removeAdmin(id: string): Promise<boolean> {
    if (!this.memoryDb.admins) return false;
    const idx = this.memoryDb.admins.findIndex((a) => a.id === id);
    if (idx === -1) return false;
    this.memoryDb.admins.splice(idx, 1);
    this.persistToDiskAsync();
    return true;
  }

  // --- RELATÓRIOS E INDICADORES (COMPLETAMENTE EM MEMÓRIA < 1ms) ---
  async getResumoRelatorios() {
    const alunosAtivos = this.memoryDb.alunos.filter((a) => a.status === 'Ativo');
    const alunosFila = this.memoryDb.alunos.filter((a) => a.status === 'Fila');
    const alunosInativos = this.memoryDb.alunos.filter((a) => a.status === 'Inativo');

    const mapTurmas = new Map<string, Turma>();
    for (const t of this.memoryDb.turmas) {
      mapTurmas.set(t.id, t);
    }

    const turmasStats = this.memoryDb.turmas.map((turma) => {
      const alunosTurma = alunosAtivos.filter((a) => a.turma_id === turma.id);
      const alunoIds = new Set(alunosTurma.map((a) => a.id));

      const freqsTurma = this.memoryDb.frequencias.filter((f) => alunoIds.has(f.aluno_id));
      const totalRegistros = freqsTurma.length;
      const presencas = freqsTurma.filter((f) => f.presente).length;
      const justificadas = freqsTurma.filter(
        (f) => !f.presente && f.justificativa && f.justificativa.includes('JUSTIFICADA')
      ).length;
      const faltas = freqsTurma.filter(
        (f) => !f.presente && (!f.justificativa || !f.justificativa.includes('JUSTIFICADA'))
      ).length;

      const frequenciaPercentual = totalRegistros > 0
        ? Math.round(((presencas + justificadas) / totalRegistros) * 100)
        : 100;

      return {
        turma_id: turma.id,
        nome: turma.nome,
        turno: turma.turno,
        capacidade: turma.capacidade,
        totalAlunos: alunosTurma.length,
        totalRegistros,
        presencas,
        faltas,
        justificadas,
        frequenciaPercentual,
      };
    });

    const totalRegistros = turmasStats.reduce((soma, t) => soma + t.totalRegistros, 0);
    const totalPresencas = turmasStats.reduce((soma, t) => soma + t.presencas, 0);
    const totalFaltas = turmasStats.reduce((soma, t) => soma + t.faltas, 0);
    const totalJustificadas = turmasStats.reduce((soma, t) => soma + t.justificadas, 0);

    return {
      geradoEm: new Date().toISOString(),
      totais: {
        alunosAtivos: alunosAtivos.length,
        alunosFila: alunosFila.length,
        alunosInativos: alunosInativos.length,
        turmas: turmasStats.length,
        totalRegistros,
        presencas: totalPresencas,
        faltas: totalFaltas,
        justificadas: totalJustificadas,
        frequenciaPercentual: totalRegistros > 0
          ? Math.round(((totalPresencas + totalJustificadas) / totalRegistros) * 100)
          : 100,
      },
      turmas: turmasStats,
    };
  }

  // --- MURAL DE OBRAS & PRODUÇÕES ARTÍSTICAS ---
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
