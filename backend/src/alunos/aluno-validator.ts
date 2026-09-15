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
  if (digits.length !== 10 && digits.length !== 11) return false;
  const ddd = parseInt(digits.substring(0, 2), 10);
  if (ddd < 11 || ddd > 99) return false;
  return true;
};

export const parseDateString = (dateStr: string): { date: Date | null; iso: string } => {
  if (!dateStr) return { date: null, iso: '' };

  const trimmed = dateStr.trim();
  // Formato DD/MM/AAAA
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split('/').map(Number);
    const d = new Date(year, month - 1, day);
    if (d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) {
      const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { date: d, iso };
    }
    return { date: null, iso: '' };
  }

  // Formato YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    if (d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) {
      return { date: d, iso: trimmed };
    }
    return { date: null, iso: '' };
  }

  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) return { date: null, iso: '' };
  const iso = parsed.toISOString().split('T')[0];
  return { date: parsed, iso };
};

export const calculateAge = (birthDate: Date): number => {
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const m = now.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export const validateBirthDate = (
  dateStr: string
): { valid: boolean; message?: string; age?: number; isoDate?: string } => {
  if (!dateStr) return { valid: false, message: 'Data de nascimento é obrigatória.' };

  const { date, iso } = parseDateString(dateStr);
  if (!date) return { valid: false, message: 'Data de nascimento inválida (use o formato dia/mês/ano).' };

  const now = new Date();
  if (date > now) return { valid: false, message: 'Data de nascimento não pode ser no futuro.' };

  const age = calculateAge(date);
  if (age < 3) return { valid: false, message: 'O aluno deve ter pelo menos 3 anos.', age };
  if (age > 120) return { valid: false, message: 'Data de nascimento inválida (idade máxima 120 anos).', age };

  return { valid: true, age, isoDate: iso };
};

export const validateAlunoPayload = (
  payload: any,
  turma?: { nome?: string; idade_minima?: number; idade_maxima?: number }
): ValidationError[] => {
  const errors: ValidationError[] = [];

  // 1. Validação do Aluno
  if (!payload?.aluno_nome || payload.aluno_nome.trim().length < 3) {
    errors.push({ field: 'aluno_nome', message: 'Nome do aluno deve conter ao menos 3 caracteres.' });
  }

  const birthCheck = validateBirthDate(payload?.aluno_nascimento);
  if (!birthCheck.valid) {
    errors.push({ field: 'aluno_nascimento', message: birthCheck.message || 'Data de nascimento inválida.' });
  }

  const alunoAge = birthCheck.age ?? 0;
  const isMinor = alunoAge < 18;

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

  // 2. Validação do Responsável
  const respNome = isMinor
    ? payload?.resp_nome
    : (payload?.resp_nome || payload?.aluno_nome);
  const respCpf = isMinor
    ? payload?.resp_cpf
    : (payload?.resp_cpf || payload?.aluno_cpf);

  if (!respNome || respNome.trim().length < 3) {
    errors.push({
      field: 'resp_nome',
      message: isMinor
        ? 'Nome do responsável é obrigatório para alunos menores de 18 anos.'
        : 'Nome completo é obrigatório.',
    });
  }

  if (!respCpf) {
    errors.push({
      field: 'resp_cpf',
      message: isMinor
        ? 'CPF do responsável é obrigatório para alunos menores de 18 anos.'
        : 'CPF é obrigatório.',
    });
  } else if (!validateCPF(respCpf)) {
    errors.push({ field: 'resp_cpf', message: 'CPF informado é inválido.' });
  }

  // REGRA: Se aluno for menor, não permitir que o CPF do responsável seja o mesmo do aluno
  if (isMinor && payload?.aluno_cpf && respCpf) {
    const cleanAlunoCpf = payload.aluno_cpf.replace(/\D/g, '');
    const cleanRespCpf = respCpf.replace(/\D/g, '');
    if (cleanAlunoCpf.length === 11 && cleanRespCpf.length === 11 && cleanAlunoCpf === cleanRespCpf) {
      errors.push({
        field: 'resp_cpf',
        message: 'Em caso de aluno menor de idade, o CPF do responsável não pode ser igual ao do aluno.',
      });
    }
  }

  if (!payload?.resp_rg || payload.resp_rg.trim().length < 4) {
    errors.push({ field: 'resp_rg', message: 'RG é obrigatório (mínimo 4 caracteres).' });
  }

  if (!payload?.resp_email) {
    errors.push({ field: 'resp_email', message: 'E-mail de contato é obrigatório.' });
  } else if (!validateEmail(payload.resp_email)) {
    errors.push({ field: 'resp_email', message: 'E-mail informado é inválido.' });
  }

  if (!payload?.resp_telefone) {
    errors.push({ field: 'resp_telefone', message: 'Telefone de contato é obrigatório.' });
  } else if (!validatePhone(payload.resp_telefone)) {
    errors.push({ field: 'resp_telefone', message: 'Telefone inválido (deve conter DDD e 8 ou 9 dígitos).' });
  }

  const cepDigits = (payload?.resp_cep || '').replace(/\D/g, '');
  if (!payload?.resp_cep || cepDigits.length !== 8) {
    errors.push({ field: 'resp_cep', message: 'CEP deve conter 8 dígitos numéricos.' });
  }

  if (!payload?.resp_endereco || payload.resp_endereco.trim().length < 4) {
    errors.push({ field: 'resp_endereco', message: 'Endereço é obrigatório (mínimo 4 caracteres).' });
  }

  if (!payload?.resp_bairro || payload.resp_bairro.trim().length < 2) {
    errors.push({ field: 'resp_bairro', message: 'Bairro/Cidade é obrigatório.' });
  }

  // 3. Validação da Turma e Faixa Etária
  if (!payload?.turma_id || payload.turma_id.trim() === '') {
    errors.push({ field: 'turma_id', message: 'Selecione uma turma para a inscrição.' });
  } else if (turma && birthCheck.valid) {
    const minAge = turma.idade_minima != null ? Number(turma.idade_minima) : 0;
    const maxAge = turma.idade_maxima != null ? Number(turma.idade_maxima) : 120;

    if (alunoAge < minAge || alunoAge > maxAge) {
      errors.push({
        field: 'turma_id',
        message: `A idade do aluno (${alunoAge} anos) não é permitida para esta turma (${minAge} a ${maxAge} anos).`,
      });
    }
  }

  return errors;
};
