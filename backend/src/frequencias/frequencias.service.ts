import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface RegistroFrequenciaDto {
  aluno_id: string;
  status: 'PRESENTE' | 'FALTA' | 'JUSTIFICADA';
  observacao?: string;
}

@Injectable()
export class FrequenciasService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async buscarPorTurmaEData(turma_id: string, dataStr: string) {
    const supabase = this.supabaseService.getClient();

    // 1. Buscar alunos inscritos/ativos da turma (não inativos)
    const { data: alunos, error: alunosError } = await supabase
      .from('alunos')
      .select('*')
      .eq('turma_id', turma_id)
      .neq('status', 'Inativo')
      .order('aluno_nome', { ascending: true });

    if (alunosError) {
      throw new InternalServerErrorException("Erro ao buscar alunos: " + alunosError.message);
    }

    if (!alunos || alunos.length === 0) {
      return [];
    }

    // 2. Buscar registros de frequencia já efetuados nesta data para os alunos da turma
    const alunoIds = alunos.map((a: any) => a.id);
    const { data: frequencias, error: freqError } = await supabase
      .from('frequencias')
      .select('*')
      .in('aluno_id', alunoIds)
      .eq('data', dataStr);

    if (freqError) {
      throw new InternalServerErrorException("Erro ao buscar frequências: " + freqError.message);
    }

    const mapFreq = new Map<string, any>();
    if (frequencias) {
      frequencias.forEach((f: any) => mapFreq.set(f.aluno_id, f));
    }

    // Combine alunos com seus registros de frequencia
    return alunos.map((aluno: any) => {
      const registro = mapFreq.get(aluno.id);
      let status: 'PRESENTE' | 'FALTA' | 'JUSTIFICADA' = 'PRESENTE';
      let observacao = '';

      if (registro) {
        if (registro.presente) {
          status = 'PRESENTE';
          observacao = registro.justificativa || '';
        } else {
          if (registro.justificativa && registro.justificativa.startsWith('[JUSTIFICADA]')) {
            status = 'JUSTIFICADA';
            observacao = registro.justificativa.replace('[JUSTIFICADA] ', '').replace('[JUSTIFICADA]', '');
          } else {
            status = 'FALTA';
            observacao = registro.justificativa || '';
          }
        }
      }

      return {
        ...aluno,
        aluno_nome: aluno.aluno_nome || aluno.resp_nome || 'Aluno sem nome',
        frequencia: {
          status,
          observacao,
          id: registro?.id
        }
      };
    });
  }

  async salvarLote(turma_id: string, dataStr: string, registros: RegistroFrequenciaDto[]) {
    if (!turma_id || !dataStr || !Array.isArray(registros)) {
      throw new BadRequestException("Parâmetros inválidos para lançamento de chamada.");
    }

    const supabase = this.supabaseService.getClient();

    const payload = registros.map((r) => {
      const presente = r.status === 'PRESENTE';
      let justificativa = r.observacao || null;
      if (r.status === 'JUSTIFICADA') {
        justificativa = `[JUSTIFICADA] ${r.observacao || ''}`.trim();
      }

      return {
        aluno_id: r.aluno_id,
        data: dataStr,
        presente,
        justificativa,
      };
    });

    const { data, error } = await supabase
      .from('frequencias')
      .upsert(payload, { onConflict: 'aluno_id,data' })
      .select();

    if (error) {
      throw new InternalServerErrorException("Erro ao salvar chamadas: " + error.message);
    }

    return data;
  }

  async buscarAlertasFaltas() {
    const supabase = this.supabaseService.getClient();

    // Buscar alunos ativos
    const { data: alunos, error: alunosError } = await supabase
      .from('alunos')
      .select('*, turmas(*)')
      .neq('status', 'Inativo');

    if (alunosError) {
      throw new InternalServerErrorException("Erro ao buscar alunos para alertas: " + alunosError.message);
    }

    const alertas = [];

    for (const aluno of alunos || []) {
      const { data: freqs, error: freqError } = await supabase
        .from('frequencias')
        .select('*')
        .eq('aluno_id', aluno.id)
        .order('data', { ascending: false })
        .limit(10);

      if (freqError || !freqs) continue;

      let faltasConsecutivas = 0;
      for (const freq of freqs) {
        if (freq.presente === false && (!freq.justificativa || !freq.justificativa.startsWith('[JUSTIFICADA]'))) {
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
