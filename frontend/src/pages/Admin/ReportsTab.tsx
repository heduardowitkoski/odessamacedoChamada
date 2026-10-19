import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  AlertTriangle, BarChart2, Clock, Download, FileSpreadsheet, FileText, Loader2, RefreshCw, Users,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "https://odessamacedochamada.onrender.com";

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-lg text-[#1C1300]">
            Relatórios e Indicadores
          </h2>
          <p className="text-xs text-gray-500">
            Acompanhe a frequência por turma e exporte relatórios em CSV ou PDF.
          </p>
        </div>
        <button
          onClick={carregarResumo}
          className="flex items-center gap-2 text-xs text-gray-600 font-semibold border border-gray-200 rounded-xl px-3 py-2 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={14} className={carregando ? "animate-spin" : ""} /> Atualizar
        </button>
      </div>

      {erro && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl px-5 py-4">
          {erro}
        </div>
      )}

      <div className="grid grid-cols-4 gap-5">
        {cards.map(({ label, value, icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl p-5 border border-amber-50 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center ${color}`}>{icon}</div>
            <div>
              <p className="text-2xl font-['Plus_Jakarta_Sans',sans-serif] font-extrabold text-[#1C1300]">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-amber-50 shadow-sm p-6">
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
              <BarChart data={dadosGrafico} margin={{ top: 8, right: 16, left: -12, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="nome" tick={{ fontSize: 11, fill: "#6B7280" }} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#6B7280" }} unit="%" />
                <Tooltip
                  formatter={(value) => [`${value}%`, "Frequência"]}
                  labelFormatter={(label) => `Turma: ${label}`}
                  contentStyle={{ borderRadius: 12, border: "1px solid #FDE68A", fontSize: 12 }}
                />
                <Bar dataKey="frequencia" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {dadosGrafico.map((entrada) => (
                    <Cell
                      key={entrada.nome}
                      fill={entrada.frequencia >= 75 ? "#F59E0B" : "#DC2626"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {resumo && resumo.turmas.length > 0 && (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-semibold text-gray-400">
                  <th className="px-3 py-2">Turma</th>
                  <th className="px-3 py-2 text-center">Alunos</th>
                  <th className="px-3 py-2 text-center">Aulas</th>
                  <th className="px-3 py-2 text-center">Presenças</th>
                  <th className="px-3 py-2 text-center">Faltas</th>
                  <th className="px-3 py-2 text-center">Justificadas</th>
                  <th className="px-3 py-2 text-center">Frequência</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {resumo.turmas.map((turma) => (
                  <tr key={turma.turma_id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="px-3 py-3">
                      <p className="font-semibold text-gray-900">{turma.nome}</p>
                      <p className="text-[11px] text-gray-400">{turma.turno}</p>
                    </td>
                    <td className="px-3 py-3 text-center text-gray-600">{turma.totalAlunos}</td>
                    <td className="px-3 py-3 text-center text-gray-600">{turma.totalRegistros}</td>
                    <td className="px-3 py-3 text-center text-emerald-600 font-semibold">{turma.presencas}</td>
                    <td className="px-3 py-3 text-center text-red-600 font-semibold">{turma.faltas}</td>
                    <td className="px-3 py-3 text-center text-amber-600 font-semibold">{turma.justificadas}</td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          turma.frequenciaPercentual >= 75
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {turma.frequenciaPercentual}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-amber-50 shadow-sm p-6">
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
          <div className="border border-gray-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <BarChart2 size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Relatório de Frequência</p>
                <p className="text-[11px] text-gray-500">Presenças, faltas e justificativas por aluno.</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => baixar("frequencias", `/relatorios/frequencias/csv?${filtrosFrequencia()}`, "csv")}
                disabled={baixando !== null}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 hover:bg-emerald-100 transition-colors disabled:opacity-50"
              >
                {baixando === "frequencias" ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />} CSV
              </button>
              <button
                onClick={() => baixar("frequencias", `/relatorios/frequencias/pdf?${filtrosFrequencia()}`, "pdf")}
                disabled={baixando !== null}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                {baixando === "frequencias" ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} PDF
              </button>
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center">
                <Clock size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Lista de Espera</p>
                <p className="text-[11px] text-gray-500">Candidatos aguardando vaga, por ordem de inscrição.</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => baixar("fila_espera", "/relatorios/fila-espera/csv", "csv")}
                disabled={baixando !== null}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 hover:bg-emerald-100 transition-colors disabled:opacity-50"
              >
                {baixando === "fila_espera" ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />} CSV
              </button>
              <button
                onClick={() => baixar("fila_espera", "/relatorios/fila-espera/pdf", "pdf")}
                disabled={baixando !== null}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 hover:bg-red-100 transition-colors disabled:opacity-50"
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
