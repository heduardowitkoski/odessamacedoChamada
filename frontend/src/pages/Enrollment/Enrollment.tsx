import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle, AlertCircle, Pencil, ArrowRight } from "lucide-react";
import { SpotBar } from "../../components/ui/SpotBar";

type FormStep = 0 | 1 | 2 | 3;

interface Turma {
  id: string;
  nome: string;
  turno: string;
  capacidade: number;
}

// Funções Utilitárias de Validação
const validateCPF = (cpf: string): boolean => {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(clean.charAt(i)) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9))) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(clean.charAt(i)) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10))) return false;
  return true;
};

const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

const validatePhone = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 11;
};

const validateBirthDate = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  if (isNaN(d.getTime())) return false;
  if (d > now) return false;
  const age = now.getFullYear() - d.getFullYear();
  if (age > 120) return false;
  return true;
};

// Mascaramento de Entrada
const formatCPF = (val: string) => {
  const v = val.replace(/\D/g, '').slice(0, 11);
  if (v.length <= 3) return v;
  if (v.length <= 6) return `${v.slice(0, 3)}.${v.slice(3)}`;
  if (v.length <= 9) return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6)}`;
  return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}`;
};

const formatPhone = (val: string) => {
  const v = val.replace(/\D/g, '').slice(0, 11);
  if (v.length <= 2) return v ? `(${v}` : '';
  if (v.length <= 7) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
  return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
};

const formatCEP = (val: string) => {
  const v = val.replace(/\D/g, '').slice(0, 8);
  if (v.length <= 5) return v;
  return `${v.slice(0, 5)}-${v.slice(5)}`;
};

