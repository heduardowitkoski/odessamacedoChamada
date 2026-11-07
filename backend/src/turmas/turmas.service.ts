import { Injectable, InternalServerErrorException, BadRequestException, Optional } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { DatabaseService } from '../database/database.service';

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

@Injectable()
export class TurmasService {
  constructor(
    private readonly supabaseService: SupabaseService,
    @Optional() private readonly databaseService?: DatabaseService,
  ) {}

  async findAll() {
    if (this.databaseService) {
      return this.databaseService.getTurmas();
    }

    const { data, error } = await this.supabaseService
      .getClient()
      .from('turmas')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return (data || []).map((t: any) => {
      const fallback = extractAgeRange(t.nome || '');
      return {
        ...t,
        idade_minima: t.idade_minima != null ? Number(t.idade_minima) : fallback.idade_minima,
        idade_maxima: t.idade_maxima != null ? Number(t.idade_maxima) : fallback.idade_maxima,
      };
    });
  }

  async create(createTurmaDto: {
    nome: string;
    turno: string;
    capacidade: number;
    idade_minima?: number;
    idade_maxima?: number;
  }) {
    if (this.databaseService) {
      const created = await this.databaseService.createTurma(createTurmaDto);
      await this.databaseService.addLog({
        acao: 'Criação de Turma',
        categoria: 'turma',
        detalhes: `Turma "${created.nome}" (Turno: ${created.turno}, Capacidade: ${created.capacidade}) foi criada.`,
      });
      return created;
    }

    const fallback = extractAgeRange(createTurmaDto.nome || '');
    const payload = {
      ...createTurmaDto,
      idade_minima: createTurmaDto.idade_minima != null ? Number(createTurmaDto.idade_minima) : fallback.idade_minima,
      idade_maxima: createTurmaDto.idade_maxima != null ? Number(createTurmaDto.idade_maxima) : fallback.idade_maxima,
    };

    const { data, error } = await this.supabaseService
      .getClient()
      .from('turmas')
      .insert([payload])
      .select();

    if (error) {
      if (error.message?.includes('idade_minima') || error.message?.includes('idade_maxima')) {
        const { idade_minima, idade_maxima, ...fallbackPayload } = payload;
        const retry = await this.supabaseService
          .getClient()
          .from('turmas')
          .insert([fallbackPayload])
          .select();
        if (retry.error) {
          throw new InternalServerErrorException(retry.error.message);
        }
        return retry.data;
      }
      throw new InternalServerErrorException(error.message);
    }
    return data;
  }

  async update(
    id: string,
    dto: { nome?: string; turno?: string; capacidade?: number; idade_minima?: number; idade_maxima?: number },
  ) {
    if (this.databaseService) {
      const atualizada = await this.databaseService.updateTurma(id, dto);
      if (!atualizada) {
        throw new BadRequestException('Turma não encontrada para atualização.');
      }
      await this.databaseService.addLog({
        acao: 'Alteração de Dados da Turma',
        categoria: 'turma',
        detalhes: `Turma "${atualizada.nome}" foi modificada: ${Object.entries(dto).map(([k, v]) => `${k}=${v}`).join(', ')}.`,
      });
      return atualizada;
    }

    const { data, error } = await this.supabaseService
      .getClient()
      .from('turmas')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
    return data;
  }

  async remove(id: string) {
    if (this.databaseService) {
      const turma = await this.databaseService.getTurmaById(id);
      const res = await this.databaseService.removeTurma(id);
      if (!res.success) {
        throw new BadRequestException(res.message);
      }
      await this.databaseService.addLog({
        acao: 'Exclusão de Turma',
        categoria: 'turma',
        detalhes: `Turma "${turma?.nome || id}" foi excluída do sistema.`,
      });
      return res;
    }

    const supabase = this.supabaseService.getClient();

    const { data: alunos } = await supabase
      .from('alunos')
      .select('id')
      .eq('turma_id', id)
      .neq('status', 'Inativo')
      .limit(1);

    if (alunos && alunos.length > 0) {
      throw new BadRequestException(
        'Não é possível excluir uma turma com alunos ativos ou na fila de espera. Inative ou transfira os alunos antes.',
      );
    }

    const { error } = await supabase.from('turmas').delete().eq('id', id);

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
    return { success: true, message: 'Turma removida com sucesso.' };
  }

  async exportarTurmasCSV(): Promise<string> {
    const supabase = this.supabaseService.getClient();
    const turmas = await this.findAll();

    const { data: alunos } = await supabase
      .from('alunos')
      .select('id, turma_id, status');

    const alunosList = alunos || [];

    const headers = [
      'Turma',
      'Turno',
      'Faixa Etária',
      'Capacidade Vagas',
      'Alunos Matriculados (Ativos)',
      'Alunos na Fila de Espera',
      'Situação',
    ];

    const escape = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const linhas: string[] = [headers.map(escape).join(';')];

    for (const t of turmas) {
      const ativos = alunosList.filter((a) => a.turma_id === t.id && a.status === 'Ativo').length;
      const fila = alunosList.filter((a) => a.turma_id === t.id && a.status === 'Fila').length;
      const faixa = `${t.idade_minima ?? 0} a ${t.idade_maxima ?? 120} anos`;
      const situacao = t.capacidade > 0 ? `Há ${t.capacidade} vagas` : 'Turma cheia';

      linhas.push(
        [
          t.nome,
          t.turno,
          faixa,
          t.capacidade,
          ativos,
          fila,
          situacao,
        ].map(escape).join(';')
      );
    }

    return linhas.join('\n');
  }
}

