import React from 'react';

interface DatePickerProps {
  value: string; // formato YYYY-MM-DD
  onChange: (val: string) => void;
  className?: string;
  id?: string;
  name?: string;
  required?: boolean;
  min?: string;
  max?: string;
}

export const DatePickerBR: React.FC<DatePickerProps> = ({
  value,
  onChange,
  className = '',
  id,
  name,
  required = false,
  min,
  max,
}) => {
  // Formata YYYY-MM-DD para DD/MM/AAAA para exibição
  const formatIsoToBr = (iso: string): string => {
    if (!iso) return '';
    const parts = iso.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      if (year && month && day) {
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
      }
    }
    return iso;
  };

  const displayValue = formatIsoToBr(value);

  return (
    /*
     * Estratégia mobile-first:
     * O input nativo type="date" fica sobreposto por cima do texto exibido,
     * completamente transparente (opacity-0), mas com largura/altura reais,
     * assim qualquer toque na área abre o seletor de data nativo do sistema
     * tanto no iOS Safari quanto no Android Chrome.
     */
    <div className={`relative flex items-center ${className}`}>
      {/* Texto de exibição no formato DD/MM/AAAA */}
      <span className="pointer-events-none select-none w-full">
        {displayValue || <span className="text-gray-400">DD/MM/AAAA</span>}
      </span>

      {/* Input nativo sobreposto — recebe os toques e abre o picker nativo */}
      <input
        type="date"
        id={id}
        name={name}
        required={required}
        min={min}
        max={max}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        style={{ WebkitAppearance: 'none' }}
      />
    </div>
  );
};

export default DatePickerBR;
