import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Layout from '@/components/Layout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AdminRoute } from '@/components/AdminRoute'
import { AuthProvider } from '@/hooks/use-auth'
import { FuelProvider } from '@/stores/use-fuel-store'
import Index from '@/pages/Index'
import Requests from '@/pages/Requests'
import Recharges from '@/pages/Recharges'
import Vehicles from '@/pages/Vehicles'
import Drivers from '@/pages/Drivers'
import Reports from '@/pages/Reports'
import CostCenterReport from '@/pages/CostCenterReport'
import DriverReport from '@/pages/DriverReport'
import VehicleReport from '@/pages/VehicleReport'
import Dashboard from '@/pages/Dashboard'
import Users from '@/pages/Users'
import AuditLogs from '@/pages/AuditLogs'
import SmtpSettings from '@/pages/SmtpSettings'
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import RecoverPassword from '@/pages/RecoverPassword'
import ResetPassword from '@/pages/ResetPassword'
import NotFound from '@/pages/NotFound'

const App = () => (
  <AuthProvider>
    <FuelProvider>
      <BrowserRouter basename="/combustivel">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/recuperar-senha" element={<RecoverPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Index />} />
                <Route path="/solicitacoes" element={<Requests />} />
                <Route path="/abastecimentos" element={<Recharges />} />
                <Route path="/veiculos" element={<Vehicles />} />
                <Route path="/motoristas" element={<Drivers />} />
                <Route path="/relatorios" element={<Reports />} />
                <Route path="/relatorios/centro-de-custo" element={<CostCenterReport />} />
                <Route path="/relatorios/por-motorista" element={<DriverReport />} />
                <Route path="/relatorios/por-veiculo" element={<VehicleReport />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route element={<AdminRoute />}>
                  <Route path="/usuarios" element={<Users />} />
                  <Route path="/auditoria" element={<AuditLogs />} />
                  <Route path="/configuracao-smtp" element={<SmtpSettings />} />
                  <Route path="/configuracao" element={<SmtpSettings />} />
                </Route>
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </BrowserRouter>
    </FuelProvider>
  </AuthProvider>
)

export default App
