import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  onBlur?: () => void;
  onFocus?: () => void;
}

interface NominatimPlace {
  place_id: number;
  display_name: string;
  type: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    country?: string;
  };
}

export function PlacesAutocomplete({
  value,
  onChange,
  placeholder = 'Enter a city name',
  label,
  className = '',
  onBlur,
  onFocus,
}: PlacesAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<NominatimPlace[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Only search when field is focused and value is being typed
    if (!isFocused || value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Debounce API calls
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      setLoading(true);
      try {
        // Using OpenStreetMap Nominatim API - completely free!
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?` +
          `q=${encodeURIComponent(value)}&` +
          `format=json&` +
          `addressdetails=1&` +
          `limit=5&` +
          `accept-language=en&` +
          `featuretype=city`,
          {
            headers: {
              'Accept': 'application/json',
              // Nominatim requires a User-Agent header
              'User-Agent': 'TalkSpree/1.0'
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          // Filter to only show cities, towns, and villages
          const cityResults = data.filter((place: NominatimPlace) => 
            place.type === 'city' || 
            place.type === 'town' || 
            place.type === 'village' ||
            place.type === 'municipality' ||
            place.address.city ||
            place.address.town ||
            place.address.village
          );
          setSuggestions(cityResults);
          setShowSuggestions(cityResults.length > 0 && isFocused);
        }
      } catch (error) {
        console.error('Error fetching location suggestions:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300); // Wait 300ms after user stops typing

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [value, isFocused]);

  const formatLocation = (place: NominatimPlace): string => {
    const city = place.address.city || 
                 place.address.town || 
                 place.address.village || 
                 place.address.municipality || 
                 '';
    const country = place.address.country || '';
    
    if (city && country) {
      return `${city}, ${country}`;
    }
    
    // Fallback to display_name but try to clean it up
    const parts = place.display_name.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      return `${parts[0]}, ${parts[parts.length - 1]}`;
    }
    
    return place.display_name;
  };

  const handleSelectPlace = (place: NominatimPlace) => {
    const formatted = formatLocation(place);
    onChange(formatted);
    setShowSuggestions(false);
    setSuggestions([]);
    setIsFocused(false);
    inputRef.current?.blur();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow click to register
    setTimeout(() => {
      setIsFocused(false);
      setShowSuggestions(false);
    }, 200);
    if (onBlur) {
      onBlur();
    }
  };

  const handleInputFocus = () => {
    setIsFocused(true);
    if (suggestions.length > 0 && value.length >= 2) {
      setShowSuggestions(true);
    }
    if (onFocus) {
      onFocus();
    }
  };

  return (
    <div className="space-y-2 relative">
      {label && <Label htmlFor="location">{label}</Label>}
      <Input
        id="location"
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={className}
        onBlur={handleInputBlur}
        onFocus={handleInputFocus}
        autoComplete="off"
      />
      
      {loading && (
        <p className="text-xs text-muted-foreground">Searching locations...</p>
      )}
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-card border-2 border-border rounded-xl shadow-lg max-h-60 overflow-auto">
          {suggestions.map((place) => (
            <div
              key={place.place_id}
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent input blur
                handleSelectPlace(place);
              }}
              className="p-3 hover:bg-accent cursor-pointer transition-colors first:rounded-t-xl last:rounded-b-xl"
            >
              <div className="font-medium">{formatLocation(place)}</div>
            </div>
          ))}
        </div>
      )}
      
      {!loading && value.length >= 2 && suggestions.length === 0 && showSuggestions && (
        <p className="text-xs text-muted-foreground">
          No locations found. Try a different search.
        </p>
      )}
    </div>
  );
}

