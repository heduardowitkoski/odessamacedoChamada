import { Controller, Get, Post, Body, Query, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { FrequenciasService, RegistroFrequenciaDto } from './frequencias.service';

@Controller('frequencias')
export class FrequenciasController {
  constructor(private readonly frequenciasService: FrequenciasService) {}

  @Get('turma/:turmaId')
  async getByTurmaEData(
    @Param('turmaId') turmaId: string,
    @Query('data') data: string,
  ) {
    const dataStr = data || new Date().toISOString().split('T')[0];
    return this.frequenciasService.buscarPorTurmaEData(turmaId, dataStr);
  }

  @Get('turma/:turmaId/alunos-resumo')
  async getAlunosPorTurmaComStats(@Param('turmaId') turmaId: string) {
    return this.frequenciasService.buscarAlunosPorTurmaComStats(turmaId);
  }

  @Get('aluno/:alunoId')
  async getHistoricoAluno(@Param('alunoId') alunoId: string) {
    return this.frequenciasService.buscarHistoricoAluno(alunoId);
  }

  @Post('justificar')
  async justificarFalta(
    @Body('aluno_id') alunoId: string,
    @Body('data') dataStr: string,
    @Body('observacao') observacao: string,
  ) {
    return this.frequenciasService.justificarFalta(alunoId, dataStr, observacao);
  }

  @Post('batch')
  async salvarLote(
    @Body('turma_id') turmaId: string,
    @Body('data') data: string,
    @Body('registros') registros: RegistroFrequenciaDto[],
  ) {
    return this.frequenciasService.salvarLote(turmaId, data, registros);
  }

  @Get('alertas')
  async getAlertas() {
    return this.frequenciasService.buscarAlertasFaltas();
  }

  @Get('minhas-faltas')
  async getMinhasFaltas(@Query('email') email: string) {
    return this.frequenciasService.buscarMinhasFaltasPorEmail(email);
  }

  @Get('exportar')
  async exportarCSV(
    @Query('turma_id') turmaId: string,
    @Query('data_inicio') dataInicio: string,
    @Query('data_fim') dataFim: string,
    @Res() res: Response,
  ) {
    const csv = await this.frequenciasService.exportarCSV(turmaId, dataInicio, dataFim);
    const filename = `frequencias_${turmaId || 'todas'}_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv); // BOM para Excel reconhecer UTF-8
  }

  @Post('alertas/enviar-email')
  async enviarEmailAlerta(@Body('aluno_id') alunoId: string) {
    return this.frequenciasService.enviarEmailAlertaFaltas(alunoId);
  }
}
