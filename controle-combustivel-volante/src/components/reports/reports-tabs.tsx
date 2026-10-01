import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

const tabs = [
  { name: 'Visão Geral', path: '/relatorios' },
  { name: 'Centro de Custo', path: '/relatorios/centro-de-custo' },
  { name: 'Por Motorista', path: '/relatorios/por-motorista' },
  { name: 'Por Veículo', path: '/relatorios/por-veiculo' },
]

export function ReportsTabs() {
  const location = useLocation()
  return (
    <div className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path
        return (
          <Link
            key={tab.path}
            to={tab.path}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap',
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300',
            )}
          >
            {tab.name}
          </Link>
        )
      })}
    </div>
  )
}
