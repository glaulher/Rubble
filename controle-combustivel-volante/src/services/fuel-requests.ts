import pb from '@/lib/pocketbase/client'
import { getViewModeFilter } from '@/lib/view-mode'

export type FuelRequestRecord = {
  id: string
  request_date: string
  vehicle: string
  destination: string
  status: string
  rejection_reason?: string
  current_odometer: number
  last_refuel_odometer: number
  last_refuel_date: string
  photo: string
  user: string
  driver: string
  cost_center: string
  created: string
  updated: string
  expand?: {
    vehicle?: { id: string; name: string; plate: string }
    driver?: { id: string; name: string }
  }
}

export const getFuelRequests = () =>
  pb.collection('fuel_requests').getFullList({
    sort: '-request_date',
    expand: 'vehicle,driver',
    filter: getViewModeFilter(),
  }) as Promise<FuelRequestRecord[]>

export const getFuelRequest = (id: string) =>
  pb
    .collection('fuel_requests')
    .getOne(id, { expand: 'vehicle,driver' }) as Promise<FuelRequestRecord>

export const createFuelRequest = (data: Record<string, unknown>) =>
  pb.collection('fuel_requests').create(data)

export const updateFuelRequest = (id: string, data: Record<string, unknown>) =>
  pb.collection('fuel_requests').update(id, data)

export const deleteFuelRequest = (id: string) => pb.collection('fuel_requests').delete(id)

export const approveFuelRequest = (id: string) =>
  pb.send(`/backend/v1/fuel-requests/${id}/approve`, { method: 'POST' })

export const rejectFuelRequest = (id: string, rejectionReason: string) =>
  pb.send(`/backend/v1/fuel-requests/${id}/reject`, {
    method: 'POST',
    body: { rejection_reason: rejectionReason },
  })

export const getPhotoUrl = (record: { collectionId?: string; id: string; photo?: string }) => {
  if (!record?.photo) return null
  const baseUrl = import.meta.env.VITE_POCKETBASE_URL
  return `${baseUrl}/api/files/${record.collectionId || 'fuel_requests'}/${record.id}/${record.photo}`
}