export default function EnrollmentScreen() {
  const [step, setStep] = useState<FormStep>(0);
  const [turmasDb, setTurmasDb] = useState<Turma[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  // Estados do Formulário
  const [formData, setFormData] = useState({
    resp_nome: '',
    resp_cpf: '',
    resp_rg: '',
    resp_email: '',
    resp_telefone: '',
    resp_endereco: '',
    resp_cep: '',
    resp_bairro: '',
    aluno_nome: '',
    aluno_nascimento: '',
    aluno_sexo: '',
    aluno_cpf: '',
    aluno_escola: '',
    aluno_experiencia: '',
    aluno_necessidades: '',
    turma_id: ''
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("https://odessamacedochamada.onrender.com/turmas")
      .then(res => res.json())
      .then(data => setTurmasDb(data))
      .catch(err => console.error(err));
  }, []);

  const steps = ["Responsável", "Aluno", "Turma", "Confirmação"];
  const selectedTurma = turmasDb.find((t) => t.id === formData.turma_id);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'resp_cpf' || name === 'aluno_cpf') {
      formattedValue = formatCPF(value);
    } else if (name === 'resp_telefone') {
      formattedValue = formatPhone(value);
    } else if (name === 'resp_cep') {
      formattedValue = formatCEP(value);
    }

    setFormData({ ...formData, [name]: formattedValue });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleExperiencia = (exp: string) => {
    setFormData({ ...formData, aluno_experiencia: exp });
  };

  const validateStep = (currentStep: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 0) {
      if (!formData.resp_nome || formData.resp_nome.trim().length < 3) {
        newErrors.resp_nome = "Informe o nome completo (mínimo 3 letras).";
      }

      if (!formData.resp_cpf) {
        newErrors.resp_cpf = "CPF é obrigatório.";
      } else if (!validateCPF(formData.resp_cpf)) {
        newErrors.resp_cpf = "CPF inválido. Verifique os números digitados.";
      }

      if (!formData.resp_email) {
        newErrors.resp_email = "E-mail é obrigatório.";
      } else if (!validateEmail(formData.resp_email)) {
        newErrors.resp_email = "Informe um e-mail válido (ex: nome@dominio.com).";
      }

      if (!formData.resp_telefone) {
        newErrors.resp_telefone = "Telefone com DDD é obrigatório.";
      } else if (!validatePhone(formData.resp_telefone)) {
        newErrors.resp_telefone = "Telefone inválido (deve conter DDD e 8 ou 9 dígitos).";
      }

      if (!formData.resp_endereco || formData.resp_endereco.trim().length < 4) {
        newErrors.resp_endereco = "Informe seu endereço completo.";
      }

      if (!formData.resp_cep) {
        newErrors.resp_cep = "CEP é obrigatório.";
      } else if (formData.resp_cep.replace(/\D/g, '').length !== 8) {
        newErrors.resp_cep = "CEP deve conter 8 dígitos.";
      }
    }

    if (currentStep === 1) {
      if (!formData.aluno_nome || formData.aluno_nome.trim().length < 3) {
        newErrors.aluno_nome = "Informe o nome completo do aluno.";
      }

      if (!formData.aluno_nascimento) {
        newErrors.aluno_nascimento = "Data de nascimento é obrigatória.";
      } else if (!validateBirthDate(formData.aluno_nascimento)) {
        newErrors.aluno_nascimento = "Data de nascimento inválida ou futura.";
      }

      if (formData.aluno_cpf && !validateCPF(formData.aluno_cpf)) {
        newErrors.aluno_cpf = "CPF do aluno inválido.";
      }
    }

    if (currentStep === 2) {
      if (!formData.turma_id) {
        newErrors.turma_id = "Selecione uma turma para continuar.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep(step)) {
      setStep((s) => Math.min(3, s + 1) as FormStep);
    }
  };

  const handleStepClick = (targetStep: FormStep) => {
    if (targetStep < step) {
      setStep(targetStep);
      return;
    }
    // Para avançar clicando no stepper, deve validar todos os passos anteriores
    for (let s = 0; s < targetStep; s++) {
      if (!validateStep(s)) {
        setStep(s as FormStep);
        return;
      }
    }
    setStep(targetStep);
  };

  const handleSubmit = async () => {
    // Valida todos os passos antes de enviar
    if (!validateStep(0) || !validateStep(1) || !validateStep(2)) {
      alert("Por favor, preencha corretamente todos os campos obrigatórios.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("https://odessamacedochamada.onrender.com/alunos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        alert("Inscrição confirmada com sucesso!");
        navigate("/admin");
      } else {
        const err = await res.json();
        alert("Erro ao confirmar: " + (err.message || "Tente novamente."));
      }
    } catch (e) {
      alert("Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
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
            <Link to="/" className="text-sm text-gray-500 hover:text-gray-900 font-medium">← Voltar ao portal</Link>
          </div>
        </div>
      </header>

      <div className="max-w-[1440px] mx-auto px-8 py-10">
        <div className="mb-7">
          <h1 className="font-['Plus_Jakarta_Sans',sans-serif] text-3xl font-extrabold text-[#1C1300] mb-1">Inscrição nas Aulas de Desenho</h1>
          <p className="text-gray-500 text-sm">Preencha os dados abaixo. Se a turma escolhida não tiver vagas, você será incluído(a) na fila de espera automaticamente.</p>
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
          {/* Form */}
          <div className="flex-1 max-w-3xl">
            {/* Stepper */}
            <div className="flex items-center mb-8">
              {steps.map((s, i) => (
                <div key={s} className="flex items-center">
                  <button onClick={() => handleStepClick(i as FormStep)} className="flex flex-col items-center gap-1.5 cursor-pointer">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      i < step ? "bg-green-500 text-white" : i === step ? "bg-amber-500 text-white shadow-md shadow-amber-200" : "bg-gray-100 text-gray-400"
                    }`}>
                      {i < step ? <CheckCircle size={17} /> : i + 1}
                    </div>
                    <span className={`text-xs font-semibold whitespace-nowrap ${i === step ? "text-amber-700" : "text-gray-400"}`}>{s}</span>
                  </button>
                  {i < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 mb-5 min-w-[40px] ${i < step ? "bg-green-400" : "bg-gray-200"}`} />
                  )}
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-amber-50 shadow-sm p-7">
              {/* Step 0 — Responsável */}
              {step === 0 && (
                <div>
                  <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl text-[#1C1300] mb-1">Dados do responsável</h2>
                  <p className="text-xs text-gray-400 mb-5">Para alunos menores de 18 anos, preencha os dados do responsável legal. Para adultos e melhor idade, preencha seus próprios dados.</p>
                  <div className="grid grid-cols-2 gap-5">
                    {[
                      { label: "Nome completo", name: "resp_nome", placeholder: "Nome do responsável ou próprio aluno (adulto)", col: 2 },
                      { label: "CPF", name: "resp_cpf", placeholder: "000.000.000-00", col: 1 },
                      { label: "RG", name: "resp_rg", placeholder: "0000000000", col: 1 },
                      { label: "E-mail", name: "resp_email", placeholder: "email@exemplo.com", col: 1 },
                      { label: "Telefone / WhatsApp", name: "resp_telefone", placeholder: "(53) 99999-0000", col: 1 },
                      { label: "Endereço", name: "resp_endereco", placeholder: "Rua, número", col: 2 },
                      { label: "CEP", name: "resp_cep", placeholder: "96400-000", col: 1 },
                      { label: "Bairro / Cidade", name: "resp_bairro", placeholder: "Bagé/RS", col: 1 },
                    ].map(({ label, name, placeholder, col }) => {
                      const hasError = !!errors[name];
                      return (
                        <div key={label} className={col === 2 ? "col-span-2" : ""}>
                          <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
                          <input
                            name={name}
                            value={(formData as any)[name]}
                            onChange={handleChange}
                            placeholder={placeholder}
                            className={`w-full h-11 px-4 rounded-xl border text-sm focus:outline-none transition-colors ${
                              hasError
                                ? "border-red-400 bg-red-50/40 focus:ring-2 focus:ring-red-300"
                                : "border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-amber-300"
                            }`}
                          />
                          {hasError && <p className="text-red-500 text-xs font-medium mt-1 flex items-center gap-1"><AlertCircle size={12} /> {errors[name]}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 1 — Aluno */}
              {step === 1 && (
                <div>
                  <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl text-[#1C1300] mb-1">Dados do aluno</h2>
                  <p className="text-xs text-gray-400 mb-5">Preencha os dados de quem vai frequentar as aulas.</p>
                  <div className="grid grid-cols-2 gap-5">
                    {[
                      { label: "Nome completo do aluno", name: "aluno_nome", placeholder: "Nome completo", type: "text", col: 2 },
                      { label: "Data de nascimento", name: "aluno_nascimento", placeholder: "DD/MM/AAAA", type: "date", col: 1 },
                      { label: "Sexo", name: "aluno_sexo", placeholder: "Ex: Masculino, Feminino...", type: "text", col: 1 },
                      { label: "CPF do aluno (se tiver)", name: "aluno_cpf", placeholder: "000.000.000-00", type: "text", col: 1 },
                      { label: "Escola / Instituição de ensino", name: "aluno_escola", placeholder: "Nome da escola", type: "text", col: 1 },
                    ].map(({ label, name, placeholder, type, col }) => {
                      const hasError = !!errors[name];
                      return (
                        <div key={label} className={col === 2 ? "col-span-2" : ""}>
                          <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
                          <input
                            type={type}
                            name={name}
                            value={(formData as any)[name]}
                            onChange={handleChange}
                            placeholder={placeholder}
                            className={`w-full h-11 px-4 rounded-xl border text-sm focus:outline-none transition-colors ${
                              hasError
                                ? "border-red-400 bg-red-50/40 focus:ring-2 focus:ring-red-300"
                                : "border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-amber-300"
                            }`}
                          />
                          {hasError && <p className="text-red-500 text-xs font-medium mt-1 flex items-center gap-1"><AlertCircle size={12} /> {errors[name]}</p>}
                        </div>
                      );
                    })}
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Possui experiência prévia em desenho?</label>
                      <div className="flex gap-2">
                        {["Nenhuma", "Um pouco", "Sim, tenho prática"].map((v) => (
                          <button key={v} onClick={() => handleExperiencia(v)} className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${formData.aluno_experiencia === v ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-600 hover:border-amber-300'}`}>
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Necessidades especiais ou observações</label>
                      <textarea name="aluno_necessidades" value={formData.aluno_necessidades} onChange={handleChange} rows={2} placeholder="Alergias, etc..." className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 focus:bg-white resize-none transition-colors" />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2 — Turma */}
              {step === 2 && (
                <div>
                  <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl text-[#1C1300] mb-1">Escolha da turma</h2>
                  <p className="text-xs text-gray-400 mb-5">Selecione a turma correspondente. Turmas cheias o colocarão na fila.</p>
                  
                  {errors.turma_id && (
                    <p className="text-red-500 text-xs font-medium mb-3 flex items-center gap-1">
                      <AlertCircle size={14} /> {errors.turma_id}
                    </p>
                  )}

                  {turmasDb.length === 0 && <p className="text-sm text-gray-500">Buscando turmas...</p>}
                  
                  <div className="space-y-3 mb-6">
                    {turmasDb.map((t) => {
                      const isFull = t.capacidade <= 0;
                      const isSelected = formData.turma_id === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => {
                            setFormData({ ...formData, turma_id: t.id });
                            if (errors.turma_id) setErrors({ ...errors, turma_id: '' });
                          }}
                          className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4 cursor-pointer ${
                            isSelected
                              ? "border-amber-400 bg-amber-50"
                              : "border-gray-200 hover:border-amber-200 bg-white"
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${isSelected ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-800"}`}>
                            <Pencil size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-sm text-[#1C1300]">{t.nome}</p>
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">{t.turno}</span>
                            </div>
                            <SpotBar spots={t.capacidade} total={Math.max(t.capacidade, 15)} />
                          </div>
                          {isFull && (
                            <span className="text-xs text-amber-700 bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap flex-shrink-0">→ Fila</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {selectedTurma?.capacidade === 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                      <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-amber-900">Esta turma está sem vagas no momento</p>
                        <p className="text-xs text-amber-700 mt-0.5">Ao confirmar, você será incluído(a) na lista de espera. Entraremos em contato assim que surgir uma vaga.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3 — Confirmação */}
              {step === 3 && (
                <div>
                  <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl text-[#1C1300] mb-2">Revisão da inscrição</h2>
                  <p className="text-gray-500 text-sm mb-6">Verifique os dados antes de confirmar.</p>
                  <div className="space-y-3">
                    {[
                      { section: "Responsável", items: [formData.resp_nome, `CPF: ${formData.resp_cpf}`, `Telefone: ${formData.resp_telefone}`, `E-mail: ${formData.resp_email}`], ok: formData.resp_nome && validateCPF(formData.resp_cpf) && validatePhone(formData.resp_telefone) },
                      { section: "Aluno", items: [formData.aluno_nome, `Nascimento: ${formData.aluno_nascimento}`], ok: formData.aluno_nome && validateBirthDate(formData.aluno_nascimento) },
                      { section: "Turma selecionada", items: [
                        selectedTurma ? selectedTurma.nome : "Nenhuma turma selecionada",
                      ].filter(Boolean), ok: !!selectedTurma },
                    ].map(({ section, items, ok }) => (
                      <div key={section} className={`rounded-xl border p-4 ${ok ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                        <div className="flex items-center gap-2 mb-2">
                          {ok ? <CheckCircle size={16} className="text-green-600" /> : <AlertCircle size={16} className="text-red-600" />}
                          <span className="font-semibold text-sm text-gray-800">{section}</span>
                        </div>
                        <ul className="ml-5 space-y-0.5">
                          {items.map((item) => <li key={item} className="text-xs text-gray-600">{item}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <p className="mt-5 text-xs text-gray-500 bg-gray-50 rounded-xl p-4 leading-relaxed">
                    Ao confirmar, você declara que as informações são verdadeiras e concorda com as normas do Centro de Desenvolvimento da Expressão Odessa Macedo.
                  </p>
                </div>
              )}
            </div>

            {/* Navegação */}
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => setStep((s) => Math.max(0, s - 1) as FormStep)}
                disabled={step === 0 || loading}
                className="px-6 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:border-gray-300 disabled:opacity-40 transition-colors"
              >
                Voltar
              </button>
              <div className="flex items-center gap-3">
                {step < 3 ? (
                  <button
                    onClick={handleNextStep}
                    className="px-6 py-2.5 text-sm font-semibold text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
                  >
                    Próxima etapa <ArrowRight size={16} />
                  </button>
                ) : (
                  <button onClick={handleSubmit} disabled={loading} className="px-6 py-2.5 text-sm font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer">
                    {loading ? "Confirmando..." : (
                       <><CheckCircle size={16} /> {selectedTurma?.capacidade === 0 ? "Entrar na fila de espera" : "Confirmar matrícula"}</>
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
                  <p className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[#1C1300] text-sm mb-0.5">{formData.aluno_nome || "Novo Aluno"}</p>
                  <p className="text-xs text-gray-400 mb-3">{formData.aluno_nascimento || "---"}</p>
                  {selectedTurma && (
                    <div className="mb-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                      <p className="text-xs font-bold text-amber-800">{selectedTurma.nome}</p>
                      <p className="text-xs text-amber-600 mt-0.5">{selectedTurma.turno}</p>
                      {selectedTurma.capacidade <= 0 && (
                        <p className="text-xs font-bold text-red-600 mt-1.5">⚠ Entrará na fila</p>
                      )}
                    </div>
                  )}
                  <div className={`w-full h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold ${step === 3 ? "bg-green-500" : "bg-gray-300"}`}>
                    {step === 3 ? "Pronto para confirmar" : "Preenchendo..."}
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
