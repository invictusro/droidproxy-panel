import { useRef } from 'react';

interface CodeInputProps {
  value: string;
  onChange: (code: string) => void;
  onSubmit: (code: string) => void;
  disabled?: boolean;
  length?: number;
}

export function CodeInput({
  value,
  onChange,
  onSubmit,
  disabled,
  length = 6
}: CodeInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(length, '').split('').slice(0, length);

  const focusInput = (index: number) => {
    if (index >= 0 && index < length) {
      inputRefs.current[index]?.focus();
    }
  };

  const handleChange = (index: number, char: string) => {
    if (!/^\d*$/.test(char)) return;

    const newDigits = [...digits];
    newDigits[index] = char.slice(-1);
    // Filter out empty strings to get clean code
    const newCode = newDigits.filter(d => d && d.trim()).join('');
    onChange(newCode);

    if (char && index < length - 1) {
      focusInput(index + 1);
    }

    // Auto-submit when all digits are entered
    if (newCode.length === length) {
      setTimeout(() => onSubmit(newCode), 100);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        focusInput(index - 1);
      }
      const newDigits = [...digits];
      newDigits[index] = '';
      onChange(newDigits.filter(d => d && d.trim()).join(''));
    } else if (e.key === 'ArrowLeft' && index > 0) {
      focusInput(index - 1);
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      focusInput(index + 1);
    } else if (e.key === 'Enter') {
      const currentCode = digits.filter(d => d && d.trim()).join('');
      onSubmit(currentCode);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pastedData) {
      onChange(pastedData);
      focusInput(Math.min(pastedData.length, length - 1));
      if (pastedData.length === length) {
        setTimeout(() => onSubmit(pastedData), 100);
      }
    }
  };

  return (
    <div className="flex justify-center gap-2 sm:gap-3">
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(el) => { inputRefs.current[index] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[index]?.trim() || ''}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          autoComplete="one-time-code"
          className={`
            w-11 h-14 sm:w-12 sm:h-14
            text-center text-2xl font-semibold
            bg-zinc-50 border-2 rounded-xl
            transition-all duration-200
            focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20
            disabled:opacity-50 disabled:cursor-not-allowed
            ${digits[index]?.trim() ? 'border-primary/50 bg-primary/5' : 'border-zinc-200'}
          `}
        />
      ))}
    </div>
  );
}
