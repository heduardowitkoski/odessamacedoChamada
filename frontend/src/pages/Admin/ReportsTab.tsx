import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  AlertTriangle, BarChart2, Clock, Download, FileSpreadsheet, FileText, Loader2, RefreshCw, Users,
} from "lucide-react";
import { getApiBase } from "../../lib/api";

const API_BASE = getApiBase();

interface ResumoTurma {
  turma_id: string;
  nome: string;
  turno: string;
  capacidade: number;
  totalAlunos: number;
  totalRegistros: number;
  presencas: number;
  faltas: number;
  justificadas: number;
  frequenciaPercentual: number;
}

interface Resumo {
  geradoEm: string;
  totais: {
    alunosAtivos: number;
    alunosFila: number;
    alunosInativos: number;
    turmas: number;
    totalRegistros: number;
    presencas: number;
    faltas: number;
    justificadas: number;
    frequenciaPercentual: number;
  };
  turmas: ResumoTurma[];
}

interface ReportsTabProps {
  turmas: any[];
  alertasFaltas: any[];
}

export default function ReportsTab({ turmas, alertasFaltas }: ReportsTabProps) {
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [turmaId, setTurmaId] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [baixando, setBaixando] = useState<string | null>(null);

  const carregarResumo = () => {
    setCarregando(true);
    setErro("");
    fetch(`${API_BASE}/relatorios/resumo`)
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao carregar resumo");
        return res.json();
      })
      .then((data) => setResumo(data))
      .catch(() => setErro("Não foi possível carregar os dados do relatório. Verifique a conexão com o servidor."))
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    carregarResumo();
  }, []);

  const dadosGrafico = useMemo(
    () =>
      (resumo?.turmas || []).map((turma) => ({
        nome: turma.nome.replace(/^Turma\s+/i, ""),
        frequencia: turma.frequenciaPercentual,
        faltas: turma.faltas,
        alunos: turma.totalAlunos,
      })),
    [resumo],
  );

  const filtrosFrequencia = () => {
    const params = new URLSearchParams();
    if (turmaId) params.set("turma_id", turmaId);
    if (dataInicio) params.set("data_inicio", dataInicio);
    if (dataFim) params.set("data_fim", dataFim);
    return params.toString();
  };

  const baixar = async (chave: string, caminho: string, extensao: "csv" | "pdf") => {
    setBaixando(chave);
    try {
      const res = await fetch(`${API_BASE}${caminho}`);
      if (!res.ok) throw new Error("Erro ao gerar relatório");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${chave}_${new Date().toISOString().split("T")[0]}.${extensao}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Erro ao exportar relatório. Verifique a conexão com o servidor.");
    } finally {
      setBaixando(null);
    }
  };

  const cards = [
    {
      label: "Frequência média",
      value: `${resumo?.totais.frequenciaPercentual ?? 0}%`,
      icon: <BarChart2 size={20} />,
      color: "text-amber-600",
      bg: "bg-amber-100",
    },
    {
      label: "Aulas registradas",
      value: resumo?.totais.totalRegistros ?? 0,
      icon: <FileText size={20} />,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      label: "Alunos ativos",
      value: resumo?.totais.alunosAtivos ?? 0,
      icon: <Users size={20} />,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    {
      label: "Alunos em risco",
      value: alertasFaltas.length,
      icon: <AlertTriangle size={20} />,
      color: "text-red-600",
      bg: "bg-red-100",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-base sm:text-lg text-[#1C1300]">
            Relatórios e Indicadores
          </h2>
          <p className="text-xs text-gray-500">
            Acompanhe a frequência por turma e exporte relatórios em CSV ou PDF.
          </p>
        </div>
        <button
          onClick={carregarResumo}
          className="self-start sm:self-auto flex items-center gap-2 text-xs text-gray-600 font-semibold border border-gray-200 rounded-xl px-3 py-2 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <RefreshCw size={14} className={carregando ? "animate-spin" : ""} /> Atualizar
        </button>
      </div>

      {erro && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl px-5 py-4">
          {erro}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {cards.map(({ label, value, icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl p-4 sm:p-5 border border-amber-50 shadow-sm flex items-center gap-3 sm:gap-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl shrink-0 ${bg} flex items-center justify-center ${color}`}>{icon}</div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-['Plus_Jakarta_Sans',sans-serif] font-extrabold text-[#1C1300] truncate">{value}</p>
              <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5 truncate">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-amber-50 shadow-sm p-4 sm:p-6">
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
          <div>
            <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-base text-[#1C1300]">
              Frequência por Turma
            </h3>
            <p className="text-xs text-gray-500">
              Percentual de presenças e justificativas sobre o total de aulas registradas.
            </p>
          </div>
        </div>

        {carregando ? (
          <div className="h-64 flex items-center justify-center text-gray-400 text-sm gap-2">
            <Loader2 size={16} className="animate-spin" /> Carregando indicadores...
          </div>
        ) : dadosGrafico.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
            Nenhum dado de frequência registrado ainda.
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosGrafico} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#FEF9EC" />
                <XAxis dataKey="nome" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, "Frequência"]}
                  contentStyle={{ borderRadius: 12, border: "1px solid #FDE68A", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}
                  cursor={{ fill: "#FFFBEB" }}
                />
                <Bar dataKey="frequencia" radius={[6, 6, 0, 0]}>
                  {dadosGrafico.map((entry) => (
                    <Cell
                      key={entry.nome}
                      fill={entry.frequencia >= 75 ? "#10B981" : "#EF4444"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-amber-50 shadow-sm p-4 sm:p-6">
        <div className="mb-5 pb-4 border-b border-gray-100">
          <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-base text-[#1C1300]">
            Exportar Relatórios
          </h3>
          <p className="text-xs text-gray-500">
            Selecione os filtros e baixe os relatórios consolidados para prestação de contas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Turma</label>
            <select
              value={turmaId}
              onChange={(e) => setTurmaId(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
            >
              <option value="">Todas as turmas</option>
              {turmas.map((turma) => (
                <option key={turma.id} value={turma.id}>{turma.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Data inicial</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Data final</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <BarChart2 size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">Relatório de Frequência</p>
                <p className="text-[11px] text-gray-500 truncate">Presenças, faltas e justificativas por aluno.</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => baixar("frequencias", `/relatorios/frequencias/csv?${filtrosFrequencia()}`, "csv")}
                disabled={baixando !== null}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 hover:bg-emerald-100 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {baixando === "frequencias" ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />} CSV
              </button>
              <button
                onClick={() => baixar("frequencias", `/relatorios/frequencias/pdf?${filtrosFrequencia()}`, "pdf")}
                disabled={baixando !== null}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 hover:bg-red-100 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {baixando === "frequencias" ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} PDF
              </button>
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                <Clock size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">Lista de Espera</p>
                <p className="text-[11px] text-gray-500 truncate">Candidatos aguardando vaga, por ordem de inscrição.</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => baixar("fila_espera", "/relatorios/fila-espera/csv", "csv")}
                disabled={baixando !== null}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 hover:bg-emerald-100 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {baixando === "fila_espera" ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />} CSV
              </button>
              <button
                onClick={() => baixar("fila_espera", "/relatorios/fila-espera/pdf", "pdf")}
                disabled={baixando !== null}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 hover:bg-red-100 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {baixando === "fila_espera" ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
