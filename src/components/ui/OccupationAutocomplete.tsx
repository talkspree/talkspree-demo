import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { searchProfessions } from '@/data/professions';

interface OccupationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export function OccupationAutocomplete({
  value,
  onChange,
  placeholder = 'Start typing your occupation...',
  label,
  className = '',
  disabled = false,
}: OccupationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Only search when field is focused and value is being typed
    if (!isFocused || !value || value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Debounce search to avoid too many updates
    debounceTimer.current = setTimeout(() => {
      const results = searchProfessions(value, 8);
      setSuggestions(results);
      setShowSuggestions(results.length > 0 && isFocused);
    }, 150); // 150ms debounce

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [value, isFocused]);

  const handleSelectSuggestion = (profession: string) => {
    onChange(profession);
    setSuggestions([]);
    setShowSuggestions(false);
    setIsFocused(false);
    inputRef.current?.blur();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleInputFocus = () => {
    setIsFocused(true);
    if (suggestions.length > 0 && value.length >= 2) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding to allow click on suggestion
    setTimeout(() => {
      setIsFocused(false);
      setShowSuggestions(false);
    }, 200);
  };

  const clearInput = () => {
    onChange('');
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2 relative">
        {label && <Label htmlFor="occupation">{label}</Label>}
        <div className="relative">
          <Input
            id="occupation"
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder={placeholder}
            className={`pr-10 ${className}`}
            disabled={disabled}
            autoComplete="off"
          />
          {value && !disabled && (
            <button
              type="button"
              onClick={clearInput}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        {/* Inline suggestions as badges */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
            {suggestions.map((profession, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors px-3 py-1.5 text-sm"
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent input blur
                  handleSelectSuggestion(profession);
                }}
              >
                {profession}
              </Badge>
            ))}
          </div>
        )}
      </div>
      
      {/* Helpful hint */}
      {!disabled && value.length > 0 && value.length < 2 && (
        <p className="text-xs text-muted-foreground">
          Type at least 2 characters to see suggestions
        </p>
      )}
      
      {!disabled && isFocused && value.length >= 2 && suggestions.length === 0 && !showSuggestions && (
        <p className="text-xs text-muted-foreground">
          No matching professions found. You can still enter a custom occupation.
        </p>
      )}
    </div>
  );
}

