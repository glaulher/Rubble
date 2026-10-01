import { useState, useRef, useEffect, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export function DriverAutocomplete({
  value,
  onChange,
  drivers,
  placeholder,
}: {
  value: string
  onChange: (id: string) => void
  drivers: { id: string; name: string }[]
  placeholder?: string
}) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const selectedDriver = drivers.find((d) => d.id === value)

  const filtered = useMemo(() => {
    if (!debouncedQuery) return drivers.slice(0, 10)
    const lower = debouncedQuery.toLowerCase()
    return drivers.filter((d) => d.name.toLowerCase().includes(lower)).slice(0, 10)
  }, [debouncedQuery, drivers])

  useEffect(() => {
    if (selectedDriver) setQuery(selectedDriver.name)
    else if (!value) setQuery('')
  }, [selectedDriver, value])

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    },
    [],
  )

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(val)
      setIsOpen(true)
      setHighlightedIndex(-1)
    }, 300)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen || filtered.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((p) => Math.min(p + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((p) => Math.max(p - 1, 0))
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault()
      select(filtered[highlightedIndex])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  function select(d: { id: string; name: string }) {
    onChange(d.id)
    setQuery(d.name)
    setIsOpen(false)
    setDebouncedQuery('')
  }

  function handleClear() {
    onChange('')
    setQuery('')
    setDebouncedQuery('')
    setIsOpen(false)
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className={value ? 'pr-8' : ''}
      />
      {value && !isOpen && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg leading-none"
        >
          ×
        </button>
      )}
      {isOpen && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((d, i) => (
            <div
              key={d.id}
              onMouseDown={(e) => {
                e.preventDefault()
                select(d)
              }}
              onMouseEnter={() => setHighlightedIndex(i)}
              className={cn(
                'px-3 py-2 text-sm cursor-pointer transition-colors',
                i === highlightedIndex ? 'bg-primary/10 text-primary' : 'hover:bg-slate-50',
              )}
            >
              {d.name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
