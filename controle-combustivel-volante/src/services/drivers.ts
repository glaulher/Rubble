import pb from '@/lib/pocketbase/client'
import { getViewModeFilter } from '@/lib/view-mode'

export type DriverRecord = {
  id: string
  name: string
  user?: string | null
  created: string
  updated: string
  expand?: {
    user?: {
      id: string
      name: string
      email: string
    }
  }
}

export const getDrivers = () =>
  pb.collection('drivers').getFullList({
    sort: 'name',
    filter: getViewModeFilter(),
    expand: 'user',
  }) as Promise<DriverRecord[]>

export const getDriver = (id: string) =>
  pb.collection('drivers').getOne(id, { expand: 'user' }) as Promise<DriverRecord>

export const createDriver = (data: Record<string, unknown>) => pb.collection('drivers').create(data)

export const updateDriver = (id: string, data: Record<string, unknown>) =>
  pb.collection('drivers').update(id, data)

export const deleteDriver = (id: string) => pb.collection('drivers').delete(id)
