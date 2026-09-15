export interface ValidationError {
  field: string;
  message: string;
}

export const validateCPF = (cpf: string): boolean => {
  if (!cpf) return false;
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(clean.charAt(i), 10) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(clean.charAt(i), 10) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10), 10)) return false;

  return true;
};

export const validateEmail = (email: string): boolean => {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

export const validatePhone = (phone: string): boolean => {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  // DDD (2) + número (8 ou 9) => 10 ou 11 dígitos
  if (digits.length !== 10 && digits.length !== 11) return false;
  const ddd = parseInt(digits.substring(0, 2), 10);
  if (ddd < 11 || ddd > 99) return false;
  return true;
};

export const validateBirthDate = (dateStr: string): { valid: boolean; message?: string } => {
  if (!dateStr) return { valid: false, message: 'Data de nascimento é obrigatória.' };
  const d = new Date(dateStr);
  const now = new Date();
  if (isNaN(d.getTime())) return { valid: false, message: 'Data de nascimento inválida.' };
  if (d > now) return { valid: false, message: 'Data de nascimento não pode ser no futuro.' };

  const age = now.getFullYear() - d.getFullYear();
  if (age < 3) return { valid: false, message: 'O aluno deve ter pelo menos 3 anos.' };
  if (age > 120) return { valid: false, message: 'Data de nascimento inválida (idade máxima 120 anos).' };

  return { valid: true };
};

export const validateAlunoPayload = (payload: any): ValidationError[] => {
  const errors: ValidationError[] = [];

  // 1. Dados do Responsável
  if (!payload?.resp_nome || payload.resp_nome.trim().length < 3) {
    errors.push({ field: 'resp_nome', message: 'Nome do responsável deve conter ao menos 3 caracteres.' });
  }

  if (!payload?.resp_cpf) {
    errors.push({ field: 'resp_cpf', message: 'CPF do responsável é obrigatório.' });
  } else if (!validateCPF(payload.resp_cpf)) {
    errors.push({ field: 'resp_cpf', message: 'CPF do responsável é inválido.' });
  }

  if (!payload?.resp_rg || payload.resp_rg.trim().length < 4) {
    errors.push({ field: 'resp_rg', message: 'RG do responsável é obrigatório (mínimo 4 caracteres).' });
  }

  if (!payload?.resp_email) {
    errors.push({ field: 'resp_email', message: 'E-mail do responsável é obrigatório.' });
  } else if (!validateEmail(payload.resp_email)) {
    errors.push({ field: 'resp_email', message: 'E-mail do responsável é inválido.' });
  }

  if (!payload?.resp_telefone) {
    errors.push({ field: 'resp_telefone', message: 'Telefone do responsável é obrigatório.' });
  } else if (!validatePhone(payload.resp_telefone)) {
    errors.push({ field: 'resp_telefone', message: 'Telefone inválido (deve conter DDD e 8 ou 9 dígitos).' });
  }

  const cepDigits = (payload?.resp_cep || '').replace(/\D/g, '');
  if (!payload?.resp_cep || cepDigits.length !== 8) {
    errors.push({ field: 'resp_cep', message: 'CEP do responsável deve conter 8 dígitos numéricos.' });
  }

  if (!payload?.resp_endereco || payload.resp_endereco.trim().length < 4) {
    errors.push({ field: 'resp_endereco', message: 'Endereço do responsável é obrigatório (mínimo 4 caracteres).' });
  }

  if (!payload?.resp_bairro || payload.resp_bairro.trim().length < 2) {
    errors.push({ field: 'resp_bairro', message: 'Bairro/Cidade do responsável é obrigatório.' });
  }

  // 2. Dados do Aluno
  if (!payload?.aluno_nome || payload.aluno_nome.trim().length < 3) {
    errors.push({ field: 'aluno_nome', message: 'Nome do aluno deve conter ao menos 3 caracteres.' });
  }

  const birthCheck = validateBirthDate(payload?.aluno_nascimento);
  if (!birthCheck.valid) {
    errors.push({ field: 'aluno_nascimento', message: birthCheck.message || 'Data de nascimento inválida.' });
  }

  if (!payload?.aluno_sexo || payload.aluno_sexo.trim().length === 0) {
    errors.push({ field: 'aluno_sexo', message: 'Sexo do aluno é obrigatório.' });
  }

  if (payload?.aluno_cpf && payload.aluno_cpf.trim() !== '') {
    if (!validateCPF(payload.aluno_cpf)) {
      errors.push({ field: 'aluno_cpf', message: 'CPF do aluno é inválido.' });
    }
  }

  if (!payload?.aluno_escola || payload.aluno_escola.trim().length < 2) {
    errors.push({ field: 'aluno_escola', message: 'Instituição de ensino/escola é obrigatória.' });
  }

  // 3. Turma
  if (!payload?.turma_id || payload.turma_id.trim() === '') {
    errors.push({ field: 'turma_id', message: 'Selecione uma turma para a inscrição.' });
  }

  return errors;
};
