import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

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
  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll() {
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
      // Caso as colunas ainda não existam no Supabase do usuário, tenta inserir sem as novas colunas
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
}
