import { useState, useRef, useEffect, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export function Autocomplete({
  value,
  onChange,
  suggestions,
  placeholder,
  className,
}: {
  value: string
  onChange: (value: string) => void
  suggestions: string[]
  placeholder?: string
  className?: string
}) {
  const [inputValue, setInputValue] = useState(value)
  const [isOpen, setIsOpen] = useState(false)
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    setInputValue(value)
  }, [value])
  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    },
    [],
  )

  const filtered = useMemo(() => {
    if (debouncedQuery.length < 2) return []
    const lower = debouncedQuery.toLowerCase()
    return suggestions.filter((s) => s.toLowerCase().includes(lower)).slice(0, 10)
  }, [debouncedQuery, suggestions])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setInputValue(val)
    onChange(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(val)
      setIsOpen(val.length >= 2)
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

  function select(s: string) {
    setInputValue(s)
    onChange(s)
    setIsOpen(false)
    setDebouncedQuery('')
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
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (debouncedQuery.length >= 2) setIsOpen(true)
        }}
        placeholder={placeholder}
        className={className}
      />
      {isOpen && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((s, i) => (
            <div
              key={s}
              onMouseDown={(e) => {
                e.preventDefault()
                select(s)
              }}
              onMouseEnter={() => setHighlightedIndex(i)}
              className={cn(
                'px-3 py-2 text-sm cursor-pointer transition-colors',
                i === highlightedIndex ? 'bg-primary/10 text-primary' : 'hover:bg-slate-50',
              )}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
