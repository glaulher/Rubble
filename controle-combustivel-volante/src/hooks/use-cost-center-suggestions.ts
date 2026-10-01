import { useMemo } from 'react'
import useFuelStore from '@/stores/use-fuel-store'

export function useCostCenterSuggestions() {
  const { vehicles, fuelRequests, recharges, maintenanceIntervals } = useFuelStore()
  return useMemo(() => {
    const centers = new Set<string>()
    vehicles.forEach((v: any) => {
      if (v.cost_center) centers.add(v.cost_center)
    })
    fuelRequests.forEach((r: any) => {
      if (r.cost_center) centers.add(r.cost_center)
    })
    recharges.forEach((r: any) => {
      if (r.cost_center) centers.add(r.cost_center)
    })
    maintenanceIntervals.forEach((m: any) => {
      if (m.cost_center) centers.add(m.cost_center)
    })
    return Array.from(centers).sort()
  }, [vehicles, fuelRequests, recharges, maintenanceIntervals])
}
