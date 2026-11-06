import { Injectable, InternalServerErrorException, Optional } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { SupabaseService } from '../supabase/supabase.service';
import { DatabaseService } from '../database/database.service';

interface ColunaRelatorio {
  titulo: string;
  largura: number;
  alinhamento?: 'left' | 'right' | 'center';
}

interface FiltroFrequencia {
  turmaId?: string;
  dataInicio?: string;
  dataFim?: string;
}

interface LinhaFrequencia {
  aluno_nome: string;
  turma_nome: string;
  turno: string;
  status: string;
  totalAulas: number;
  presencas: number;
  faltas: number;
  justificadas: number;
  percentual: number;
}

function escaparCSV(valor: unknown): string {
  const texto = valor === null || valor === undefined ? '' : String(valor);
  return `"${texto.replace(/"/g, '""')}"`;
}

function formatarData(valor?: string | null): string {
  if (!valor) return '';
  const data = new Date(`${valor}T12:00:00`);
  if (Number.isNaN(data.getTime())) return String(valor);
  return data.toLocaleDateString('pt-BR');
}

@Injectable()
export class RelatoriosService {
  constructor(
    private readonly supabaseService: SupabaseService,
    @Optional() private readonly databaseService?: DatabaseService,
  ) {}

  async resumo() {
    if (this.databaseService) {
      return this.databaseService.getResumoRelatorios();
    }

    try {
      const supabase = this.supabaseService.getClient();
      const [
        { data: alunos, error: alunosError },
        { data: frequencias, error: freqError },
      ] = await Promise.all([
        supabase.from('alunos').select('*, turmas(*)'),
        supabase.from('frequencias').select('aluno_id, presente, justificativa'),
      ]);

      if (alunosError) throw new Error(alunosError.message);
      if (freqError) throw new Error(freqError.message);

      const listaAlunos = alunos || [];
      const listaFrequencias = frequencias || [];

      const alunosAtivos = listaAlunos.filter((a: any) => a.status === 'Ativo');
      const alunosFila = listaAlunos.filter((a: any) => a.status === 'Fila');
      const alunosInativos = listaAlunos.filter((a: any) => a.status === 'Inativo');

      return {
        geradoEm: new Date().toISOString(),
        totais: {
          alunosAtivos: alunosAtivos.length,
          alunosFila: alunosFila.length,
          alunosInativos: alunosInativos.length,
          turmas: 0,
          totalRegistros: listaFrequencias.length,
          presencas: listaFrequencias.filter((f) => f.presente).length,
          faltas: listaFrequencias.filter((f) => !f.presente).length,
          justificadas: 0,
          frequenciaPercentual: 100,
        },
        turmas: [],
      };
    } catch {
      return {
        geradoEm: new Date().toISOString(),
        totais: {
          alunosAtivos: 0,
          alunosFila: 0,
          alunosInativos: 0,
          turmas: 0,
          totalRegistros: 0,
          presencas: 0,
          faltas: 0,
          justificadas: 0,
          frequenciaPercentual: 100,
        },
        turmas: [],
      };
    }
  }

  async exportarFilaEsperaCSV(): Promise<string> {
    const fila = await this.buscarFilaEspera();

    const linhas: string[] = [];
    linhas.push(
      [
        'Posição',
        'Aluno',
        'Nascimento',
        'Responsável',
        'E-mail',
        'Telefone',
        'Turma pretendida',
        'Turno',
        'Inscrição',
      ]
        .map(escaparCSV)
        .join(';'),
    );

    fila.forEach((aluno: any, indice: number) => {
      linhas.push(
        [
          indice + 1,
          aluno.aluno_nome,
          formatarData(aluno.aluno_nascimento),
          aluno.resp_nome,
          aluno.resp_email,
          aluno.resp_telefone,
          aluno.turmas?.nome || '',
          aluno.turmas?.turno || '',
          formatarData(aluno.created_at),
        ]
          .map(escaparCSV)
          .join(';'),
      );
    });

    return linhas.join('\n');
  }

  async exportarFrequenciaCSV(filtro: FiltroFrequencia): Promise<string> {
    const linhas = await this.montarRelatorioFrequencia(filtro);

    const csv: string[] = [];
    csv.push(
      [
        'Aluno',
        'Turma',
        'Turno',
        'Status',
        'Total de Aulas',
        'Presenças',
        'Faltas',
        'Justificadas',
        '% Frequência',
      ]
        .map(escaparCSV)
        .join(';'),
    );

    for (const linha of linhas) {
      csv.push(
        [
          linha.aluno_nome,
          linha.turma_nome,
          linha.turno,
          linha.status,
          linha.totalAulas,
          linha.presencas,
          linha.faltas,
          linha.justificadas,
          `${linha.percentual}%`,
        ]
          .map(escaparCSV)
          .join(';'),
      );
    }

    const totalRegistros = linhas.reduce((soma, l) => soma + l.totalAulas, 0);
    const presencas = linhas.reduce((soma, l) => soma + l.presencas, 0);
    const justificadas = linhas.reduce((soma, l) => soma + l.justificadas, 0);
    const percentual =
      totalRegistros > 0
        ? Math.round(((presencas + justificadas) / totalRegistros) * 100)
        : 100;

    csv.push('');
    csv.push(
      [
        'TOTAL',
        '',
        '',
        '',
        totalRegistros,
        presencas,
        linhas.reduce((s, l) => s + l.faltas, 0),
        justificadas,
        `${percentual}%`,
      ]
        .map(escaparCSV)
        .join(';'),
    );

    return csv.join('\n');
  }

