import pb from '@/lib/pocketbase/client'
import { getViewModeFilter } from '@/lib/view-mode'

export type RechargeRecord = {
  id: string
  recharge_date: string
  vehicle: string
  liters: number
  cost: number
  odometer: number
  km_per_liter: number
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

export const getRecharges = () =>
  pb.collection('recharges').getFullList({
    sort: '-recharge_date',
    expand: 'vehicle,driver',
    filter: getViewModeFilter(),
  }) as Promise<RechargeRecord[]>

export const getRecharge = (id: string) =>
  pb.collection('recharges').getOne(id, { expand: 'vehicle,driver' }) as Promise<RechargeRecord>

export const createRecharge = (data: Record<string, unknown>) =>
  pb.collection('recharges').create(data)

export const updateRecharge = (id: string, data: Record<string, unknown>) =>
  pb.collection('recharges').update(id, data)

export const deleteRecharge = (id: string) => pb.collection('recharges').delete(id)
