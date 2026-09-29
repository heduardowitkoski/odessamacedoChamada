import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'SMTP_FROM') return 'nao-responda@cultura.bage.rs.gov.br';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('deve simular envio com sucesso quando SMTP não está configurado', async () => {
    const result = await service.enviarEmailAlunoChamado({
      resp_nome: 'Carlos Silva',
      resp_email: 'carlos@exemplo.com',
      aluno_nome: 'Lucas Silva',
      turma_nome: 'Infantil A',
      turma_turno: 'Terça 14h às 15h',
      action_link: 'http://localhost:5173/redefinir-senha#token=123',
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toContain('simulated-');
  });
});
