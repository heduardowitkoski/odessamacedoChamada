import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface EmailAlunoChamadoDto {
  resp_nome: string;
  resp_email: string;
  aluno_nome: string;
  turma_nome: string;
  turma_turno: string;
  action_link: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<number>('SMTP_PORT')) || 587;
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`SMTP transporter configurado com sucesso para host ${host}`);
    } else {
      this.logger.warn(
        'Configurações SMTP não encontradas. Os e-mails serão registrados nos logs (modo desenvolvimento).',
      );
    }
  }

  async enviarEmailAlunoChamado(dados: EmailAlunoChamadoDto): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const from =
      this.configService.get<string>('SMTP_FROM') ||
      '"CDE Odessa Macedo" <nao-responda@cultura.bage.rs.gov.br>';

    const subject = `Vaga Confirmada! Inscrição nas Aulas de Desenho - ${dados.aluno_nome}`;

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAFAF7; margin: 0; padding: 24px; color: #1C1300; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 18px; border: 1px solid #FDE68A; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #F59E0B, #EA580C); padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
    .content { padding: 32px 28px; }
    .greeting { font-size: 16px; font-weight: bold; margin-bottom: 12px; }
    .intro { font-size: 14px; line-height: 1.6; color: #4B5563; margin-bottom: 24px; }
    .turma-box { background-color: #FEF3C7; border: 1px solid #FCD34D; border-radius: 14px; padding: 18px; margin-bottom: 24px; }
    .turma-title { font-size: 12px; text-transform: uppercase; font-weight: bold; color: #92400E; margin-bottom: 8px; }
    .turma-detail { font-size: 15px; font-weight: bold; color: #1F2937; margin: 4px 0; }
    .turma-sub { font-size: 13px; color: #6B7280; margin: 2px 0 0 0; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background-color: #F59E0B; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-size: 14px; font-weight: bold; box-shadow: 0 2px 6px rgba(245, 158, 11, 0.3); }
    .portal-info { background-color: #F3F4F6; border-radius: 12px; padding: 16px; font-size: 13px; color: #4B5563; line-height: 1.5; margin-bottom: 24px; }
    .footer { text-align: center; font-size: 11px; color: #9CA3AF; border-top: 1px solid #F3F4F6; padding: 20px; }
    .alt-link { font-size: 11px; color: #6B7280; word-break: break-all; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>CDE Odessa Macedo</h1>
      <p>Centro de Desenvolvimento da Expressão · Secretaria de Cultura</p>
    </div>
    <div class="content">
      <div class="greeting">Olá, ${dados.resp_nome}!</div>
      <p class="intro">
        Temos uma ótima notícia! O(A) aluno(a) <strong>${dados.aluno_nome}</strong> foi chamado(a) da fila de espera e sua matrícula foi confirmada nas oficinas de desenho gratuitas.
      </p>

      <div class="turma-box">
        <div class="turma-title">Dados da Turma Selecionada</div>
        <div class="turma-detail">🎨 ${dados.turma_nome}</div>
        <div class="turma-sub">⏰ Turno / Horário: <strong>${dados.turma_turno}</strong></div>
      </div>

      <div class="portal-info">
        <strong>Acompanhamento de Faltas e Frequência:</strong><br>
        Criamos uma conta de acesso para você em nosso portal. Por lá, você poderá acompanhar em tempo real as presenças e faltas do aluno durante o curso.
      </div>

      <div class="btn-container">
        <a href="${dados.action_link}" class="btn">Definir Minha Senha e Acessar Portal</a>
        <div class="alt-link">
          Se o botão não funcionar, copie e cole este link no navegador:<br>
          <a href="${dados.action_link}" style="color: #F59E0B;">${dados.action_link}</a>
        </div>
      </div>

      <p style="font-size: 12px; color: #6B7280; line-height: 1.5;">
        <em>Lembramos que o CDE Odessa Macedo exige frequência mínima de 75% para manutenção da vaga. Materiais de desenho são fornecidos pelo Centro.</em>
      </p>
    </div>
    <div class="footer">
      Prefeitura Municipal de Bagé · Secretaria Municipal de Cultura<br>
      Centro de Desenvolvimento da Expressão Odessa Macedo
    </div>
  </div>
</body>
</html>
    `;

    if (!this.transporter) {
      this.logger.warn(`[SIMULAÇÃO DE E-MAIL]
Para: ${dados.resp_email}
Assunto: ${subject}
Aluno: ${dados.aluno_nome}
Turma: ${dados.turma_nome} (${dados.turma_turno})
Link de Primeiro Acesso / Troca de Senha: ${dados.action_link}`);
      return { success: true, messageId: 'simulated-' + Date.now() };
    }

    try {
      const info = await this.transporter.sendMail({
        from,
        to: dados.resp_email,
        subject,
        html,
      });
      this.logger.log(`E-mail enviado com sucesso para ${dados.resp_email} (ID: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      this.logger.error(`Erro ao enviar e-mail para ${dados.resp_email}: ${err.message}`, err.stack);
      return { success: false, error: err.message };
    }
  }

  async enviarEmailAlertaFaltas(dados: {
    resp_nome: string;
    resp_email: string;
    aluno_nome: string;
    turma_nome: string;
    turma_turno: string;
    faltas_consecutivas: number;
    ultima_falta: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const from =
      this.configService.get<string>('SMTP_FROM') ||
      '"CDE Odessa Macedo" <nao-responda@cultura.bage.rs.gov.br>';

    const subject = `⚠️ Atenção: ${dados.aluno_nome} possui ${dados.faltas_consecutivas} faltas consecutivas`;

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAFAF7; margin: 0; padding: 24px; color: #1C1300; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 18px; border: 1px solid #FCA5A5; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #DC2626, #B91C1C); padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
    .content { padding: 32px 28px; }
    .alert-box { background-color: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 14px; padding: 18px; margin-bottom: 24px; text-align: center; }
    .alert-number { font-size: 48px; font-weight: 900; color: #DC2626; line-height: 1; }
    .alert-label { font-size: 13px; color: #7F1D1D; font-weight: 600; margin-top: 4px; }
    .turma-box { background-color: #FEF3C7; border: 1px solid #FCD34D; border-radius: 14px; padding: 18px; margin-bottom: 24px; }
    .turma-title { font-size: 12px; text-transform: uppercase; font-weight: bold; color: #92400E; margin-bottom: 8px; }
    .turma-detail { font-size: 15px; font-weight: bold; color: #1F2937; margin: 4px 0; }
    .turma-sub { font-size: 13px; color: #6B7280; margin: 2px 0 0 0; }
    .info { font-size: 13px; line-height: 1.7; color: #4B5563; margin-bottom: 24px; }
    .warning { background: #FFFBEB; border-left: 4px solid #F59E0B; padding: 12px 16px; border-radius: 0 10px 10px 0; font-size: 12px; color: #78350F; margin-bottom: 24px; }
    .footer { text-align: center; font-size: 11px; color: #9CA3AF; border-top: 1px solid #F3F4F6; padding: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>⚠️ Aviso de Absenteísmo</h1>
      <p>CDE Odessa Macedo · Centro de Desenvolvimento da Expressão</p>
    </div>
    <div class="content">
      <p class="info">Olá, <strong>${dados.resp_nome}</strong>!</p>
      <p class="info">
        Estamos entrando em contato para informar que o(a) aluno(a) <strong>${dados.aluno_nome}</strong>
        apresentou faltas consecutivas nas aulas de desenho do CDE Odessa Macedo.
      </p>

      <div class="alert-box">
        <div class="alert-number">${dados.faltas_consecutivas}</div>
        <div class="alert-label">faltas consecutivas registradas</div>
        <div style="font-size:11px;color:#9CA3AF;margin-top:6px;">Última falta: ${dados.ultima_falta}</div>
      </div>

      <div class="turma-box">
        <div class="turma-title">Turma do Aluno</div>
        <div class="turma-detail">🎨 ${dados.turma_nome}</div>
        <div class="turma-sub">⏰ Turno / Horário: <strong>${dados.turma_turno}</strong></div>
      </div>

      <div class="warning">
        <strong>⚠️ Atenção:</strong> O regulamento do CDE Odessa Macedo exige frequência mínima de <strong>75%</strong> para manutenção da vaga.
        Alunos com muitas faltas não justificadas poderão ter suas vagas redistribuídas para candidatos da fila de espera.
      </div>

      <p class="info">
        Caso o(a) aluno(a) não possa comparecer às aulas por algum motivo, pedimos que entre em contato com a coordenação
        do programa para justificar as ausências e garantir a manutenção da vaga.
      </p>
    </div>
    <div class="footer">
      Prefeitura Municipal de Bagé · Secretaria Municipal de Cultura<br>
      Centro de Desenvolvimento da Expressão Odessa Macedo
    </div>
  </div>
</body>
</html>
    `;

    if (!this.transporter) {
      this.logger.warn(`[SIMULAÇÃO - ALERTA FALTAS]
Para: ${dados.resp_email}
Assunto: ${subject}
Aluno: ${dados.aluno_nome} | Faltas consecutivas: ${dados.faltas_consecutivas}`);
      return { success: true, messageId: 'simulated-alerta-' + Date.now() };
    }

    try {
      const info = await this.transporter.sendMail({ from, to: dados.resp_email, subject, html });
      this.logger.log(`E-mail de alerta enviado para ${dados.resp_email} (ID: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      this.logger.error(`Erro ao enviar alerta para ${dados.resp_email}: ${err.message}`);
      return { success: false, error: err.message };
    }
  }
}
