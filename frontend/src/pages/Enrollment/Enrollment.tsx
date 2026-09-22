import { useState, useEffect, type ChangeEvent, type FocusEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle, AlertCircle, Pencil, ArrowRight, Loader2, UserCheck } from "lucide-react";
import { SpotBar } from "../../components/ui/SpotBar";

type FormStep = 0 | 1 | 2 | 3;

interface Turma {
  id: string;
  nome: string;
  turno: string;
  capacidade: number;
  idade_minima?: number;
  idade_maxima?: number;
}

const API_BASE = (import.meta as any).env?.VITE_API_URL || "https://odessamacedochamada.onrender.com";

// ==========================================
// Extração e Validação de Faixa Etária
// ==========================================
export function extractAgeRange(nome: string): { idade_minima: number; idade_maxima: number } {
  if (!nome) return { idade_minima: 0, idade_maxima: 120 };
  const matchRange = nome.match(/(\d+)\s*a\s*(\d+)/i);
  if (matchRange) {
    return { idade_minima: parseInt(matchRange[1], 10), idade_maxima: parseInt(matchRange[2], 10) };
  }
  const matchPlus = nome.match(/(\d+)\s*\+/);
  if (matchPlus) {
    const min = parseInt(matchPlus[1], 10);
    return { idade_minima: min, idade_maxima: min >= 60 ? 120 : 59 };
  }
  if (/infantil a/i.test(nome)) return { idade_minima: 5, idade_maxima: 7 };
  if (/infantil b/i.test(nome)) return { idade_minima: 8, idade_maxima: 10 };
  if (/juvenil a/i.test(nome)) return { idade_minima: 11, idade_maxima: 13 };
  if (/juvenil b/i.test(nome)) return { idade_minima: 14, idade_maxima: 17 };
  if (/adulto/i.test(nome)) return { idade_minima: 18, idade_maxima: 59 };
  if (/melhor idade|idoso/i.test(nome)) return { idade_minima: 60, idade_maxima: 120 };
  return { idade_minima: 0, idade_maxima: 120 };
}

// ==========================================
// Funções Utilitárias de Validação
// ==========================================

const validateFullName = (name: string): string | null => {
  const trimmed = name.trim();
  if (!trimmed) return "Nome é obrigatório.";
  if (trimmed.length < 5) return "Nome muito curto (mínimo 5 caracteres).";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return "Informe o nome completo (ao menos nome e sobrenome).";
  if (!/^[a-zA-ZÀ-ÿ\s'.-]+$/.test(trimmed)) return "O nome deve conter apenas letras.";
  return null;
};

const validateCPF = (cpf: string): string | null => {
  if (!cpf) return "CPF é obrigatório.";
  const clean = cpf.replace(/\D/g, "");
  if (clean.length !== 11) return "CPF deve conter exatamente 11 números.";
  if (/^(\d)\1{10}$/.test(clean)) return "CPF inválido (todos os dígitos repetidos).";

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(clean.charAt(i), 10) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9), 10)) return "CPF inválido. Verifique os dígitos.";

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(clean.charAt(i), 10) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10), 10)) return "CPF inválido. Verifique os dígitos.";

  return null;
};

const validateRG = (rg: string): string | null => {
  const clean = rg.replace(/\D/g, "");
  if (!clean) return "RG é obrigatório.";
  if (clean.length < 4) return "RG deve ter ao menos 4 dígitos.";
  return null;
};

const validateEmail = (email: string): string | null => {
  if (!email.trim()) return "E-mail é obrigatório.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return "Informe um e-mail válido (ex: nome@dominio.com).";
  }
  return null;
};

const validatePhone = (phone: string): string | null => {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "Telefone / WhatsApp é obrigatório.";
  if (digits.length !== 10 && digits.length !== 11) {
    return "Telefone inválido (deve conter DDD e 8 ou 9 dígitos).";
  }
  const ddd = parseInt(digits.substring(0, 2), 10);
  if (ddd < 11 || ddd > 99) {
    return "DDD de telefone inválido.";
  }
  return null;
};

// Parser e validador de Data DD/MM/AAAA
const parseDateBR = (dateStr: string): { date: Date | null; iso: string; age: number | null } => {
  if (!dateStr) return { date: null, iso: "", age: null };
  const clean = dateStr.trim();

  let day = 0;
  let month = 0;
  let year = 0;

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
    [day, month, year] = clean.split("/").map(Number);
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    [year, month, day] = clean.split("-").map(Number);
  } else {
    return { date: null, iso: "", age: null };
  }

  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return { date: null, iso: "", age: null };
  }

  const now = new Date();
  let age = now.getFullYear() - year;
  const m = now.getMonth() - (month - 1);
  if (m < 0 || (m === 0 && now.getDate() < day)) {
    age--;
  }

  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { date: d, iso, age };
};

const validateBirthDate = (dateStr: string): string | null => {
  if (!dateStr.trim()) return "Data de nascimento é obrigatória.";
  if (dateStr.length < 10) return "Preencha a data completa (dia/mês/ano).";

  const { date, age } = parseDateBR(dateStr);
  if (!date || age === null) return "Data de nascimento inválida.";

  const now = new Date();
  if (date > now) return "Data de nascimento não pode ser futura.";
  if (age < 3) return "O aluno deve ter no mínimo 3 anos de idade.";
  if (age > 120) return "Data de nascimento inválida (idade máxima 120 anos).";

  return null;
};

// ==========================================
// Funções de Máscara de Entrada
// ==========================================

const formatCPF = (val: string) => {
  const v = val.replace(/\D/g, "").slice(0, 11);
  if (v.length <= 3) return v;
  if (v.length <= 6) return `${v.slice(0, 3)}.${v.slice(3)}`;
  if (v.length <= 9) return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6)}`;
  return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}`;
};

