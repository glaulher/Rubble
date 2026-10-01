import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Fuel, Loader2, Lock, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

export default function ResetPassword() {
  const { confirmPasswordReset } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem.')
      return
    }
    if (password.length < 8) {
      toast.error('A senha deve ter no mínimo 8 caracteres.')
      return
    }
    setLoading(true)
    const { error } = await confirmPasswordReset(token, password, confirmPassword)
    setLoading(false)
    if (error) {
      toast.error('Erro ao redefinir senha. O link pode ter expirado.')
      return
    }
    toast.success('Senha redefinida com sucesso!')
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md border-none shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <div className="bg-primary text-primary-foreground p-2.5 rounded-xl">
              <Fuel className="h-7 w-7" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Redefinir Senha</CardTitle>
          <CardDescription>Digite sua nova senha</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Nova Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Confirmar Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading || !token}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Redefinir Senha
            </Button>
            <Link
              to="/login"
              className="flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para login
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
