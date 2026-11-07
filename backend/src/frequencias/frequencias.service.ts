import { Injectable, InternalServerErrorException, BadRequestException, Optional } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { EmailService } from '../email/email.service';
import { DatabaseService } from '../database/database.service';

export interface RegistroFrequenciaDto {
  aluno_id: string;
  status: 'PRESENTE' | 'FALTA' | 'JUSTIFICADA';
  observacao?: string;
}

@Injectable()
export class FrequenciasService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly emailService: EmailService,
    @Optional() private readonly databaseService?: DatabaseService,
  ) {}

  async buscarPorTurmaEData(turma_id: string, dataStr: string) {
    if (this.databaseService) {
      return this.databaseService.getFrequencias(turma_id, dataStr);
    }

    const supabase = this.supabaseService.getClient();
    const { data: alunos, error: alunosError } = await supabase
      .from('alunos')
      .select('*')
      .eq('turma_id', turma_id)
      .neq('status', 'Inativo')
      .order('aluno_nome', { ascending: true });

    if (alunosError) {
      throw new InternalServerErrorException('Erro ao buscar alunos: ' + alunosError.message);
    }
    if (!alunos || alunos.length === 0) return [];

    const alunoIds = alunos.map((a: any) => a.id);
    const { data: frequencias, error: freqError } = await supabase
      .from('frequencias')
      .select('*')
      .in('aluno_id', alunoIds)
      .eq('data', dataStr);

    if (freqError) {
      throw new InternalServerErrorException('Erro ao buscar frequências: ' + freqError.message);
    }

    const mapFreq = new Map<string, any>();
    if (frequencias) {
      frequencias.forEach((f: any) => mapFreq.set(f.aluno_id, f));
    }

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
          id: registro?.id,
        },
      };
    });
  }

  async buscarAlunosPorTurmaComStats(turmaId: string) {
    if (this.databaseService) {
      return this.databaseService.getAlunosPorTurma(turmaId);
    }
    return { turma: null, alunos: [], totalAlunos: 0, ativos: 0, fila: 0 };
  }

  async buscarHistoricoAluno(alunoId: string) {
    if (this.databaseService) {
      return this.databaseService.getAlunoHistorico(alunoId);
    }
    return null;
  }

  async justificarFalta(alunoId: string, dataStr: string, observacao: string) {
    if (this.databaseService) {
      return this.databaseService.justificarFalta(alunoId, dataStr, observacao);
    }
    return { success: false, message: 'Serviço não disponível' };
  }

  async salvarLote(turma_id: string, dataStr: string, registros: RegistroFrequenciaDto[]) {
    if (!turma_id || !dataStr || !Array.isArray(registros)) {
      throw new BadRequestException('Parâmetros inválidos para lançamento de chamada.');
    }

    if (this.databaseService) {
      const res = await this.databaseService.saveFrequencias(turma_id, dataStr, registros);
      const turma = await this.databaseService.getTurmaById(turma_id);
      const presentesCount = registros.filter((r) => r.status === 'PRESENTE').length;
      const faltasCount = registros.filter((r) => r.status === 'FALTA').length;
      const justificadasCount = registros.filter((r) => r.status === 'JUSTIFICADA').length;
      await this.databaseService.addLog({
        acao: 'Lançamento de Chamada',
        categoria: 'frequencia',
        detalhes: `Chamada registrada para a turma "${turma?.nome || turma_id}" na data ${dataStr}. Presentes: ${presentesCount}, Faltas: ${faltasCount}, Justificadas: ${justificadasCount}. Total de alunos: ${registros.length}.`,
      });
      return res;
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
      throw new InternalServerErrorException('Erro ao salvar chamadas: ' + error.message);
    }

    return data;
  }

  async buscarAlertasFaltas() {
    if (this.databaseService) {
      return this.databaseService.getAlertasFaltas();
    }
    return [];
  }

  async buscarMinhasFaltasPorEmail(email: string) {
    if (!email) {
      throw new BadRequestException('E-mail do responsável é obrigatório.');
    }

    if (this.databaseService) {
      return this.databaseService.getMinhasFaltasPorEmail(email);
    }
    return { alunos: [] };
  }

  async exportarCSV(turmaId?: string, dataInicio?: string, dataFim?: string): Promise<string> {
    if (this.databaseService) {
      const alunos = await this.databaseService.getAlunos();
      const turmas = await this.databaseService.getTurmas();
      const mapTurmas = new Map<string, any>();
      for (const t of turmas) mapTurmas.set(t.id, t);

      const alunosFiltrados = turmaId ? alunos.filter((a) => a.turma_id === turmaId) : alunos;

      const linhas: string[] = [];
      linhas.push('Aluno;Turma;Turno;Status Matrícula;Total Aulas;Presenças;Faltas;Faltas Justificadas;% Frequência');

      for (const aluno of alunosFiltrados) {
        const hist = await this.databaseService.getAlunoHistorico(aluno.id);
        const stats = hist?.stats || { totalAulas: 0, presencas: 0, faltas: 0, justificadas: 0, frequenciaPercentual: 100 };
        const turma = mapTurmas.get(aluno.turma_id);

        linhas.push([
          `"${aluno.aluno_nome || 'Aluno'}"`,
          `"${turma?.nome || 'Sem Turma'}"`,
          `"${turma?.turno || ''}"`,
          `"${aluno.status}"`,
          stats.totalAulas,
          stats.presencas,
          stats.faltas,
          stats.justificadas,
          `"${stats.frequenciaPercentual}%"`,
        ].join(';'));
      }

      return linhas.join('\n');
    }

    return 'Aluno;Turma;Turno;Status Matrícula;Total Aulas;Presenças;Faltas;Faltas Justificadas;% Frequência';
  }

  async enviarEmailAlertaFaltas(alunoId: string): Promise<{ success: boolean; error?: string }> {
    let aluno: any = null;
    let studentFreqs: any[] = [];

    if (this.databaseService) {
      const hist = await this.databaseService.getAlunoHistorico(alunoId);
      if (hist) {
        aluno = hist.aluno;
        studentFreqs = hist.historico;
      }
    }

    if (!aluno) {
      throw new BadRequestException('Aluno não encontrado para envio de alerta.');
    }

    if (!aluno.resp_email) {
      throw new BadRequestException('Aluno não possui e-mail de responsável cadastrado.');
    }

    let faltasConsecutivas = 0;
    let ultimaFalta = '';
    for (const freq of studentFreqs) {
      if (freq.status === 'FALTA') {
        faltasConsecutivas++;
        if (!ultimaFalta) ultimaFalta = freq.data;
      } else {
        break;
      }
    }

    return this.emailService.enviarEmailAlertaFaltas({
      resp_nome: aluno.resp_nome,
      resp_email: aluno.resp_email.trim().toLowerCase(),
      aluno_nome: aluno.aluno_nome,
      turma_nome: aluno.turmas?.nome || 'Turma não identificada',
      turma_turno: aluno.turmas?.turno || '',
      faltas_consecutivas: faltasConsecutivas,
      ultima_falta: ultimaFalta,
    });
  }
}
