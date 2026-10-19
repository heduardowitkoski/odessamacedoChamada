import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { RelatoriosService } from './relatorios.service';

@Controller('relatorios')
export class RelatoriosController {
  constructor(private readonly relatoriosService: RelatoriosService) {}

  @Get('resumo')
  async resumo() {
    return this.relatoriosService.resumo();
  }

  @Get('fila-espera/csv')
  async filaEsperaCSV(@Res() res: Response) {
    const csv = await this.relatoriosService.exportarFilaEsperaCSV();
    this.enviarCSV(res, csv, 'fila_espera');
  }

  @Get('fila-espera/pdf')
  async filaEsperaPDF(@Res() res: Response) {
    const pdf = await this.relatoriosService.gerarPDFFilaEspera();
    this.enviarPDF(res, pdf, 'fila_espera');
  }

  @Get('frequencias/csv')
  async frequenciasCSV(
    @Query('turma_id') turmaId: string,
    @Query('data_inicio') dataInicio: string,
    @Query('data_fim') dataFim: string,
    @Res() res: Response,
  ) {
    const csv = await this.relatoriosService.exportarFrequenciaCSV({
      turmaId,
      dataInicio,
      dataFim,
    });
    this.enviarCSV(res, csv, 'frequencias');
  }

  @Get('frequencias/pdf')
  async frequenciasPDF(
    @Query('turma_id') turmaId: string,
    @Query('data_inicio') dataInicio: string,
    @Query('data_fim') dataFim: string,
    @Res() res: Response,
  ) {
    const pdf = await this.relatoriosService.gerarPDFFrequencia({
      turmaId,
      dataInicio,
      dataFim,
    });
    this.enviarPDF(res, pdf, 'frequencias');
  }

  private enviarCSV(res: Response, csv: string, prefixo: string) {
    const data = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${prefixo}_${data}.csv"`,
    );
    res.send('\uFEFF' + csv);
  }

  private enviarPDF(res: Response, pdf: Buffer, prefixo: string) {
    const data = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${prefixo}_${data}.pdf"`,
    );
    res.setHeader('Content-Length', pdf.length);
    res.send(pdf);
  }
}
