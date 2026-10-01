import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import {
  getVehicles,
  createVehicle,
  updateVehicle as updateVehicleSvc,
  deleteVehicle as deleteVehicleSvc,
} from '@/services/vehicles'
import {
  getRecharges,
  createRecharge,
  updateRecharge as updateRechargeSvc,
  deleteRecharge as deleteRechargeSvc,
} from '@/services/recharges'
import {
  getFuelRequests,
  createFuelRequest,
  updateFuelRequest,
  deleteFuelRequest as deleteFuelRequestSvc,
  approveFuelRequest as approveFuelRequestSvc,
  rejectFuelRequest as rejectFuelRequestSvc,
} from '@/services/fuel-requests'
import {
  getMaintenanceIntervals,
  createMaintenanceInterval,
  updateMaintenanceInterval as updateMISvc,
} from '@/services/maintenance-intervals'
import {
  getDrivers,
  createDriver,
  updateDriver as updateDriverSvc,
  deleteDriver as deleteDriverSvc,
} from '@/services/drivers'
import { getErrorMessage, extractFieldErrors, type FieldErrors } from '@/lib/pocketbase/errors'

export type Vehicle = {
  id: string
  name: string
  plate: string
  cost_center: string
  driver?: string
  created: string
  updated: string
  user: string
  expand?: {
    driver?: { id: string; name: string }
    user?: { id: string; name: string; email: string }
  }
}
export type Recharge = {
  id: string
  recharge_date: string
  vehicle: string
  driver: string | null
  liters: number
  cost: number
  odometer: number
  km_per_liter: number
  created: string
  updated: string
  user: string
}
export type FuelRequest = {
  id: string
  request_date: string
  vehicle: string
  driver: string | null
  destination: string
  status: string
  rejection_reason?: string
  cost_center?: string
  current_odometer: number | null
  last_refuel_odometer: number | null
  last_refuel_date: string
  photo: string
  created: string
  updated: string
  user: string
}
export type MaintenanceInterval = {
  id: string
  vehicle: string
  task_name: string
  interval_km: number
  last_maintenance_km: number
  last_maintenance_date: string
  cost_center?: string
  created: string
  updated: string
  user: string
}
export type Driver = {
  id: string
  name: string
  created: string
  updated: string
  user?: string | null
  expand?: {
    user?: {
      id: string
      name: string
      email: string
    }
  }
}

type OperationResult = { error: string | null; fieldErrors?: FieldErrors }

interface FuelStoreType {
  vehicles: Vehicle[]
  recharges: Recharge[]
  fuelRequests: FuelRequest[]
  maintenanceIntervals: MaintenanceInterval[]
  drivers: Driver[]
  loading: boolean
  error: string | null
  addVehicle: (data: {
    name: string
    plate: string
    driver?: string
    cost_center?: string
  }) => Promise<OperationResult>
  editVehicle: (
    id: string,
    data: Partial<{ name: string; plate: string; driver?: string; cost_center?: string }>,
  ) => Promise<OperationResult>
  addRecharge: (data: Record<string, unknown>) => Promise<OperationResult>
  editRecharge: (id: string, data: Record<string, unknown>) => Promise<OperationResult>
  addFuelRequest: (data: Record<string, unknown>) => Promise<OperationResult>
  editFuelRequest: (id: string, data: Record<string, unknown>) => Promise<OperationResult>
  updateFuelRequestStatus: (id: string, status: string) => Promise<OperationResult>
  approveFuelRequest: (id: string) => Promise<OperationResult>
  rejectFuelRequest: (id: string, rejectionReason: string) => Promise<OperationResult>
  removeFuelRequest: (id: string) => Promise<OperationResult>
  removeVehicle: (id: string) => Promise<OperationResult>
  removeRecharge: (id: string) => Promise<OperationResult>
  addMaintenanceInterval: (data: Record<string, unknown>) => Promise<OperationResult>
  updateMaintenanceInterval: (id: string, data: Record<string, unknown>) => Promise<OperationResult>
  addDriver: (data: { name: string; user?: string | null }) => Promise<OperationResult>
  editDriver: (id: string, data: { name: string; user?: string | null }) => Promise<OperationResult>
  removeDriver: (id: string) => Promise<OperationResult>
}

const FuelContext = createContext<FuelStoreType | undefined>(undefined)

export const useFuelStore = () => {
  const ctx = useContext(FuelContext)
  if (!ctx) throw new Error('useFuelStore must be used within FuelProvider')
  return ctx
}

const withUser = (data: Record<string, unknown>) => ({ ...data, user: pb.authStore.record?.id })

