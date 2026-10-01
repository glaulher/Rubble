import { Link, Outlet, useLocation } from 'react-router-dom'
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import {
  LayoutDashboard,
  Droplets,
  Fuel,
  Car,
  FileBarChart,
  Building2,
  BarChart3,
  Search,
  User,
  Users,
  LogOut,
  ShieldCheck,
  UserCog,
  ScrollText,
  Mail,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import useFuelStore from '@/stores/use-fuel-store'
import { useAuth } from '@/hooks/use-auth'
import { NotificationBell } from '@/components/maintenance/notification-bell'

export default function Layout() {
  const location = useLocation()
  const { fuelRequests } = useFuelStore()
  const { user, signOut, isAdmin, viewMode, setViewMode } = useAuth()

  const pendingCount = (fuelRequests ?? []).filter((r) => r.status === 'Aberto').length

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Solicitações', path: '/solicitacoes', icon: Droplets },
    { name: 'Abastecimentos', path: '/abastecimentos', icon: Fuel },
    { name: 'Veículos', path: '/veiculos', icon: Car },
    { name: 'Motoristas', path: '/motoristas', icon: Users },
    { name: 'Relatórios', path: '/relatorios', icon: FileBarChart },
    { name: 'C. de Custo', path: '/relatorios/centro-de-custo', icon: Building2 },
    { name: 'Consolidado', path: '/dashboard', icon: BarChart3 },
    ...(isAdmin
      ? [
          { name: 'Usuários', path: '/usuarios', icon: UserCog },
          { name: 'Configuração SMTP', path: '/configuracao-smtp', icon: Mail },
          { name: 'Auditoria', path: '/auditoria', icon: ScrollText },
        ]
      : []),
  ]

  return (
    <SidebarProvider>
      <Sidebar className="border-r shadow-sm">
        <SidebarHeader className="py-4">
          <div className="flex items-center gap-2 px-4">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-lg">
              <Fuel className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-primary">Volante</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === item.path}
                      className="transition-colors hover:bg-slate-100"
                    >
                      <Link to={item.path} className="flex items-center gap-3 px-4 py-2">
                        <item.icon className="h-4 w-4" />
                        <span className="font-medium">{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="flex flex-col flex-1 min-h-screen bg-slate-50">
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-4 border-b bg-white/80 px-4 sm:px-6 backdrop-blur-md shadow-sm">
          <SidebarTrigger className="text-slate-500 hover:text-slate-700" />
          <div className="flex flex-1 items-center justify-between">
            <div className="flex-1 max-w-md hidden md:flex items-center relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="search"
                placeholder="Buscar veículos, motoristas..."
                className="w-full bg-slate-100/50 pl-9 border-none focus-visible:ring-1"
              />
            </div>
            <div className="flex items-center gap-4 ml-auto">
              {isAdmin && (
                <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 hidden sm:flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  Administrador
                </Badge>
              )}
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode(viewMode === 'admin' ? 'user' : 'admin')}
                  className={cn(
                    'gap-2',
                    viewMode === 'user' &&
                      'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100',
                  )}
                >
                  {viewMode === 'admin' ? (
                    <>
                      <Eye className="h-4 w-4" />
                      <span className="hidden md:inline">Visualizar como Usuário</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-4 w-4" />
                      <span className="hidden md:inline">Visualizar como Admin</span>
                    </>
                  )}
                </Button>
              )}
              <NotificationBell />
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600 hidden sm:block max-w-[150px] truncate">
                  {user?.email}
                </span>
                <Button variant="ghost" size="icon" className="rounded-full bg-slate-100">
                  <User className="h-5 w-5 text-slate-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-500 hover:text-red-500"
                  onClick={signOut}
                  title="Sair"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 md:p-8 animate-fade-in">
          <Outlet key={viewMode} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
