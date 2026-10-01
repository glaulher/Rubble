import { Button } from '@/components/ui/button'
import { ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export function SortHeader({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('h-auto p-0 font-medium', active && 'text-primary')}
      onClick={onClick}
    >
      {label}
      <ArrowUpDown className="h-3 w-3 ml-1" />
    </Button>
  )
}