export const FuelProvider = ({ children }: { children: ReactNode }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [recharges, setRecharges] = useState<Recharge[]>([])
  const [fuelRequests, setFuelRequests] = useState<FuelRequest[]>([])
  const [maintenanceIntervals, setMaintenanceIntervals] = useState<MaintenanceInterval[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const rechargesRef = useRef<Recharge[]>([])
  rechargesRef.current = recharges
  const fuelRequestsRef = useRef<FuelRequest[]>([])
  fuelRequestsRef.current = fuelRequests

  const loadData = useCallback(async () => {
    if (!pb.authStore.isValid) {
      setLoading(false)
      return
    }
    try {
      const [v, r, f, m, d] = await Promise.all([
        getVehicles(),
        getRecharges(),
        getFuelRequests(),
        getMaintenanceIntervals(),
        getDrivers(),
      ])
      setVehicles(v as Vehicle[])
      setRecharges(r as Recharge[])
      setFuelRequests(f as FuelRequest[])
      setMaintenanceIntervals(m as MaintenanceInterval[])
      setDrivers(d as Driver[])
      setError(null)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange(() => {
      if (pb.authStore.isValid) {
        loadData()
      } else {
        setVehicles([])
        setRecharges([])
        setFuelRequests([])
        setMaintenanceIntervals([])
        setDrivers([])
      }
    })
    return () => {
      unsubscribe()
    }
  }, [loadData])

  const reload = useCallback(async (setter: (data: any[]) => void, fn: () => Promise<any[]>) => {
    try {
      setter(await fn())
    } catch {
      /* ignore */
    }
  }, [])

  useRealtime('vehicles', () => reload(setVehicles, getVehicles))
  useRealtime('recharges', () => reload(setRecharges, getRecharges))
  useRealtime('fuel_requests', () => reload(setFuelRequests, getFuelRequests))
  useRealtime('maintenance_intervals', () =>
    reload(setMaintenanceIntervals, getMaintenanceIntervals),
  )
  useRealtime('drivers', () => reload(setDrivers, getDrivers))

  const wrap = (fn: () => Promise<unknown>): Promise<OperationResult> =>
    fn()
      .then(() => ({ error: null }))
      .catch((err) => ({ error: getErrorMessage(err), fieldErrors: extractFieldErrors(err) }))

  const addVehicle = useCallback(
    (data: { name: string; plate: string; driver?: string; cost_center?: string }) =>
      wrap(() => createVehicle(withUser(data))),
    [],
  )
  const editVehicle = useCallback(
    (
      id: string,
      data: Partial<{ name: string; plate: string; driver?: string; cost_center?: string }>,
    ) => wrap(() => updateVehicleSvc(id, data)),
    [],
  )
  const addRecharge = useCallback((data: Record<string, unknown>) => {
    const prev = rechargesRef.current
      .filter((r) => r.vehicle === data.vehicle)
      .sort((a, b) => new Date(b.recharge_date).getTime() - new Date(a.recharge_date).getTime())
    let kmPerLiter = 0
    if (prev[0]?.odometer !== undefined && (data.odometer as number) > prev[0].odometer) {
      kmPerLiter = Number(
        (((data.odometer as number) - prev[0].odometer) / (data.liters as number)).toFixed(2),
      )
    }
    return wrap(() => createRecharge(withUser({ ...data, km_per_liter: kmPerLiter })))
  }, [])
  const editRecharge = useCallback(
    (id: string, data: Record<string, unknown>) => wrap(() => updateRechargeSvc(id, data)),
    [],
  )
  const addFuelRequest = useCallback(
    (data: Record<string, unknown>) =>
      wrap(() => createFuelRequest(withUser({ ...data, status: 'Aberto' }))),
    [],
  )
  const editFuelRequest = useCallback(
    (id: string, data: Record<string, unknown>) => wrap(() => updateFuelRequest(id, data)),
    [],
  )
  const updateFuelRequestStatus = useCallback(
    (id: string, status: string) => wrap(() => updateFuelRequest(id, { status })),
    [],
  )
  const approveFuelRequest = useCallback((id: string) => wrap(() => approveFuelRequestSvc(id)), [])
  const rejectFuelRequest = useCallback(
    (id: string, rejectionReason: string) => wrap(() => rejectFuelRequestSvc(id, rejectionReason)),
    [],
  )
  const removeFuelRequest = useCallback((id: string) => wrap(() => deleteFuelRequestSvc(id)), [])
  const removeRecharge = useCallback((id: string) => wrap(() => deleteRechargeSvc(id)), [])
  const removeVehicle = useCallback(async (id: string) => {
    try {
      const relatedR = rechargesRef.current.filter((r) => r.vehicle === id)
      for (const rec of relatedR) await deleteRechargeSvc(rec.id)
      const relatedF = fuelRequestsRef.current.filter((r) => r.vehicle === id)
      for (const req of relatedF) await deleteFuelRequestSvc(req.id)
      await deleteVehicleSvc(id)
      return { error: null }
    } catch (err) {
      return { error: getErrorMessage(err), fieldErrors: extractFieldErrors(err) }
    }
  }, [])
  const addMaintenanceInterval = useCallback(
    (data: Record<string, unknown>) => wrap(() => createMaintenanceInterval(withUser(data))),
    [],
  )
  const updateMaintenanceInterval = useCallback(
    (id: string, data: Record<string, unknown>) => wrap(() => updateMISvc(id, data)),
    [],
  )
  const addDriver = useCallback((data: { name: string; user?: string | null }) => {
    const payload: Record<string, unknown> = {
      name: data.name,
      user: data.user !== undefined ? data.user : pb.authStore.record?.id,
    }
    return wrap(() => createDriver(payload))
  }, [])
  const editDriver = useCallback((id: string, data: { name: string; user?: string | null }) => {
    const payload: Record<string, unknown> = {
      name: data.name,
    }
    if (data.user !== undefined) {
      payload.user = data.user
    }
    return wrap(() => updateDriverSvc(id, payload))
  }, [])
  const removeDriver = useCallback((id: string) => wrap(() => deleteDriverSvc(id)), [])

  return (
    <FuelContext.Provider
      value={{
        vehicles,
        recharges,
        fuelRequests,
        maintenanceIntervals,
        drivers,
        loading,
        error,
        addVehicle,
        editVehicle,
        addRecharge,
        editRecharge,
        addFuelRequest,
        editFuelRequest,
        updateFuelRequestStatus,
        approveFuelRequest,
        rejectFuelRequest,
        removeFuelRequest,
        removeVehicle,
        removeRecharge,
        addMaintenanceInterval,
        updateMaintenanceInterval,
        addDriver,
        editDriver,
        removeDriver,
      }}
    >
      {children}
    </FuelContext.Provider>
  )
}

export default useFuelStore
