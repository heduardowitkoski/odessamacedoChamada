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

    // 1. Buscar alunos ativos da turma
    const { data: alunos, error: alunosError } = await supabase
      .from('alunos')
      .select('*')
      .eq('turma_id', turma_id)
      .ilike('status', 'ativo')
      .order('aluno_nome', { ascending: true });

    if (alunosError) {
      throw new InternalServerErrorException("Erro ao buscar alunos: " + alunosError.message);
    }

    // 2. Buscar registros de frequencia já efetuados nesta data para esta turma
    const { data: frequencias, error: freqError } = await supabase
      .from('frequencias')
      .select('*')
      .eq('turma_id', turma_id)
      .eq('data', dataStr);

    if (freqError) {
      throw new InternalServerErrorException("Erro ao buscar frequências: " + freqError.message);
    }

    const mapFreq = new Map<string, any>();
    if (frequencias) {
      frequencias.forEach((f: any) => mapFreq.set(f.aluno_id, f));
    }

    // Combine alunos com seus registros de frequencia
    return (alunos || []).map((aluno: any) => {
      const registro = mapFreq.get(aluno.id);
      return {
        ...aluno,
        frequencia: registro
          ? { status: registro.status, observacao: registro.observacao, id: registro.id }
          : { status: 'PRESENTE', observacao: '' }, // default para facilidade na chamada
      };
    });
  }

  async salvarLote(turma_id: string, dataStr: string, registros: RegistroFrequenciaDto[]) {
    if (!turma_id || !dataStr || !Array.isArray(registros)) {
      throw new BadRequestException("Parâmetros inválidos para lançamento de chamada.");
    }

    const supabase = this.supabaseService.getClient();

    const payload = registros.map((r) => ({
      aluno_id: r.aluno_id,
      turma_id,
      data: dataStr,
      status: r.status,
      observacao: r.observacao || null,
    }));

    // Upsert na tabela frequencias usando a constraint única (aluno_id, data)
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
      .ilike('status', 'ativo');

    if (alunosError) {
      throw new InternalServerErrorException("Erro ao buscar alunos para alertas: " + alunosError.message);
    }

    const alertas = [];

    for (const aluno of alunos || []) {
      // Buscar histórico de chamadas recentes do aluno
      const { data: freqs, error: freqError } = await supabase
        .from('frequencias')
        .select('*')
        .eq('aluno_id', aluno.id)
        .order('data', { ascending: false })
        .limit(10);

      if (freqError || !freqs) continue;

      let faltasConsecutivas = 0;
      for (const freq of freqs) {
        if (freq.status === 'FALTA') {
          faltasConsecutivas++;
        } else {
          // Interrompe a contagem se encontrar presença ou falta justificada
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
