import React, { useRef } from 'react';

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
  const inputRef = useRef<HTMLInputElement>(null);

  // Formata YYYY-MM-DD → DD/MM/AAAA para exibição
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

  // Abre o picker de data ao clicar em qualquer lugar da área
  const handleClick = () => {
    const el = inputRef.current;
    if (!el) return;
    // showPicker() funciona no desktop (Chrome, Firefox, Edge modernos).
    // No mobile, o próprio clique no input overlay já abre o picker nativo.
    if (typeof (el as any).showPicker === 'function') {
      try {
        (el as any).showPicker();
      } catch {
        el.focus();
      }
    } else {
      el.focus();
    }
  };

  return (
    /*
     * Layout: texto de exibição em DD/MM/AAAA + input nativo invisível sobreposto.
     * - Mobile: o toque cai direto no input overlay (opacity-0), abrindo o picker nativo.
     * - Desktop: o onClick do wrapper chama showPicker() explicitamente.
     */
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
      className={`relative flex items-center cursor-pointer select-none ${className}`}
    >
      {/* Texto exibido em formato brasileiro */}
      <span className="pointer-events-none w-full">
        {displayValue || <span className="text-gray-400">DD/MM/AAAA</span>}
      </span>

      {/* Input nativo transparente — recebe toques no mobile e é acionado via showPicker no desktop */}
      <input
        ref={inputRef}
        type="date"
        id={id}
        name={name}
        required={required}
        min={min}
        max={max}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => e.target.showPicker?.()}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        style={{ WebkitAppearance: 'none' }}
      />
    </div>
  );
};

export default DatePickerBR;
