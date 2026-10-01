import pb from '@/lib/pocketbase/client'
import { getViewModeFilter } from '@/lib/view-mode'

export type MaintenanceIntervalRecord = {
  id: string
  vehicle: string
  task_name: string
  interval_km: number
  last_maintenance_km: number
  last_maintenance_date: string
  user: string
  cost_center: string
  created: string
  updated: string
  expand?: { vehicle?: { id: string; name: string; plate: string } }
}

export const getMaintenanceIntervals = () =>
  pb.collection('maintenance_intervals').getFullList({
    sort: '-created',
    expand: 'vehicle',
    filter: getViewModeFilter(),
  }) as Promise<MaintenanceIntervalRecord[]>

export const createMaintenanceInterval = (data: Record<string, unknown>) =>
  pb.collection('maintenance_intervals').create(data)

export const updateMaintenanceInterval = (id: string, data: Record<string, unknown>) =>
  pb.collection('maintenance_intervals').update(id, data)

export const deleteMaintenanceInterval = (id: string) =>
  pb.collection('maintenance_intervals').delete(id)