  async gerarPDFFilaEspera(): Promise<Buffer> {
    const fila = await this.buscarFilaEspera();
    const linhas = fila.map((aluno: any, indice: number) => [
      String(indice + 1),
      aluno.aluno_nome || 'Aluno sem nome',
      formatarData(aluno.aluno_nascimento),
      aluno.resp_nome || '',
      aluno.resp_telefone || '',
      aluno.turmas?.nome || 'Sem turma',
    ]);

    return this.gerarPDF({
      titulo: 'Lista de Espera - CDE Odessa Macedo',
      subtitulo: `${fila.length} candidato(s) aguardando vaga · Gerado em ${new Date().toLocaleString('pt-BR')}`,
      resumo: [
        `Total na fila: ${fila.length}`,
        `Turmas pretendidas: ${new Set(fila.map((a: any) => a.turmas?.nome).filter(Boolean)).size}`,
      ],
      colunas: [
        { titulo: '#', largura: 24, alinhamento: 'center' },
        { titulo: 'Aluno', largura: 150 },
        { titulo: 'Nascimento', largura: 65 },
        { titulo: 'Responsável', largura: 130 },
        { titulo: 'Telefone', largura: 80 },
        { titulo: 'Turma pretendida', largura: 66 },
      ],
      linhas,
      vazio: 'Nenhum candidato na fila de espera.',
    });
  }

  async gerarPDFFrequencia(filtro: FiltroFrequencia): Promise<Buffer> {
    const linhas = await this.montarRelatorioFrequencia(filtro);

    const totalRegistros = linhas.reduce((soma, l) => soma + l.totalAulas, 0);
    const presencas = linhas.reduce((soma, l) => soma + l.presencas, 0);
    const faltas = linhas.reduce((soma, l) => soma + l.faltas, 0);
    const justificadas = linhas.reduce((soma, l) => soma + l.justificadas, 0);
    const percentual =
      totalRegistros > 0
        ? Math.round(((presencas + justificadas) / totalRegistros) * 100)
        : 100;

    const descricaoPeriodo =
      filtro.dataInicio || filtro.dataFim
        ? `Período: ${filtro.dataInicio ? formatarData(filtro.dataInicio) : 'início'} a ${
            filtro.dataFim ? formatarData(filtro.dataFim) : 'hoje'
          }`
        : 'Período: histórico completo';

    return this.gerarPDF({
      titulo: 'Relatório de Frequência - CDE Odessa Macedo',
      subtitulo: `${descricaoPeriodo} · Gerado em ${new Date().toLocaleString('pt-BR')}`,
      resumo: [
        `Alunos: ${linhas.length}`,
        `Aulas registradas: ${totalRegistros}`,
        `Presenças: ${presencas}`,
        `Faltas: ${faltas}`,
        `Justificadas: ${justificadas}`,
        `Frequência média: ${percentual}%`,
      ],
      colunas: [
        { titulo: 'Aluno', largura: 150 },
        { titulo: 'Turma', largura: 130 },
        { titulo: 'Aulas', largura: 40, alinhamento: 'center' },
        { titulo: 'Pres.', largura: 40, alinhamento: 'center' },
        { titulo: 'Faltas', largura: 40, alinhamento: 'center' },
        { titulo: 'Just.', largura: 40, alinhamento: 'center' },
        { titulo: '%', largura: 40, alinhamento: 'center' },
      ],
      linhas: linhas.map((linha) => [
        linha.aluno_nome,
        linha.turma_nome,
        String(linha.totalAulas),
        String(linha.presencas),
        String(linha.faltas),
        String(linha.justificadas),
        `${linha.percentual}%`,
      ]),
      vazio:
        'Nenhum registro de frequência encontrado para os filtros selecionados.',
    });
  }

  private async buscarFilaEspera(): Promise<any[]> {
    if (this.databaseService) {
      const alunos = await this.databaseService.getAlunos();
      return alunos.filter((a) => a.status === 'Fila');
    }

    try {
      const { data } = await this.supabaseService
        .getClient()
        .from('alunos')
        .select('*, turmas(*)')
        .eq('status', 'Fila')
        .order('created_at', { ascending: true });

      return data || [];
    } catch {
      return [];
    }
  }

