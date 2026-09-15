import { useState, useEffect, type ChangeEvent, type FocusEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle, AlertCircle, Pencil, ArrowRight, Loader2 } from "lucide-react";
import { SpotBar } from "../../components/ui/SpotBar";

type FormStep = 0 | 1 | 2 | 3;

interface Turma {
  id: string;
  nome: string;
  turno: string;
  capacidade: number;
}

const API_BASE = (import.meta as any).env?.VITE_API_URL || "https://odessamacedochamada.onrender.com";

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

const validateCEP = (cep: string): string | null => {
  const digits = cep.replace(/\D/g, "");
  if (!digits) return "CEP é obrigatório.";
  if (digits.length !== 8) return "CEP deve conter exatamente 8 números.";
  return null;
};

const validateBirthDate = (dateStr: string): string | null => {
  if (!dateStr) return "Data de nascimento é obrigatória.";
  const d = new Date(dateStr);
  const now = new Date();
  if (isNaN(d.getTime())) return "Data de nascimento inválida.";
  if (d > now) return "Data de nascimento não pode ser futura.";

  const diffYears = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  const exactAge = m < 0 || (m === 0 && now.getDate() < d.getDate()) ? diffYears - 1 : diffYears;

  if (exactAge < 3) return "O aluno deve ter no mínimo 3 anos de idade.";
  if (exactAge > 120) return "Data de nascimento inválida (idade máxima 120 anos).";

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

export default function EnrollmentScreen() {
  const [step, setStep] = useState<FormStep>(0);
  const [turmasDb, setTurmasDb] = useState<Turma[]>([]);
  const [loadingTurmas, setLoadingTurmas] = useState(true);
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepSuccessMsg, setCepSuccessMsg] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Estados do Formulário
  const [formData, setFormData] = useState({
    resp_nome: "",
    resp_cpf: "",
    resp_rg: "",
    resp_email: "",
    resp_telefone: "",
    resp_endereco: "",
    resp_cep: "",
    resp_bairro: "",
    aluno_nome: "",
    aluno_nascimento: "",
    aluno_sexo: "",
    aluno_cpf: "",
    aluno_escola: "",
    aluno_experiencia: "",
    aluno_necessidades: "",
    turma_id: ""
  });

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

  const steps = ["Responsável", "Aluno", "Turma", "Confirmação"];
  const selectedTurma = turmasDb.find((t) => t.id === formData.turma_id);

  // Validador individual de campo
  const validateField = (name: string, value: string): string | null => {
    switch (name) {
      case "resp_nome":
        return validateFullName(value);
      case "resp_cpf":
        return validateCPF(value);
      case "resp_rg":
        return validateRG(value);
      case "resp_email":
        return validateEmail(value);
      case "resp_telefone":
        return validatePhone(value);
      case "resp_cep":
        return validateCEP(value);
      case "resp_endereco":
        if (!value.trim()) return "Endereço é obrigatório.";
        if (value.trim().length < 4) return "Endereço deve conter ao menos 4 caracteres.";
        return null;
      case "resp_bairro":
        if (!value.trim()) return "Bairro / Cidade é obrigatório.";
        if (value.trim().length < 2) return "Informe o bairro e a cidade.";
        return null;
      case "aluno_nome":
        return validateFullName(value);
      case "aluno_nascimento":
        return validateBirthDate(value);
      case "aluno_sexo":
        if (!value.trim()) return "Selecione o sexo do aluno.";
        return null;
      case "aluno_cpf":
        if (value.trim()) return validateCPF(value);
        return null;
      case "aluno_escola":
        if (!value.trim()) return "Informe a escola ou instituição de ensino (ou 'Não estuda').";
        if (value.trim().length < 2) return "Nome da escola muito curto.";
        return null;
      case "aluno_experiencia":
        if (!value.trim()) return "Selecione a experiência prévia do aluno.";
        return null;
      case "turma_id":
        if (!value.trim()) return "Selecione uma turma para continuar.";
        return null;
      default:
        return null;
    }
  };

  // Consulta à API pública do ViaCEP
  const searchCepApi = async (cleanCep: string) => {
    if (cleanCep.length !== 8) return;
    setLoadingCep(true);
    setCepSuccessMsg("");

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();

      if (data.erro) {
        setErrors((prev) => ({ ...prev, resp_cep: "CEP não encontrado nos Correios." }));
      } else {
        // Auto-preenche endereço e bairro/cidade
        const autoEndereco = data.logradouro ? data.logradouro : formData.resp_endereco;
        const autoBairro = data.bairro
          ? `${data.bairro}, ${data.localidade} - ${data.uf}`
          : `${data.localidade} - ${data.uf}`;

        setFormData((prev) => ({
          ...prev,
          resp_endereco: autoEndereco,
          resp_bairro: autoBairro
        }));

        // Limpa erros dos campos auto-preenchidos
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

    if (name === "resp_cpf" || name === "aluno_cpf") {
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

    setFormData((prev) => ({ ...prev, [name]: formattedValue }));

    // Se o campo já foi tocado ou há erro, valida em tempo real para remover erro assim que corrigido
    if (touched[name] || errors[name]) {
      const err = validateField(name, formattedValue);
      setErrors((prev) => {
        const next = { ...prev };
        if (err) next[name] = err;
        else delete next[name];
        return next;
      });
    }
  };

  // Ao sair do campo (onBlur)
  const handleBlur = (e: FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));

    const err = validateField(name, value);
    setErrors((prev) => {
      const next = { ...prev };
      if (err) next[name] = err;
      else delete next[name];
      return next;
    });

    if (name === "resp_cep") {
      const clean = value.replace(/\D/g, "");
      if (clean.length === 8 && !errors.resp_cep && !cepSuccessMsg) {
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

    if (targetStep === 0) {
      const fields = [
        "resp_nome",
        "resp_cpf",
        "resp_rg",
        "resp_email",
        "resp_telefone",
        "resp_endereco",
        "resp_cep",
        "resp_bairro"
      ] as const;

      fields.forEach((field) => {
        const err = validateField(field, formData[field]);
        if (err) stepErrors[field] = err;
      });
    }

    if (targetStep === 1) {
      const fields = [
        "aluno_nome",
        "aluno_nascimento",
        "aluno_sexo",
        "aluno_cpf",
        "aluno_escola",
        "aluno_experiencia"
      ] as const;

      fields.forEach((field) => {
        const err = validateField(field, formData[field]);
        if (err) stepErrors[field] = err;
      });
    }

    if (targetStep === 2) {
      const err = validateField("turma_id", formData.turma_id);
      if (err) stepErrors.turma_id = err;
    }

    return stepErrors;
  };

  const markStepTouched = (targetStep: number) => {
    const touchedFields: Record<string, boolean> = {};
    if (targetStep === 0) {
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
    } else if (targetStep === 1) {
      [
        "aluno_nome",
        "aluno_nascimento",
        "aluno_sexo",
        "aluno_cpf",
        "aluno_escola",
        "aluno_experiencia"
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

    setStep((s) => Math.min(3, s + 1) as FormStep);
  };

  const handleStepClick = (targetStep: FormStep) => {
    if (targetStep < step) {
      setStep(targetStep);
      return;
    }

    // Para avançar, todas as etapas anteriores devem estar válidas
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

    // Validação profunda de cada etapa
    const step0Errors = getStepErrors(0);
    if (Object.keys(step0Errors).length > 0) {
      markStepTouched(0);
      setErrors((prev) => ({ ...prev, ...step0Errors }));
      setStep(0);
      alert("Por favor, preencha corretamente os dados do responsável marcados em vermelho.");
      return;
    }

    const step1Errors = getStepErrors(1);
    if (Object.keys(step1Errors).length > 0) {
      markStepTouched(1);
      setErrors((prev) => ({ ...prev, ...step1Errors }));
      setStep(1);
      alert("Por favor, preencha corretamente os dados do aluno marcados em vermelho.");
      return;
    }

    const step2Errors = getStepErrors(2);
    if (Object.keys(step2Errors).length > 0) {
      markStepTouched(2);
      setErrors((prev) => ({ ...prev, ...step2Errors }));
      setStep(2);
      alert("Por favor, selecione uma turma antes de confirmar a inscrição.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/alunos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (res.ok) {
        alert("Inscrição realizada com sucesso!");
        navigate("/admin");
      } else {
        // Se o backend retornou erros específicos de validação
        if (data.errors && Array.isArray(data.errors)) {
          const backendErrors: Record<string, string> = {};
          data.errors.forEach((errItem: { field: string; message: string }) => {
            backendErrors[errItem.field] = errItem.message;
          });
          setErrors((prev) => ({ ...prev, ...backendErrors }));

          // Redireciona para o passo que contém o primeiro erro do backend
          const firstErrField = data.errors[0]?.field;
          if (["resp_nome", "resp_cpf", "resp_rg", "resp_email", "resp_telefone", "resp_endereco", "resp_cep", "resp_bairro"].includes(firstErrField)) {
            setStep(0);
          } else if (["aluno_nome", "aluno_nascimento", "aluno_sexo", "aluno_cpf", "aluno_escola"].includes(firstErrField)) {
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

  // Helper para renderizar classe do input com base no erro
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
            Preencha os dados abaixo com atenção. Todos os campos com <span className="text-red-500 font-bold">*</span> são validados obrigatoriamente.
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
          {/* Form Principal */}
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
              {/* Step 0 — Responsável                                */}
              {/* ==================================================== */}
              {step === 0 && (
                <div>
                  <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl text-[#1C1300] mb-1">
                    Dados do responsável
                  </h2>
                  <p className="text-xs text-gray-400 mb-5">
                    Para alunos menores de 18 anos, preencha os dados do responsável legal. Para adultos e melhor idade, preencha seus próprios dados.
                  </p>

                  <div className="grid grid-cols-2 gap-5">
                    {/* Nome Completo */}
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Nome completo do responsável <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="resp_nome"
                        value={formData.resp_nome}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Nome e sobrenome do responsável ou próprio aluno (adulto)"
                        className={getInputClass("resp_nome")}
                      />
                      {(touched.resp_nome || submitAttempted) && errors.resp_nome && (
                        <p className="text-red-600 text-xs font-medium mt-1.5 flex items-center gap-1">
                          <AlertCircle size={13} /> {errors.resp_nome}
                        </p>
                      )}
                    </div>

                    {/* CPF */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        CPF do responsável <span className="text-red-500">*</span>
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
                        RG do responsável <span className="text-red-500">*</span>
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

                    {/* CEP com busca automática */}
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
                      <div className="relative">
                        <input
                          name="resp_cep"
                          value={formData.resp_cep}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          maxLength={9}
                          placeholder="96400-000"
                          className={getInputClass("resp_cep")}
                        />
                      </div>
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
              {/* Step 1 — Aluno                                      */}
              {/* ==================================================== */}
              {step === 1 && (
                <div>
                  <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl text-[#1C1300] mb-1">
                    Dados do aluno
                  </h2>
                  <p className="text-xs text-gray-400 mb-5">
                    Preencha as informações da pessoa que participará das oficinas de desenho.
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
                        placeholder="Nome e sobrenome do aluno"
                        className={getInputClass("aluno_nome")}
                      />
                      {(touched.aluno_nome || submitAttempted) && errors.aluno_nome && (
                        <p className="text-red-600 text-xs font-medium mt-1.5 flex items-center gap-1">
                          <AlertCircle size={13} /> {errors.aluno_nome}
                        </p>
                      )}
                    </div>

                    {/* Data de Nascimento */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Data de nascimento <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        name="aluno_nascimento"
                        value={formData.aluno_nascimento}
                        onChange={handleChange}
                        onBlur={handleBlur}
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

                    {/* CPF do Aluno (Opcional) */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        CPF do aluno <span className="text-gray-400 font-normal">(opcional)</span>
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

                    {/* Necessidades especiais / observações */}
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Necessidades especiais ou observações de saúde <span className="text-gray-400 font-normal">(opcional)</span>
                      </label>
                      <textarea
                        name="aluno_necessidades"
                        value={formData.aluno_necessidades}
                        onChange={handleChange}
                        rows={2}
                        placeholder="Alergias a materiais, laudos médicos, restrições ou observações relevantes..."
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 focus:bg-white resize-none transition-colors"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ==================================================== */}
              {/* Step 2 — Escolha da Turma                           */}
              {/* ==================================================== */}
              {step === 2 && (
                <div>
                  <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl text-[#1C1300] mb-1">
                    Escolha da turma
                  </h2>
                  <p className="text-xs text-gray-400 mb-4">
                    Selecione a turma desejada. Turmas sem vagas disponíveis encaminharão automaticamente para a fila de espera.
                  </p>

                  {(touched.turma_id || submitAttempted) && errors.turma_id && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-xs font-semibold">
                      <AlertCircle size={16} />
                      <span>{errors.turma_id}</span>
                    </div>
                  )}

                  {loadingTurmas && (
                    <div className="py-8 flex flex-col items-center justify-center text-gray-400 gap-2">
                      <Loader2 size={24} className="animate-spin text-amber-500" />
                      <p className="text-xs">Carregando turmas disponíveis...</p>
                    </div>
                  )}

                  {!loadingTurmas && turmasDb.length === 0 && (
                    <div className="py-8 text-center bg-amber-50/50 rounded-xl border border-amber-100 p-6">
                      <p className="text-sm font-semibold text-amber-900 mb-1">Nenhuma turma encontrada no momento</p>
                      <p className="text-xs text-amber-700">Verifique a conexão ou tente recarregar a página.</p>
                    </div>
                  )}

                  <div className="space-y-3 mb-6">
                    {turmasDb.map((t) => {
                      const isFull = t.capacidade <= 0;
                      const isSelected = formData.turma_id === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, turma_id: t.id }));
                            setTouched((prev) => ({ ...prev, turma_id: true }));
                            setErrors((prev) => {
                              const next = { ...prev };
                              delete next.turma_id;
                              return next;
                            });
                          }}
                          className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4 cursor-pointer ${
                            isSelected
                              ? "border-amber-500 bg-amber-50 shadow-sm"
                              : "border-gray-200 hover:border-amber-200 bg-white"
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${
                              isSelected ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            <Pencil size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-sm text-[#1C1300]">
                                {t.nome}
                              </p>
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                {t.turno}
                              </span>
                            </div>
                            <SpotBar spots={t.capacidade} total={Math.max(t.capacidade, 15)} />
                          </div>
                          {isFull && (
                            <span className="text-xs text-amber-700 bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap flex-shrink-0">
                              → Fila de espera
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {selectedTurma && selectedTurma.capacidade <= 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                      <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-amber-900">Esta turma está sem vagas imediatas</p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          Ao confirmar, a inscrição será cadastrada na lista de espera prioritária e entraremos em contato quando houver vaga.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ==================================================== */}
              {/* Step 3 — Confirmação                                */}
              {/* ==================================================== */}
              {step === 3 && (
                <div>
                  <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl text-[#1C1300] mb-2">
                    Revisão da inscrição
                  </h2>
                  <p className="text-gray-500 text-sm mb-6">
                    Verifique os dados antes de confirmar. Se houver algum campo com inconsistência, você será redirecionado para corrigi-lo.
                  </p>

                  <div className="space-y-3.5">
                    {/* Responsável */}
                    {(() => {
                      const isRespValid = Object.keys(getStepErrors(0)).length === 0;
                      return (
                        <div className={`rounded-xl border p-4.5 ${isRespValid ? "border-green-200 bg-green-50/50" : "border-red-300 bg-red-50/50"}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {isRespValid ? <CheckCircle size={17} className="text-green-600" /> : <AlertCircle size={17} className="text-red-600" />}
                              <span className="font-semibold text-sm text-gray-800">Dados do Responsável</span>
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
                            <li><strong>Nome:</strong> {formData.resp_nome || "Não informado"}</li>
                            <li><strong>CPF:</strong> {formData.resp_cpf || "Não informado"} | <strong>RG:</strong> {formData.resp_rg || "Não informado"}</li>
                            <li><strong>Contato:</strong> {formData.resp_telefone || "Não informado"} | {formData.resp_email || "Não informado"}</li>
                            <li><strong>Endereço:</strong> {formData.resp_endereco || "Não informado"} - {formData.resp_bairro || ""} (CEP: {formData.resp_cep || "---"})</li>
                          </ul>
                          {!isRespValid && (
                            <p className="mt-2 text-xs font-semibold text-red-600 flex items-center gap-1">
                              <AlertCircle size={12} /> Existem campos incompletos ou incorretos nesta seção.
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    {/* Aluno */}
                    {(() => {
                      const isAlunoValid = Object.keys(getStepErrors(1)).length === 0;
                      return (
                        <div className={`rounded-xl border p-4.5 ${isAlunoValid ? "border-green-200 bg-green-50/50" : "border-red-300 bg-red-50/50"}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {isAlunoValid ? <CheckCircle size={17} className="text-green-600" /> : <AlertCircle size={17} className="text-red-600" />}
                              <span className="font-semibold text-sm text-gray-800">Dados do Aluno</span>
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
                            <li><strong>Nome do aluno:</strong> {formData.aluno_nome || "Não informado"}</li>
                            <li><strong>Data de nascimento:</strong> {formData.aluno_nascimento || "Não informada"} | <strong>Sexo:</strong> {formData.aluno_sexo || "Não informado"}</li>
                            {formData.aluno_cpf && <li><strong>CPF do aluno:</strong> {formData.aluno_cpf}</li>}
                            <li><strong>Escola:</strong> {formData.aluno_escola || "Não informada"}</li>
                            <li><strong>Experiência em desenho:</strong> {formData.aluno_experiencia || "Não informada"}</li>
                            {formData.aluno_necessidades && <li><strong>Observações:</strong> {formData.aluno_necessidades}</li>}
                          </ul>
                          {!isAlunoValid && (
                            <p className="mt-2 text-xs font-semibold text-red-600 flex items-center gap-1">
                              <AlertCircle size={12} /> Existem campos incompletos ou incorretos nesta seção.
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    {/* Turma Selecionada */}
                    {(() => {
                      const isTurmaValid = !!selectedTurma;
                      return (
                        <div className={`rounded-xl border p-4.5 ${isTurmaValid ? "border-green-200 bg-green-50/50" : "border-red-300 bg-red-50/50"}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {isTurmaValid ? <CheckCircle size={17} className="text-green-600" /> : <AlertCircle size={17} className="text-red-600" />}
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
                          {selectedTurma ? (
                            <div className="ml-6 text-xs text-gray-600">
                              <p className="font-bold text-gray-800 text-sm">{selectedTurma.nome} ({selectedTurma.turno})</p>
                              <p className="mt-0.5">
                                {selectedTurma.capacidade > 0
                                  ? `Vagas imediatas disponíveis: ${selectedTurma.capacidade}`
                                  : "Sem vagas imediatas — Entrará na fila de espera prioritária"}
                              </p>
                            </div>
                          ) : (
                            <p className="ml-6 text-xs text-red-600 font-semibold">Nenhuma turma selecionada.</p>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <p className="mt-5 text-xs text-gray-500 bg-gray-50 rounded-xl p-4 leading-relaxed border border-gray-100">
                    Ao confirmar a inscrição, você declara que todas as informações prestadas são verídicas e concorda com o regulamento do Centro de Desenvolvimento da Expressão Odessa Macedo.
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
                    {formData.aluno_nascimento || "Data não informada"}
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