const formatPhone = (val: string) => {
  const v = val.replace(/\D/g, "").slice(0, 11);
  if (v.length <= 2) return v ? `(${v}` : "";
  if (v.length <= 7) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
  return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
};

const formatCEP = (val: string) => {
  const v = val.replace(/\D/g, "").slice(0, 8);
  if (v.length <= 5) return v;
  return `${v.slice(0, 5)}-${v.slice(5)}`;
};

const formatDateBR = (val: string) => {
  const v = val.replace(/\D/g, "").slice(0, 8);
  if (v.length <= 2) return v;
  if (v.length <= 4) return `${v.slice(0, 2)}/${v.slice(2)}`;
  return `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`;
};

export default function EnrollmentScreen() {
  const [step, setStep] = useState<FormStep>(0);
  const [turmasDb, setTurmasDb] = useState<Turma[]>([]);
  const [loadingTurmas, setLoadingTurmas] = useState(true);
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepSuccessMsg, setCepSuccessMsg] = useState("");

  // Cache persistente de CEPs válidos e inválidos
  const [invalidCeps, setInvalidCeps] = useState<Set<string>>(new Set());
  const [validCeps, setValidCeps] = useState<Set<string>>(new Set());

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Estados do Formulário
  const [formData, setFormData] = useState({
    aluno_nome: "",
    aluno_nascimento: "",
    aluno_sexo: "",
    aluno_cpf: "",
    aluno_escola: "",
    aluno_experiencia: "",
    aluno_necessidades: "",
    resp_nome: "",
    resp_cpf: "",
    resp_rg: "",
    resp_email: "",
    resp_telefone: "",
    resp_endereco: "",
    resp_cep: "",
    resp_bairro: "",
    turma_id: ""
  });

  // Cálculo de idade em tempo real
  const { age: alunoAge } = parseDateBR(formData.aluno_nascimento);
  const isMinor = alunoAge !== null && alunoAge < 18;
  const isAdult = alunoAge !== null && alunoAge >= 18;

  // Busca inicial das turmas no backend
  useEffect(() => {
    setLoadingTurmas(true);
    fetch(`${API_BASE}/turmas`)
      .then((res) => {
        if (!res.ok) throw new Error("Falha ao buscar turmas");
        return res.json();
      })
      .then((data) => {
        setTurmasDb(data);
        setLoadingTurmas(false);
      })
      .catch((err) => {
        console.error(err);
        setLoadingTurmas(false);
      });
  }, []);

  // Steps dinâmicos com base na idade
  const steps = [
    "Aluno",
    isAdult ? "Contato e Endereço" : "Responsável Legal",
    "Turma",
    "Confirmação"
  ];

  const selectedTurma = turmasDb.find((t) => t.id === formData.turma_id);

  // Validador individual de campo com persistência de erro de CEP e CPF duplicado
  const validateField = (name: string, value: string, currentData = formData): string | null => {
    switch (name) {
      case "aluno_nome":
        return validateFullName(value);
      case "aluno_nascimento":
        return validateBirthDate(value);
      case "aluno_sexo":
        if (!value.trim()) return "Selecione o sexo do aluno.";
        return null;
      case "aluno_cpf":
        if (value.trim()) {
          const cpfErr = validateCPF(value);
          if (cpfErr) return cpfErr;
          // Se for menor e responsável já tiver CPF preenchido, não permitir repetir
          if (isMinor && currentData.resp_cpf) {
            const cA = value.replace(/\D/g, "");
            const cR = currentData.resp_cpf.replace(/\D/g, "");
            if (cA.length === 11 && cR.length === 11 && cA === cR) {
              return "O CPF do aluno não pode ser igual ao do responsável.";
            }
          }
        }
        return null;
      case "aluno_escola":
        if (!value.trim()) return "Informe a escola ou instituição de ensino (ou 'Não estuda').";
        if (value.trim().length < 2) return "Nome da escola muito curto.";
        return null;
      case "aluno_experiencia":
        if (!value.trim()) return "Selecione a experiência prévia do aluno.";
        return null;

      case "resp_nome":
        if (isMinor) return validateFullName(value);
        return null;

      case "resp_cpf": {
        const cpfErr = validateCPF(value);
        if (cpfErr) return cpfErr;
        // REGRA: Em caso de menor, não permitir repetir CPF com o do aluno
        if (isMinor && currentData.aluno_cpf) {
          const cleanA = currentData.aluno_cpf.replace(/\D/g, "");
          const cleanR = value.replace(/\D/g, "");
          if (cleanA.length === 11 && cleanR.length === 11 && cleanA === cleanR) {
            return "Em caso de aluno menor, o CPF do responsável não pode ser o mesmo do aluno.";
          }
        }
        return null;
      }

      case "resp_rg":
        return validateRG(value);
      case "resp_email":
        return validateEmail(value);
      case "resp_telefone":
        return validatePhone(value);

      case "resp_cep": {
        const clean = value.replace(/\D/g, "");
        if (!clean) return "CEP é obrigatório.";
        if (clean.length !== 8) return "CEP deve conter exatamente 8 números.";
        if (invalidCeps.has(clean)) return "CEP não encontrado nos Correios.";
        return null;
      }

      case "resp_endereco":
        if (!value.trim()) return "Endereço é obrigatório.";
        if (value.trim().length < 4) return "Endereço deve conter ao menos 4 caracteres.";
        return null;
      case "resp_bairro":
        if (!value.trim()) return "Bairro / Cidade é obrigatório.";
        if (value.trim().length < 2) return "Informe o bairro e a cidade.";
        return null;

      case "turma_id": {
        if (!value.trim()) return "Selecione uma turma para continuar.";
        const turma = turmasDb.find((t) => t.id === value);
        if (turma && alunoAge !== null) {
          const min = turma.idade_minima != null ? Number(turma.idade_minima) : extractAgeRange(turma.nome).idade_minima;
          const max = turma.idade_maxima != null ? Number(turma.idade_maxima) : extractAgeRange(turma.nome).idade_maxima;
          if (alunoAge < min || alunoAge > max) {
            return `A idade do aluno (${alunoAge} anos) não é permitida para esta turma (${min} a ${max} anos).`;
          }
        }
        return null;
      }
      default:
        return null;
    }
  };

  // Consulta à API pública do ViaCEP com retenção rigorosa de erros
  const searchCepApi = async (cleanCep: string) => {
    if (cleanCep.length !== 8) return;
    if (validCeps.has(cleanCep)) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.resp_cep;
        return next;
      });
      return;
    }

    setLoadingCep(true);
    setCepSuccessMsg("");

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();

      if (data.erro) {
        setInvalidCeps((prev) => new Set(prev).add(cleanCep));
        setErrors((prev) => ({ ...prev, resp_cep: "CEP não encontrado nos Correios." }));
      } else {
        setValidCeps((prev) => new Set(prev).add(cleanCep));
        setInvalidCeps((prev) => {
          const next = new Set(prev);
          next.delete(cleanCep);
          return next;
        });

        const autoEndereco = data.logradouro ? data.logradouro : formData.resp_endereco;
        const autoBairro = data.bairro
          ? `${data.bairro}, ${data.localidade} - ${data.uf}`
          : `${data.localidade} - ${data.uf}`;

        setFormData((prev) => ({
          ...prev,
          resp_endereco: autoEndereco,
          resp_bairro: autoBairro
        }));

        setErrors((prev) => {
          const updated = { ...prev };
          delete updated.resp_cep;
          if (autoEndereco) delete updated.resp_endereco;
          if (autoBairro) delete updated.resp_bairro;
          return updated;
        });

        setCepSuccessMsg(`${data.localidade} - ${data.uf}`);
      }
    } catch (err) {
      console.warn("Erro ao consultar CEP via API:", err);
    } finally {
      setLoadingCep(false);
    }
  };

  // Manipulador de digitação (onChange)
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === "aluno_nascimento") {
      formattedValue = formatDateBR(value);
    } else if (name === "resp_cpf" || name === "aluno_cpf") {
      formattedValue = formatCPF(value);
    } else if (name === "resp_telefone") {
      formattedValue = formatPhone(value);
    } else if (name === "resp_cep") {
      formattedValue = formatCEP(value);
      const cleanCep = value.replace(/\D/g, "");
      if (cleanCep.length === 8) {
        searchCepApi(cleanCep);
      } else {
        setCepSuccessMsg("");
      }
    }

    const updatedFormData = { ...formData, [name]: formattedValue };

    // Se aluno for adulto, sincroniza nome e CPF com responsável
    const { age } = parseDateBR(name === "aluno_nascimento" ? formattedValue : updatedFormData.aluno_nascimento);
    if (age !== null && age >= 18) {
      if (name === "aluno_nome") updatedFormData.resp_nome = formattedValue;
      if (name === "aluno_cpf") updatedFormData.resp_cpf = formattedValue;
      if (name === "resp_cpf") updatedFormData.aluno_cpf = formattedValue;
    }

    setFormData(updatedFormData);

    // Validação reativa
    if (touched[name] || errors[name]) {
      const err = validateField(name, formattedValue, updatedFormData);
      setErrors((prev) => {
        const next = { ...prev };
        if (err) next[name] = err;
        else delete next[name];

        // Se corrigiu CPF de um, revalida o outro caso estivesse com erro de duplicidade
        if ((name === "resp_cpf" || name === "aluno_cpf") && next.resp_cpf?.includes("não pode ser o mesmo")) {
          const crossErr = validateField("resp_cpf", updatedFormData.resp_cpf, updatedFormData);
          if (crossErr) next.resp_cpf = crossErr;
          else delete next.resp_cpf;
        }

        return next;
      });
    }
  };

  // Ao sair do campo (onBlur)
  const handleBlur = (e: FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));

    const err = validateField(name, value, formData);
    setErrors((prev) => {
      const next = { ...prev };
      if (err) next[name] = err;
      else delete next[name];
      return next;
    });

    if (name === "resp_cep") {
      const clean = value.replace(/\D/g, "");
      if (clean.length === 8 && !validCeps.has(clean)) {
        searchCepApi(clean);
      }
    }
  };

  const handleExperiencia = (exp: string) => {
    setFormData((prev) => ({ ...prev, aluno_experiencia: exp }));
    setTouched((prev) => ({ ...prev, aluno_experiencia: true }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.aluno_experiencia;
      return next;
    });
  };

  // Validação dos campos de cada etapa
  const getStepErrors = (targetStep: number): Record<string, string> => {
    const stepErrors: Record<string, string> = {};

    // Etapa 0: Aluno
    if (targetStep === 0) {
      const fields = [
        "aluno_nome",
        "aluno_nascimento",
        "aluno_sexo",
        "aluno_cpf",
        "aluno_escola",
        "aluno_experiencia"
      ] as const;

      fields.forEach((field) => {
        const err = validateField(field, formData[field], formData);
        if (err) stepErrors[field] = err;
      });
    }

    // Etapa 1: Responsável ou Contato
    if (targetStep === 1) {
      const fields = isMinor
        ? ([
            "resp_nome",
            "resp_cpf",
            "resp_rg",
            "resp_email",
            "resp_telefone",
            "resp_endereco",
            "resp_cep",
            "resp_bairro"
          ] as const)
        : ([
            "resp_cpf",
            "resp_rg",
            "resp_email",
            "resp_telefone",
            "resp_endereco",
            "resp_cep",
            "resp_bairro"
          ] as const);

      fields.forEach((field) => {
        const val = field === "resp_cpf" && isAdult && !formData.resp_cpf ? formData.aluno_cpf : formData[field];
        const err = validateField(field, val, formData);
        if (err) stepErrors[field] = err;
      });
    }

    // Etapa 2: Turma
    if (targetStep === 2) {
      const err = validateField("turma_id", formData.turma_id, formData);
      if (err) stepErrors.turma_id = err;
    }

    return stepErrors;
  };

  const markStepTouched = (targetStep: number) => {
    const touchedFields: Record<string, boolean> = {};
    if (targetStep === 0) {
      [
        "aluno_nome",
        "aluno_nascimento",
        "aluno_sexo",
        "aluno_cpf",
        "aluno_escola",
        "aluno_experiencia"
      ].forEach((f) => (touchedFields[f] = true));
    } else if (targetStep === 1) {
      [
        "resp_nome",
        "resp_cpf",
        "resp_rg",
        "resp_email",
        "resp_telefone",
        "resp_endereco",
        "resp_cep",
        "resp_bairro"
      ].forEach((f) => (touchedFields[f] = true));
    } else if (targetStep === 2) {
      touchedFields.turma_id = true;
    }
    setTouched((prev) => ({ ...prev, ...touchedFields }));
  };

  const handleNextStep = () => {
    markStepTouched(step);
    const stepErrors = getStepErrors(step);

    if (Object.keys(stepErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...stepErrors }));
      return;
    }

    // Se saiu do Passo 0 (Aluno) e o aluno é adulto, sincroniza dados para o responsável
    if (step === 0 && isAdult) {
      setFormData((prev) => ({
        ...prev,
        resp_nome: prev.aluno_nome,
        resp_cpf: prev.aluno_cpf || prev.resp_cpf
      }));
    }

    setStep((s) => Math.min(3, s + 1) as FormStep);
  };

  const handleStepClick = (targetStep: FormStep) => {
    if (targetStep < step) {
      setStep(targetStep);
      return;
    }

    // Todas as etapas anteriores devem ser válidas
    for (let s = 0; s < targetStep; s++) {
      markStepTouched(s);
      const stepErrors = getStepErrors(s);
      if (Object.keys(stepErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...stepErrors }));
        setStep(s as FormStep);
        return;
      }
    }
    setStep(targetStep);
  };

  const handleSubmit = async () => {
    setSubmitAttempted(true);

    // Validação de todas as etapas anteriores
    const step0Errors = getStepErrors(0);
    if (Object.keys(step0Errors).length > 0) {
      markStepTouched(0);
      setErrors((prev) => ({ ...prev, ...step0Errors }));
      setStep(0);
      alert("Por favor, preencha corretamente os dados do aluno marcados em vermelho.");
      return;
    }

    const step1Errors = getStepErrors(1);
    if (Object.keys(step1Errors).length > 0) {
      markStepTouched(1);
      setErrors((prev) => ({ ...prev, ...step1Errors }));
      setStep(1);
      alert("Por favor, preencha corretamente as informações de contato/responsável marcadas em vermelho.");
      return;
    }

    const step2Errors = getStepErrors(2);
    if (Object.keys(step2Errors).length > 0) {
      markStepTouched(2);
      setErrors((prev) => ({ ...prev, ...step2Errors }));
      setStep(2);
      alert(step2Errors.turma_id || "Por favor, selecione uma turma compatível.");
      return;
    }

    // Converter data de nascimento para formato ISO YYYY-MM-DD para o backend
    const { iso: birthIso } = parseDateBR(formData.aluno_nascimento);

    const payload = {
      ...formData,
      aluno_nascimento: birthIso || formData.aluno_nascimento,
      resp_nome: isAdult ? formData.aluno_nome : formData.resp_nome,
      resp_cpf: isAdult ? (formData.resp_cpf || formData.aluno_cpf) : formData.resp_cpf,
    };

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/alunos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        alert("Inscrição confirmada com sucesso!");
        // REGRA: Ao finalizar a inscrição, voltar à tela inicial
        navigate("/");
      } else {
        if (data.errors && Array.isArray(data.errors)) {
          const backendErrors: Record<string, string> = {};
          data.errors.forEach((errItem: { field: string; message: string }) => {
            backendErrors[errItem.field] = errItem.message;
          });
          setErrors((prev) => ({ ...prev, ...backendErrors }));

          const firstErrField = data.errors[0]?.field;
          if (["aluno_nome", "aluno_nascimento", "aluno_sexo", "aluno_cpf", "aluno_escola"].includes(firstErrField)) {
            setStep(0);
          } else if (["resp_nome", "resp_cpf", "resp_rg", "resp_email", "resp_telefone", "resp_endereco", "resp_cep", "resp_bairro"].includes(firstErrField)) {
            setStep(1);
          } else if (firstErrField === "turma_id") {
            setStep(2);
          }
        }
        alert("Não foi possível aceitar a inscrição: " + (data.message || "Verifique os campos marcados em vermelho."));
      }
    } catch (e) {
      alert("Erro ao conectar com o servidor. Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const getInputClass = (fieldName: string) => {
    const isInvalid = (touched[fieldName] || submitAttempted) && !!errors[fieldName];
    return `w-full h-11 px-4 rounded-xl border text-sm transition-all outline-none ${
      isInvalid
        ? "border-red-500 bg-red-50/50 text-red-900 placeholder-red-300 focus:border-red-600 focus:ring-2 focus:ring-red-200"
        : "border-gray-200 bg-gray-50 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
    }`;
  };

  return (
    <div className="min-h-screen bg-[#FAFAF7] font-['Inter',sans-serif]">
      {/* Header */}
      <header className="bg-white border-b border-amber-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1440px] mx-auto px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
              <Pencil size={15} className="text-white" />
            </div>
            <div>
              <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[#1C1300] text-sm block">CDE Odessa Macedo</span>
              <span className="text-amber-500 text-xs font-medium">Formulário de Inscrição · Desenho</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm text-gray-500 hover:text-gray-900 font-medium">
              ← Voltar ao portal
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-[1440px] mx-auto px-8 py-10">
        <div className="mb-7">
          <h1 className="font-['Plus_Jakarta_Sans',sans-serif] text-3xl font-extrabold text-[#1C1300] mb-1">
            Inscrição nas Aulas de Desenho
          </h1>
          <p className="text-gray-500 text-sm">
            Informe os dados do aluno. Campos com <span className="text-red-500 font-bold">*</span> são de preenchimento obrigatório.
          </p>
        </div>

        {/* Alerta gratuidade */}
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3.5 mb-8 max-w-xl">
          <CheckCircle size={18} className="text-emerald-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-emerald-900">Inscrição e aulas totalmente gratuitas</p>
            <p className="text-xs text-emerald-700">Materiais de desenho fornecidos pelo Centro. Frequência obrigatória.</p>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Formulário Principal */}
          <div className="flex-1 max-w-3xl">
            {/* Stepper */}
            <div className="flex items-center mb-8">
              {steps.map((s, i) => {
                const isCompleted = i < step;
                const isCurrent = i === step;
                return (
                  <div key={s} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => handleStepClick(i as FormStep)}
                      className="flex flex-col items-center gap-1.5 cursor-pointer focus:outline-none"
                    >
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                          isCompleted
                            ? "bg-green-500 text-white"
                            : isCurrent
                            ? "bg-amber-500 text-white shadow-md shadow-amber-200"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {isCompleted ? <CheckCircle size={17} /> : i + 1}
                      </div>
                      <span className={`text-xs font-semibold whitespace-nowrap ${isCurrent ? "text-amber-700" : "text-gray-400"}`}>
                        {s}
                      </span>
                    </button>
                    {i < steps.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-2 mb-5 min-w-[40px] ${i < step ? "bg-green-400" : "bg-gray-200"}`} />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="bg-white rounded-2xl border border-amber-50 shadow-sm p-7">
              {/* ==================================================== */}
              {/* Passo 0: Aluno (Primeiro conforme solicitado)       */}
              {/* ==================================================== */}
              {step === 0 && (
                <div>
                  <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl text-[#1C1300] mb-1">
                    Dados do aluno
                  </h2>
                  <p className="text-xs text-gray-400 mb-5">
                    Preencha os dados de quem vai frequentar as aulas de desenho.
                  </p>

                  <div className="grid grid-cols-2 gap-5">
                    {/* Nome do aluno */}
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Nome completo do aluno <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="aluno_nome"
                        value={formData.aluno_nome}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Nome e sobrenome completo do aluno"
                        className={getInputClass("aluno_nome")}
                      />
                      {(touched.aluno_nome || submitAttempted) && errors.aluno_nome && (
                        <p className="text-red-600 text-xs font-medium mt-1.5 flex items-center gap-1">
                          <AlertCircle size={13} /> {errors.aluno_nome}
                        </p>
                      )}
                    </div>

                    {/* Data de Nascimento (Formato DD/MM/AAAA) */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center justify-between">
                        <span>Data de nascimento <span className="text-red-500">*</span></span>
                        {alunoAge !== null && alunoAge >= 0 && (
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            isAdult ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                          }`}>
                            {alunoAge} {alunoAge === 1 ? "ano" : "anos"} · {isAdult ? "Maior de idade" : "Menor de idade"}
                          </span>
                        )}
                      </label>
                      <input
                        name="aluno_nascimento"
                        value={formData.aluno_nascimento}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        maxLength={10}
                        placeholder="DD/MM/AAAA"
                        className={getInputClass("aluno_nascimento")}
                      />
                      {(touched.aluno_nascimento || submitAttempted) && errors.aluno_nascimento && (
                        <p className="text-red-600 text-xs font-medium mt-1.5 flex items-center gap-1">
                          <AlertCircle size={13} /> {errors.aluno_nascimento}
                        </p>
                      )}
                    </div>

                    {/* Sexo */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Sexo <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="aluno_sexo"
                        value={formData.aluno_sexo}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={getInputClass("aluno_sexo")}
                      >
                        <option value="">Selecione...</option>
                        <option value="Feminino">Feminino</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Outro">Outro</option>
                        <option value="Prefiro não informar">Prefiro não informar</option>
                      </select>
                      {(touched.aluno_sexo || submitAttempted) && errors.aluno_sexo && (
                        <p className="text-red-600 text-xs font-medium mt-1.5 flex items-center gap-1">
                          <AlertCircle size={13} /> {errors.aluno_sexo}
                        </p>
                      )}
                    </div>

                    {/* CPF do Aluno */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        CPF do aluno {isAdult ? <span className="text-red-500">*</span> : <span className="text-gray-400 font-normal">(opcional para menores)</span>}
                      </label>
                      <input
                        name="aluno_cpf"
                        value={formData.aluno_cpf}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        maxLength={14}
                        placeholder="000.000.000-00"
                        className={getInputClass("aluno_cpf")}
                      />
                      {(touched.aluno_cpf || submitAttempted) && errors.aluno_cpf && (
                        <p className="text-red-600 text-xs font-medium mt-1.5 flex items-center gap-1">
                          <AlertCircle size={13} /> {errors.aluno_cpf}
                        </p>
                      )}
                    </div>

                    {/* Escola / Instituição */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Escola / Instituição de ensino <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="aluno_escola"
                        value={formData.aluno_escola}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Nome da escola ou 'Não estuda'"
                        className={getInputClass("aluno_escola")}
                      />
                      {(touched.aluno_escola || submitAttempted) && errors.aluno_escola && (
                        <p className="text-red-600 text-xs font-medium mt-1.5 flex items-center gap-1">
                          <AlertCircle size={13} /> {errors.aluno_escola}
                        </p>
                      )}
                    </div>

                    {/* Experiência Prévia */}
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Possui experiência prévia em desenho? <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2.5">
                        {["Nenhuma", "Um pouco", "Sim, tenho prática"].map((v) => {
                          const isSelected = formData.aluno_experiencia === v;
                          return (
                            <button
                              key={v}
                              type="button"
                              onClick={() => handleExperiencia(v)}
                              className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                                isSelected
                                  ? "border-amber-500 bg-amber-50 text-amber-900 shadow-sm"
                                  : "border-gray-200 bg-gray-50 text-gray-600 hover:border-amber-300"
                              }`}
                            >
                              {v}
                            </button>
                          );
                        })}
                      </div>
                      {(touched.aluno_experiencia || submitAttempted) && errors.aluno_experiencia && (
                        <p className="text-red-600 text-xs font-medium mt-2 flex items-center gap-1">
                          <AlertCircle size={13} /> {errors.aluno_experiencia}
                        </p>
                      )}
                    </div>

                    {/* Observações / Necessidades */}
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Necessidades especiais ou observações <span className="text-gray-400 font-normal">(opcional)</span>
                      </label>
                      <textarea
                        name="aluno_necessidades"
                        value={formData.aluno_necessidades}
                        onChange={handleChange}
                        rows={2}
                        placeholder="Alergias a materiais, laudos, restrições..."
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 focus:bg-white resize-none transition-colors"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ==================================================== */}
              {/* Passo 1: Responsável Legal (Menor) OU Contato (Adulto) */}
              {/* ==================================================== */}
              {step === 1 && (
                <div>
                  {isAdult ? (
                    <div className="mb-5 p-4 bg-purple-50 border border-purple-200 rounded-xl flex items-center gap-3">
                      <UserCheck size={20} className="text-purple-600 shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-purple-950">Aluno Maior de Idade (18+ anos)</p>
                        <p className="text-xs text-purple-700">
                          Como você é maior de idade, os dados de identificação foram atribuídos a você mesmo como responsável. Preencha abaixo seus dados de contato e endereço.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-5">
                      <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl text-[#1C1300] mb-1">
                        Dados do responsável legal
                      </h2>
                      <p className="text-xs text-gray-400">
                        Como o aluno é menor de idade ({alunoAge !== null ? `${alunoAge} anos` : "menor de 18"}), é obrigatório informar os dados do responsável legal. O CPF do responsável não pode ser igual ao do aluno.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-5">
                    {/* Nome do Responsável (Apenas se menor; se adulto já vem preenchido) */}
                    {isMinor ? (
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                          Nome completo do responsável <span className="text-red-500">*</span>
                        </label>
                        <input
                          name="resp_nome"
                          value={formData.resp_nome}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          placeholder="Nome e sobrenome do responsável legal"
                          className={getInputClass("resp_nome")}
                        />
                        {(touched.resp_nome || submitAttempted) && errors.resp_nome && (
                          <p className="text-red-600 text-xs font-medium mt-1.5 flex items-center gap-1">
                            <AlertCircle size={13} /> {errors.resp_nome}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="col-span-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                        <p className="text-xs font-semibold text-gray-700">Nome do Titular/Responsável:</p>
                        <p className="text-sm font-bold text-gray-900">{formData.aluno_nome || "Aluno Adulto"}</p>
                      </div>
                    )}

                    {/* CPF do Responsável / Titular */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        {isMinor ? "CPF do responsável legal" : "CPF do titular"} <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="resp_cpf"
                        value={formData.resp_cpf}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        maxLength={14}
                        placeholder="000.000.000-00"
                        className={getInputClass("resp_cpf")}
                      />
                      {(touched.resp_cpf || submitAttempted) && errors.resp_cpf && (
                        <p className="text-red-600 text-xs font-medium mt-1.5 flex items-center gap-1">
                          <AlertCircle size={13} /> {errors.resp_cpf}
                        </p>
                      )}
                    </div>

                    {/* RG */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        {isMinor ? "RG do responsável" : "RG do aluno titular"} <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="resp_rg"
                        value={formData.resp_rg}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        maxLength={20}
                        placeholder="Número do documento"
                        className={getInputClass("resp_rg")}
                      />
                      {(touched.resp_rg || submitAttempted) && errors.resp_rg && (
                        <p className="text-red-600 text-xs font-medium mt-1.5 flex items-center gap-1">
                          <AlertCircle size={13} /> {errors.resp_rg}
                        </p>
                      )}
                    </div>

                    {/* E-mail */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        E-mail de contato <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="resp_email"
                        value={formData.resp_email}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="exemplo@dominio.com"
                        className={getInputClass("resp_email")}
                      />
                      {(touched.resp_email || submitAttempted) && errors.resp_email && (
                        <p className="text-red-600 text-xs font-medium mt-1.5 flex items-center gap-1">
                          <AlertCircle size={13} /> {errors.resp_email}
                        </p>
                      )}
                    </div>

                    {/* Telefone */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Telefone / WhatsApp com DDD <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="resp_telefone"
                        value={formData.resp_telefone}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        maxLength={15}
                        placeholder="(53) 99999-0000"
                        className={getInputClass("resp_telefone")}
                      />
                      {(touched.resp_telefone || submitAttempted) && errors.resp_telefone && (
                        <p className="text-red-600 text-xs font-medium mt-1.5 flex items-center gap-1">
                          <AlertCircle size={13} /> {errors.resp_telefone}
                        </p>
                      )}
                    </div>

                    {/* CEP (com proteção contra esquecimento do erro) */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center justify-between">
                        <span>CEP <span className="text-red-500">*</span></span>
                        {loadingCep && (
                          <span className="text-amber-600 text-[11px] font-normal flex items-center gap-1">
                            <Loader2 size={11} className="animate-spin" /> Buscando endereço...
                          </span>
                        )}
                        {cepSuccessMsg && !loadingCep && (
                          <span className="text-emerald-600 text-[11px] font-normal">
                            ✓ {cepSuccessMsg}
                          </span>
                        )}
                      </label>
                      <input
                        name="resp_cep"
                        value={formData.resp_cep}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        maxLength={9}
                        placeholder="96400-000"
                        className={getInputClass("resp_cep")}
                      />
                      {(touched.resp_cep || submitAttempted) && errors.resp_cep && (
                        <p className="text-red-600 text-xs font-medium mt-1.5 flex items-center gap-1">
                          <AlertCircle size={13} /> {errors.resp_cep}
                        </p>
                      )}
                    </div>

                    {/* Bairro / Cidade */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Bairro / Cidade <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="resp_bairro"
                        value={formData.resp_bairro}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Ex: Centro, Bagé - RS"
                        className={getInputClass("resp_bairro")}
                      />
                      {(touched.resp_bairro || submitAttempted) && errors.resp_bairro && (
                        <p className="text-red-600 text-xs font-medium mt-1.5 flex items-center gap-1">
                          <AlertCircle size={13} /> {errors.resp_bairro}
                        </p>
                      )}
                    </div>

                    {/* Endereço */}
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Endereço completo (Rua, número, complemento) <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="resp_endereco"
                        value={formData.resp_endereco}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Rua Marechal Floriano, 123, Apto 4"
                        className={getInputClass("resp_endereco")}
                      />
                      {(touched.resp_endereco || submitAttempted) && errors.resp_endereco && (
                        <p className="text-red-600 text-xs font-medium mt-1.5 flex items-center gap-1">
                          <AlertCircle size={13} /> {errors.resp_endereco}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ==================================================== */}
              {/* Passo 2: Escolha da Turma (com Faixa Etária)         */}
              {/* ==================================================== */}
              {step === 2 && (
                <div>
                  <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl text-[#1C1300] mb-1">
                    Escolha da turma
                  </h2>
                  <p className="text-xs text-gray-400 mb-4">
                    Selecione a turma correspondente. Apenas turmas compatíveis com a idade do aluno ({alunoAge !== null ? `${alunoAge} anos` : "idade informada"}) são permitidas.
                  </p>

                  {(touched.turma_id || submitAttempted) && errors.turma_id && (
                    <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-xs font-semibold">
                      <AlertCircle size={16} className="shrink-0" />
                      <span>{errors.turma_id}</span>
                    </div>
                  )}

                  {loadingTurmas && (
                    <div className="py-8 flex flex-col items-center justify-center text-gray-400 gap-2">
                      <Loader2 size={24} className="animate-spin text-amber-500" />
                      <p className="text-xs">Carregando turmas disponíveis...</p>
                    </div>
                  )}

                  <div className="space-y-3 mb-6">
                    {turmasDb.map((t) => {
                      const isFull = t.capacidade <= 0;
                      const isSelected = formData.turma_id === t.id;

                      const minAge = t.idade_minima != null ? Number(t.idade_minima) : extractAgeRange(t.nome).idade_minima;
                      const maxAge = t.idade_maxima != null ? Number(t.idade_maxima) : extractAgeRange(t.nome).idade_maxima;
                      const isAgeCompatible = alunoAge !== null ? (alunoAge >= minAge && alunoAge <= maxAge) : true;

                      return (
                        <button
                          key={t.id}
                          type="button"
                          disabled={!isAgeCompatible}
                          onClick={() => {
                            if (!isAgeCompatible) return;
                            setFormData((prev) => ({ ...prev, turma_id: t.id }));
                            setTouched((prev) => ({ ...prev, turma_id: true }));
                            setErrors((prev) => {
                              const next = { ...prev };
                              delete next.turma_id;
                              return next;
                            });
                          }}
                          className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4 ${
                            !isAgeCompatible
                              ? "opacity-50 border-gray-200 bg-gray-100/60 cursor-not-allowed"
                              : isSelected
                              ? "border-amber-500 bg-amber-50 shadow-sm cursor-pointer"
                              : "border-gray-200 hover:border-amber-200 bg-white cursor-pointer"
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${
                              !isAgeCompatible
                                ? "bg-gray-200 text-gray-400"
                                : isSelected
                                ? "bg-amber-500 text-white"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            <Pencil size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <p className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-sm text-[#1C1300]">
                                {t.nome}
                              </p>
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                {t.turno}
                              </span>
                              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                isAgeCompatible ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"
                              }`}>
                                Faixa etária: {minAge} a {maxAge} anos
                              </span>
                            </div>
                            <SpotBar spots={t.capacidade} total={Math.max(t.capacidade, 15)} />
                          </div>

                          {!isAgeCompatible && (
                            <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap flex-shrink-0">
                              Idade incompatível
                            </span>
                          )}

                          {isAgeCompatible && isFull && (
                            <span className="text-xs text-amber-700 bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap flex-shrink-0">
                              → Fila de espera
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ==================================================== */}
              {/* Passo 3: Confirmação e Revisão                      */}
              {/* ==================================================== */}
              {step === 3 && (
                <div>
                  <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl text-[#1C1300] mb-2">
                    Revisão da inscrição
                  </h2>
                  <p className="text-gray-500 text-sm mb-6">
                    Confira todos os dados informados antes de confirmar. Ao finalizar, você retornará para a página inicial.
                  </p>

                  <div className="space-y-3.5">
                    {/* Aluno */}
                    <div className="rounded-xl border border-green-200 bg-green-50/50 p-4.5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle size={17} className="text-green-600" />
                          <span className="font-semibold text-sm text-gray-800">Dados do Aluno</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setStep(0)}
                          className="text-xs font-semibold text-amber-600 hover:text-amber-700 underline cursor-pointer"
                        >
                          Editar
                        </button>
                      </div>
                      <ul className="ml-6 space-y-1 text-xs text-gray-600">
                        <li><strong>Nome do aluno:</strong> {formData.aluno_nome}</li>
                        <li><strong>Data de nascimento:</strong> {formData.aluno_nascimento} ({alunoAge} anos)</li>
                        <li><strong>Sexo:</strong> {formData.aluno_sexo}</li>
                        {formData.aluno_cpf && <li><strong>CPF:</strong> {formData.aluno_cpf}</li>}
                        <li><strong>Escola:</strong> {formData.aluno_escola}</li>
                        <li><strong>Experiência:</strong> {formData.aluno_experiencia}</li>
                        {formData.aluno_necessidades && <li><strong>Observações:</strong> {formData.aluno_necessidades}</li>}
                      </ul>
                    </div>

                    {/* Responsável / Contato */}
                    <div className="rounded-xl border border-green-200 bg-green-50/50 p-4.5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle size={17} className="text-green-600" />
                          <span className="font-semibold text-sm text-gray-800">
                            {isAdult ? "Titular e Contato" : "Responsável Legal"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="text-xs font-semibold text-amber-600 hover:text-amber-700 underline cursor-pointer"
                        >
                          Editar
                        </button>
                      </div>
                      <ul className="ml-6 space-y-1 text-xs text-gray-600">
                        <li><strong>Nome:</strong> {isAdult ? formData.aluno_nome : formData.resp_nome}</li>
                        <li><strong>CPF:</strong> {formData.resp_cpf || formData.aluno_cpf} | <strong>RG:</strong> {formData.resp_rg}</li>
                        <li><strong>Contato:</strong> {formData.resp_telefone} | {formData.resp_email}</li>
                        <li><strong>Endereço:</strong> {formData.resp_endereco} - {formData.resp_bairro} (CEP: {formData.resp_cep})</li>
                      </ul>
                    </div>

                    {/* Turma */}
                    <div className="rounded-xl border border-green-200 bg-green-50/50 p-4.5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle size={17} className="text-green-600" />
                          <span className="font-semibold text-sm text-gray-800">Turma Escolhida</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          className="text-xs font-semibold text-amber-600 hover:text-amber-700 underline cursor-pointer"
                        >
                          Alterar turma
                        </button>
                      </div>
                      {selectedTurma && (
                        <div className="ml-6 text-xs text-gray-600">
                          <p className="font-bold text-gray-800 text-sm">{selectedTurma.nome} ({selectedTurma.turno})</p>
                          <p className="mt-0.5">
                            {selectedTurma.capacidade > 0
                              ? `Vagas imediatas disponíveis: ${selectedTurma.capacidade}`
                              : "Sem vagas imediatas — Entrará na fila de espera prioritária"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="mt-5 text-xs text-gray-500 bg-gray-50 rounded-xl p-4 leading-relaxed border border-gray-100">
                    Ao confirmar a inscrição, você declara que as informações são verídicas e concorda com as normas do Centro de Desenvolvimento da Expressão Odessa Macedo.
                  </p>
                </div>
              )}
            </div>

            {/* Navegação Inferior */}
            <div className="flex items-center justify-between mt-6">
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1) as FormStep)}
                disabled={step === 0 || loading}
                className="px-6 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:border-gray-300 disabled:opacity-40 transition-colors cursor-pointer"
              >
                Voltar
              </button>
              <div className="flex items-center gap-3">
                {step < 3 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-6 py-2.5 text-sm font-semibold text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
                  >
                    Próxima etapa <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="px-6 py-2.5 text-sm font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Confirmando inscrição...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={16} />
                        {selectedTurma?.capacidade === 0 ? "Confirmar entrada na fila" : "Confirmar matrícula"}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Preview lateral */}
          <div className="w-64 flex-shrink-0 hidden lg:block">
            <div className="sticky top-24">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Resumo</p>
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-amber-100">
                <div className="h-24 bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <Pencil size={32} className="text-white/60" />
                </div>
                <div className="p-4">
                  <p className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[#1C1300] text-sm mb-0.5">
                    {formData.aluno_nome || "Novo Aluno"}
                  </p>
                  <p className="text-xs text-gray-400 mb-3">
                    {formData.aluno_nascimento || "Data não informada"} {alunoAge !== null && `(${alunoAge} anos)`}
                  </p>

                  {selectedTurma && (
                    <div className="mb-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                      <p className="text-xs font-bold text-amber-800">{selectedTurma.nome}</p>
                      <p className="text-xs text-amber-600 mt-0.5">{selectedTurma.turno}</p>
                      {selectedTurma.capacidade <= 0 && (
                        <p className="text-xs font-bold text-amber-700 mt-1.5 flex items-center gap-1">
                          ⚠ Fila de espera
                        </p>
                      )}
                    </div>
                  )}

                  <div
                    className={`w-full h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold ${
                      step === 3 ? "bg-green-500" : "bg-gray-300"
                    }`}
                  >
                    {step === 3 ? "Pronto para confirmar" : `Etapa ${step + 1} de 4`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
