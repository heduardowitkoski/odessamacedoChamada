import {
  validateCPF,
  validateEmail,
  validatePhone,
  validateBirthDate,
  validateAlunoPayload,
} from './aluno-validator';

describe('AlunoValidator', () => {
  describe('validateCPF', () => {
    it('deve validar CPFs válidos', () => {
      expect(validateCPF('52998224725')).toBe(true);
      expect(validateCPF('529.982.247-25')).toBe(true);
    });

    it('deve rejeitar CPFs com dígitos repetidos', () => {
      expect(validateCPF('111.111.111-11')).toBe(false);
      expect(validateCPF('00000000000')).toBe(false);
    });

    it('deve rejeitar CPFs com dígitos verificadores incorretos', () => {
      expect(validateCPF('123.456.789-00')).toBe(false);
      expect(validateCPF('52998224724')).toBe(false);
    });

    it('deve rejeitar CPFs vazios ou com tamanho incorreto', () => {
      expect(validateCPF('')).toBe(false);
      expect(validateCPF('12345')).toBe(false);
    });
  });

  describe('validateEmail', () => {
    it('deve aceitar e-mails válidos', () => {
      expect(validateEmail('responsavel@gmail.com')).toBe(true);
      expect(validateEmail('aluno.escola@educacao.rs.gov.br')).toBe(true);
    });

    it('deve rejeitar e-mails inválidos', () => {
      expect(validateEmail('emailinvalido')).toBe(false);
      expect(validateEmail('usuario@')).toBe(false);
      expect(validateEmail('@dominio.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('validatePhone', () => {
    it('deve aceitar telefones com DDD válidos de 10 e 11 dígitos', () => {
      expect(validatePhone('(53) 99999-0000')).toBe(true);
      expect(validatePhone('5332421234')).toBe(true);
    });

    it('deve rejeitar telefones com DDD inválido ou quantidade incorreta de dígitos', () => {
      expect(validatePhone('(05) 99999-0000')).toBe(false);
      expect(validatePhone('12345')).toBe(false);
      expect(validatePhone('')).toBe(false);
    });
  });

  describe('validateBirthDate', () => {
    it('deve aceitar data de nascimento em formato DD/MM/AAAA', () => {
      const res = validateBirthDate('10/05/2015');
      expect(res.valid).toBe(true);
      expect(res.isoDate).toBe('2015-05-10');
    });

    it('deve aceitar data de nascimento em formato ISO YYYY-MM-DD', () => {
      const res = validateBirthDate('2015-05-10');
      expect(res.valid).toBe(true);
      expect(res.isoDate).toBe('2015-05-10');
    });

    it('deve rejeitar data no futuro', () => {
      const res = validateBirthDate('01/01/2099');
      expect(res.valid).toBe(false);
      expect(res.message).toContain('futuro');
    });

    it('deve rejeitar aluno com menos de 3 anos', () => {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const res = validateBirthDate(`${day}/${month}/${year}`);
      expect(res.valid).toBe(false);
      expect(res.message).toContain('3 anos');
    });
  });

  describe('validateAlunoPayload', () => {
    it('deve retornar erros quando campos obrigatórios estão vazios', () => {
      const errors = validateAlunoPayload({});
      expect(errors.length).toBeGreaterThan(0);
      const fields = errors.map((e) => e.field);
      expect(fields).toContain('resp_nome');
      expect(fields).toContain('resp_cpf');
      expect(fields).toContain('resp_email');
      expect(fields).toContain('resp_telefone');
      expect(fields).toContain('resp_cep');
      expect(fields).toContain('aluno_nome');
      expect(fields).toContain('turma_id');
    });

    it('deve rejeitar CPF do responsável igual ao do aluno menor de idade', () => {
      const payload = {
        resp_nome: 'Responsavel Legal',
        resp_cpf: '529.982.247-25',
        resp_rg: '12345678',
        resp_email: 'resp@email.com',
        resp_telefone: '(53) 99123-4567',
        resp_cep: '96400-010',
        resp_endereco: 'Rua Sete, 100',
        resp_bairro: 'Centro',
        aluno_nome: 'Aluno Menor',
        aluno_nascimento: '10/05/2015', // 10-11 anos (menor)
        aluno_sexo: 'Masculino',
        aluno_cpf: '529.982.247-25', // MESMO CPF!
        aluno_escola: 'Escola Central',
        aluno_experiencia: 'Nenhuma',
        turma_id: 't-123',
      };

      const errors = validateAlunoPayload(payload);
      const cpfError = errors.find((e) => e.field === 'resp_cpf');
      expect(cpfError).toBeDefined();
      expect(cpfError?.message).toContain('não pode ser igual');
    });

    it('deve rejeitar aluno fora da faixa etária da turma', () => {
      const payload = {
        resp_nome: 'Responsavel Legal',
        resp_cpf: '529.982.247-25',
        resp_rg: '12345678',
        resp_email: 'resp@email.com',
        resp_telefone: '(53) 99123-4567',
        resp_cep: '96400-010',
        resp_endereco: 'Rua Sete, 100',
        resp_bairro: 'Centro',
        aluno_nome: 'Aluno Juvenil',
        aluno_nascimento: '10/05/2010', // ~16 anos
        aluno_sexo: 'Feminino',
        aluno_cpf: '',
        aluno_escola: 'Escola Estadual',
        aluno_experiencia: 'Nenhuma',
        turma_id: 't-infantil',
      };

      const turmaInfantil = {
        nome: 'Turma Infantil A - 5 a 7 anos',
        idade_minima: 5,
        idade_maxima: 7,
      };

      const errors = validateAlunoPayload(payload, turmaInfantil);
      const turmaError = errors.find((e) => e.field === 'turma_id');
      expect(turmaError).toBeDefined();
      expect(turmaError?.message).toContain('não é permitida para esta turma');
    });

    it('deve retornar vazio quando payload está completamente válido e condizente com a turma', () => {
      const validPayload = {
        resp_nome: 'Maria da Silva',
        resp_cpf: '529.982.247-25',
        resp_rg: '12345678',
        resp_email: 'maria@email.com',
        resp_telefone: '(53) 99123-4567',
        resp_cep: '96400-010',
        resp_endereco: 'Rua Sete de Setembro, 500',
        resp_bairro: 'Centro, Bagé - RS',
        aluno_nome: 'João Pedro da Silva',
        aluno_nascimento: '15/06/2014',
        aluno_sexo: 'Masculino',
        aluno_cpf: '',
        aluno_escola: 'Escola Silveira Martins',
        aluno_experiencia: 'Nenhuma',
        turma_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      };

      const turma = {
        nome: 'Turma Juvenil A - 11 a 13 anos',
        idade_minima: 11,
        idade_maxima: 13,
      };

      const errors = validateAlunoPayload(validPayload, turma);
      expect(errors).toHaveLength(0);
    });
  });
});