  private async montarRelatorioFrequencia(
    filtro: FiltroFrequencia,
  ): Promise<LinhaFrequencia[]> {
    if (this.databaseService) {
      const alunos = await this.databaseService.getAlunos();
      const turmas = await this.databaseService.getTurmas();
      const mapTurmas = new Map<string, any>();
      for (const t of turmas) mapTurmas.set(t.id, t);

      let alunosFiltrados = alunos.filter((a) => a.status !== 'Inativo');
      if (filtro.turmaId) {
        alunosFiltrados = alunosFiltrados.filter((a) => a.turma_id === filtro.turmaId);
      }

      const resultado: LinhaFrequencia[] = [];

      for (const aluno of alunosFiltrados) {
        const hist = await this.databaseService.getAlunoHistorico(aluno.id);
        const stats = hist?.stats || { totalAulas: 0, presencas: 0, faltas: 0, justificadas: 0, frequenciaPercentual: 100 };
        const turma = mapTurmas.get(aluno.turma_id);

        resultado.push({
          aluno_nome: aluno.aluno_nome || aluno.resp_nome || 'Aluno sem nome',
          turma_nome: turma?.nome || 'Sem turma',
          turno: turma?.turno || '',
          status: aluno.status,
          totalAulas: stats.totalAulas,
          presencas: stats.presencas,
          faltas: stats.faltas,
          justificadas: stats.justificadas,
          percentual: stats.frequenciaPercentual,
        });
      }

      return resultado;
    }

    return [];
  }

  private gerarPDF(dados: {
    titulo: string;
    subtitulo: string;
    resumo: string[];
    colunas: ColunaRelatorio[];
    linhas: string[][];
    vazio: string;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: any) => chunks.push(chunk as Buffer));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const margem = 40;
      const larguraPagina = doc.page.width;
      const alturaPagina = doc.page.height;
      const larguraTabela = larguraPagina - margem * 2;
      const alturaLinha = 20;

      const desenharCabecalho = () => {
        doc.rect(0, 0, larguraPagina, 78).fill('#1C1300');
        doc
          .fillColor('#F59E0B')
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('CDE ODESSA MACEDO', margem, 22);
        doc
          .fillColor('#FFFFFF')
          .fontSize(16)
          .text(dados.titulo, margem, 36, { width: larguraTabela });
        doc
          .fillColor('#FCD34D')
          .fontSize(8)
          .font('Helvetica')
          .text(dados.subtitulo, margem, 58, {
            width: larguraTabela,
          });
        doc.fillColor('#1C1300').font('Helvetica');
        doc.y = 94;
      };

      const desenharResumo = () => {
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#92400E');
        doc.text('Resumo', margem, doc.y);
        doc.moveDown(0.3);
        doc.font('Helvetica').fontSize(8).fillColor('#374151');
        doc.text(dados.resumo.join('   ·   '), margem, doc.y, {
          width: larguraTabela,
        });
        doc.moveDown(1);
      };

      const desenharCabecalhoTabela = () => {
        let x = margem;
        const y = doc.y;
        doc.rect(margem, y, larguraTabela, alturaLinha).fill('#FEF3C7');
        doc.fillColor('#92400E').fontSize(7.5).font('Helvetica-Bold');
        for (const coluna of dados.colunas) {
          doc.text(coluna.titulo, x + 4, y + 6, {
            width: coluna.largura - 8,
            align: coluna.alinhamento || 'left',
            lineBreak: false,
          });
          x += coluna.largura;
        }
        doc.y = y + alturaLinha;
        doc.font('Helvetica');
      };

      desenharCabecalho();
      desenharResumo();
      desenharCabecalhoTabela();

      if (dados.linhas.length === 0) {
        doc
          .fillColor('#6B7280')
          .fontSize(9)
          .text(dados.vazio, margem, doc.y + 12, {
            width: larguraTabela,
            align: 'center',
          });
      }

      dados.linhas.forEach((linha, indiceLinha) => {
        if (doc.y + alturaLinha > alturaPagina - margem - 30) {
          doc.addPage();
          desenharCabecalho();
          desenharCabecalhoTabela();
        }

        const y = doc.y;
        if (indiceLinha % 2 === 1) {
          doc.rect(margem, y, larguraTabela, alturaLinha).fill('#FAFAF7');
        }

        let x = margem;
        doc.fillColor('#1F2937').fontSize(7.5);
        for (let i = 0; i < dados.colunas.length; i++) {
          const coluna = dados.colunas[i];
          doc.text(linha[i] || '', x + 4, y + 6, {
            width: coluna.largura - 8,
            align: coluna.alinhamento || 'left',
            lineBreak: false,
            ellipsis: true,
          });
          x += coluna.largura;
        }

        doc
          .moveTo(margem, y + alturaLinha)
          .lineTo(margem + larguraTabela, y + alturaLinha)
          .strokeColor('#F3F4F6')
          .lineWidth(0.5)
          .stroke();

        doc.y = y + alturaLinha;
      });

      const rodapeY = alturaPagina - 30;
      doc
        .fontSize(7)
        .fillColor('#9CA3AF')
        .text(
          'Prefeitura Municipal de Bagé · Secretaria Municipal de Cultura · Centro de Desenvolvimento da Expressão Odessa Macedo',
          margem,
          rodapeY,
          { width: larguraTabela, align: 'center' },
        );

      doc.end();
    });
  }
}
