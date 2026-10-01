import pb from '@/lib/pocketbase/client'
import { getViewModeFilter } from '@/lib/view-mode'

export type VehicleRecord = {
  id: string
  name: string
  plate: string
  user: string
  driver?: string
  cost_center: string
  created: string
  updated: string
  expand?: {
    user?: { id: string; name: string; email: string }
    driver?: { id: string; name: string }
  }
}

export const getVehicles = () =>
  pb.collection('vehicles').getFullList({
    sort: '-created',
    expand: 'driver',
    filter: getViewModeFilter(),
  }) as Promise<VehicleRecord[]>

export const getVehicle = (id: string) =>
  pb.collection('vehicles').getOne(id, { expand: 'driver' }) as Promise<VehicleRecord>

export const createVehicle = (data: Record<string, unknown>) =>
  pb.collection('vehicles').create(data)

export const updateVehicle = (id: string, data: Record<string, unknown>) =>
  pb.collection('vehicles').update(id, data)

export const deleteVehicle = (id: string) => pb.collection('vehicles').delete(id)
