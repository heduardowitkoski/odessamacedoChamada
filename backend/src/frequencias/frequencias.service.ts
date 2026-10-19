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
    // 1. Resposta Instantânea da RAM via DatabaseService (< 1ms)
    if (this.databaseService) {
      return this.databaseService.getFrequencias(turma_id, dataStr);
    }

    // Fallback direto ao Supabase
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

    if (!alunos || alunos.length === 0) {
      return [];
    }

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

  async salvarLote(turma_id: string, dataStr: string, registros: RegistroFrequenciaDto[]) {
    if (!turma_id || !dataStr || !Array.isArray(registros)) {
      throw new BadRequestException('Parâmetros inválidos para lançamento de chamada.');
    }

    // 1. Resposta Instantânea via DatabaseService (< 1ms)
    if (this.databaseService) {
      return this.databaseService.saveFrequencias(turma_id, dataStr, registros);
    }

    // Fallback direto ao Supabase
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
    // 1. Resposta Instantânea da RAM via DatabaseService (< 1ms)
    // Sem gargalo N+1 e mantendo matrícula Ativa
    if (this.databaseService) {
      return this.databaseService.getAlertasFaltas();
    }

    // Fallback otimizado com busca em lote (Batch query)
    const supabase = this.supabaseService.getClient();

    const { data: alunos, error: alunosError } = await supabase
      .from('alunos')
      .select('*, turmas(*)')
      .neq('status', 'Inativo');

    if (alunosError) {
      throw new InternalServerErrorException('Erro ao buscar alunos para alertas: ' + alunosError.message);
    }

    if (!alunos || alunos.length === 0) return [];

    const alunoIds = alunos.map((a: any) => a.id);
    const { data: freqs, error: freqError } = await supabase
      .from('frequencias')
      .select('*')
      .in('aluno_id', alunoIds)
      .order('data', { ascending: false });

    if (freqError) {
      throw new InternalServerErrorException('Erro ao buscar frequências para alertas: ' + freqError.message);
    }

    const freqsMap = new Map<string, any[]>();
    for (const f of freqs || []) {
      const list = freqsMap.get(f.aluno_id) || [];
      if (list.length < 10) list.push(f);
      freqsMap.set(f.aluno_id, list);
    }

    const alertas = [];
    for (const aluno of alunos) {
      const studentFreqs = freqsMap.get(aluno.id) || [];
      let faltasConsecutivas = 0;
      for (const freq of studentFreqs) {
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
          ultimaFalta: studentFreqs[0]?.data,
        });
      }
    }

    return alertas;
  }

  async buscarMinhasFaltasPorEmail(email: string) {
    if (!email) {
      throw new BadRequestException('E-mail do responsável é obrigatório.');
    }

    // 1. Resposta Instantânea da RAM via DatabaseService (< 1ms)
    if (this.databaseService) {
      return this.databaseService.getMinhasFaltasPorEmail(email);
    }

    // Fallback com batch query
    const cleanEmail = email.trim().toLowerCase();
    const supabase = this.supabaseService.getClient();

    const { data: alunos, error: alunosError } = await supabase
      .from('alunos')
      .select('*, turmas(*)')
      .ilike('resp_email', cleanEmail)
      .neq('status', 'Inativo')
      .order('aluno_nome', { ascending: true });

    if (alunosError) {
      throw new InternalServerErrorException('Erro ao buscar alunos: ' + alunosError.message);
    }

    if (!alunos || alunos.length === 0) {
      return { alunos: [] };
    }

    const alunoIds = alunos.map((a: any) => a.id);
    const { data: freqs, error: freqsError } = await supabase
      .from('frequencias')
      .select('*')
      .in('aluno_id', alunoIds)
      .order('data', { ascending: false });

    if (freqsError) {
      throw new InternalServerErrorException('Erro ao buscar frequências: ' + freqsError.message);
    }

    const freqsMap = new Map<string, any[]>();
    for (const f of freqs || []) {
      const list = freqsMap.get(f.aluno_id) || [];
      list.push(f);
      freqsMap.set(f.aluno_id, list);
    }

    const resultadoAlunos = [];

    for (const aluno of alunos) {
      const studentFreqs = freqsMap.get(aluno.id) || [];
      const historico = studentFreqs.map((f: any) => {
        let status: 'PRESENTE' | 'FALTA' | 'JUSTIFICADA' = 'PRESENTE';
        let justificativa = f.justificativa || '';

        if (f.presente) {
          status = 'PRESENTE';
        } else if (justificativa && justificativa.startsWith('[JUSTIFICADA]')) {
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

      resultadoAlunos.push({
        id: aluno.id,
        aluno_nome: aluno.aluno_nome,
        resp_nome: aluno.resp_nome,
        resp_email: aluno.resp_email,
        resp_telefone: aluno.resp_telefone,
        turma: aluno.turmas,
        status: aluno.status,
        stats: {
          totalAulas,
          presencas,
          faltas,
          justificadas,
          frequenciaPercentual,
        },
        historico,
      });
    }

    return { alunos: resultadoAlunos };
  }

  async exportarCSV(turmaId?: string, dataInicio?: string, dataFim?: string): Promise<string> {
    const supabase = this.supabaseService.getClient();

    // Busca alunos (filtrado por turma se fornecido)
    let alunosQuery = supabase
      .from('alunos')
      .select('*, turmas(*)')
      .neq('status', 'Inativo')
      .order('aluno_nome', { ascending: true });

    if (turmaId) {
      alunosQuery = alunosQuery.eq('turma_id', turmaId);
    }

    const { data: alunos, error: alunosError } = await alunosQuery;
    if (alunosError) throw new InternalServerErrorException(alunosError.message);

    const linhas: string[] = [];
    linhas.push('Aluno;Turma;Turno;Status Matrícula;Total Aulas;Presenças;Faltas;Faltas Justificadas;% Frequência');

    for (const aluno of alunos || []) {
      let freqQuery = supabase
        .from('frequencias')
        .select('*')
        .eq('aluno_id', aluno.id)
        .order('data', { ascending: true });

      if (dataInicio) freqQuery = freqQuery.gte('data', dataInicio);
      if (dataFim) freqQuery = freqQuery.lte('data', dataFim);

      const { data: freqs } = await freqQuery;
      const historico = freqs || [];
      const totalAulas = historico.length;
      const presencas = historico.filter((f: any) => f.presente).length;
      const justificadas = historico.filter(
        (f: any) => !f.presente && f.justificativa?.startsWith('[JUSTIFICADA]'),
      ).length;
      const faltas = totalAulas - presencas - justificadas;
      const pct = totalAulas > 0 ? Math.round(((presencas + justificadas) / totalAulas) * 100) : 100;

      linhas.push(
        [
          aluno.aluno_nome,
          aluno.turmas?.nome || '',
          aluno.turmas?.turno || '',
          aluno.status,
          totalAulas,
          presencas,
          faltas,
          justificadas,
          `${pct}%`,
        ].join(';'),
      );
    }

    return linhas.join('\n');
  }

  async enviarEmailAlertaFaltas(alunoId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = this.supabaseService.getClient();

    const { data: aluno } = await supabase
      .from('alunos')
      .select('*, turmas(*)')
      .eq('id', alunoId)
      .single();

    if (!aluno || !aluno.resp_email) {
      throw new BadRequestException('Aluno não encontrado ou sem e-mail de responsável.');
    }

    // Calcula faltas consecutivas
    const { data: freqs } = await supabase
      .from('frequencias')
      .select('*')
      .eq('aluno_id', alunoId)
      .order('data', { ascending: false })
      .limit(10);

    let faltasConsecutivas = 0;
    let ultimaFalta = '';
    for (const freq of freqs || []) {
      if (freq.presente === false && (!freq.justificativa || !freq.justificativa.startsWith('[JUSTIFICADA]'))) {
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
