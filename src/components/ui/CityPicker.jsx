import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, MapPin, X } from 'lucide-react';
import { geo } from '../../api/endpoints.js';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';

/**
 * Type-ahead for target cities, filtered to the selected country.
 *
 * The list comes from the API (open city data, cached server-side) already
 * ordered biggest-city-first, so typing "nag" offers Nagpur before Nagaon and
 * an empty box offers the places a business would actually target. The size
 * hint on the right is what makes the choice obvious when two names are close.
 */

/** 2405421 -> "2.4M people". Rough on purpose - it is a hint, not a statistic. */
const sizeHint = (population) => {
  if (!population) return null;
  if (population >= 1_000_000) return `${(population / 1_000_000).toFixed(1).replace(/\.0$/, '')}M people`;
  if (population >= 1_000) return `${Math.round(population / 1_000)}K people`;
  return null;
};

export const CityPicker = ({ country, value = [], onChange, max = 20, error }) => {
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef(null);
  const debounced = useDebouncedValue(term, 250);

  const { data, isFetching } = useQuery({
    queryKey: ['cities', country, debounced],
    queryFn: () => geo.cities(country, debounced),
    enabled: Boolean(country) && open,
    staleTime: 10 * 60_000,
    placeholderData: (previous) => previous,
  });

  useEffect(() => {
    const onClick = (e) => {
      if (!boxRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // The API returns { name, population }; tolerate a bare string too so an
  // older cached response cannot break the form.
  const options = (data?.cities ?? [])
    .map((c) => (typeof c === 'string' ? { name: c, population: 0 } : c))
    .filter((c) => c?.name && !value.includes(c.name))
    .slice(0, 8);

  const add = (city) => {
    const name = typeof city === 'string' ? city : city?.name;
    if (!name || value.includes(name) || value.length >= max) return;
    onChange([...value, name]);
    setTerm('');
    setHighlight(0);
  };

  const remove = (city) => onChange(value.filter((c) => c !== city));

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      add(options[highlight] ?? term.trim());
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'Backspace' && !term && value.length) {
      remove(value[value.length - 1]);
    }
  };

  return (
    <div ref={boxRef} className="relative">
      <div
        className={[
          'flex flex-wrap items-center gap-1.5 min-h-[38px] w-full rounded-lg border bg-surface-2 px-2 py-1.5 transition',
          error ? 'border-danger' : 'border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25',
        ].join(' ')}
      >
        {value.map((city) => (
          <span
            key={city}
            className="inline-flex items-center gap-1 rounded-md bg-primary-soft text-primary text-xs px-2 py-1"
          >
            {city}
            <button type="button" onClick={() => remove(city)} aria-label={`Remove ${city}`}>
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          disabled={!country || value.length >= max}
          placeholder={
            !country
              ? 'Pick a country first'
              : value.length >= max
                ? `Maximum ${max} cities`
                : value.length
                  ? 'Add another city'
                  : 'Start typing a city name'
          }
          className="flex-1 min-w-[140px] border-0 bg-transparent px-1 py-0.5 text-sm focus:ring-0 focus:border-0"
        />
        {isFetching && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted mr-1" />}
      </div>

      {open && country && options.length > 0 && (
        <div className="absolute z-30 mt-1 w-full card shadow-lift max-h-60 overflow-y-auto p-1">
          {!term.trim() && (
            <p className="px-2.5 pt-1.5 pb-1 text-[11px] text-muted">Biggest cities first — type to narrow</p>
          )}
          {options.map((city, i) => {
            const hint = sizeHint(city.population);
            return (
              <button
                key={city.name}
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onClick={() => add(city)}
                className={[
                  'w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-sm text-left transition-colors',
                  i === highlight ? 'bg-primary-soft text-primary' : 'text-muted-strong hover:bg-surface-2',
                ].join(' ')}
              >
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{city.name}</span>
                {hint && <span className="ml-auto text-[11px] text-muted shrink-0">{hint}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
