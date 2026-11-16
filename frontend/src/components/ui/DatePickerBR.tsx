import React, { useRef } from 'react';
import { Calendar } from 'lucide-react';

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
  const hiddenInputRef = useRef<HTMLInputElement>(null);

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

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 8);
    let formatted = raw;
    if (raw.length > 2 && raw.length <= 4) {
      formatted = `${raw.slice(0, 2)}/${raw.slice(2)}`;
    } else if (raw.length > 4) {
      formatted = `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4)}`;
    }

    // Se completou 8 dígitos (DD/MM/AAAA), propaga no formato ISO YYYY-MM-DD
    if (raw.length === 8) {
      const day = raw.slice(0, 2);
      const month = raw.slice(2, 4);
      const year = raw.slice(4, 8);
      onChange(`${year}-${month}-${day}`);
    } else if (raw.length === 0) {
      onChange('');
    }
  };

  const handleNativeDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const openCalendar = () => {
    if (hiddenInputRef.current) {
      if ('showPicker' in hiddenInputRef.current) {
        try {
          (hiddenInputRef.current as any).showPicker();
        } catch {
          hiddenInputRef.current.focus();
        }
      } else {
        hiddenInputRef.current.focus();
      }
    }
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      <input
        type="text"
        id={id}
        name={name}
        required={required}
        placeholder="DD/MM/AAAA"
        value={displayValue}
        onChange={handleTextChange}
        className="w-full bg-transparent focus:outline-none pr-8 cursor-text"
        maxLength={10}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={openCalendar}
        className="absolute right-2 p-1 text-gray-400 hover:text-amber-600 focus:outline-none transition-colors cursor-pointer"
        title="Abrir calendário"
      >
        <Calendar size={16} />
      </button>

      {/* Input nativo oculto para permitir o uso do seletor gráfico de calendário do navegador */}
      <input
        ref={hiddenInputRef}
        type="date"
        tabIndex={-1}
        min={min}
        max={max}
        value={value || ''}
        onChange={handleNativeDateChange}
        className="absolute opacity-0 pointer-events-none w-0 h-0"
      />
    </div>
  );
};

export default DatePickerBR;

