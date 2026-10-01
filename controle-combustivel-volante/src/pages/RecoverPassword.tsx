import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Fuel, Loader2, Mail, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

export default function RecoverPassword() {
  const { requestPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await requestPasswordReset(email)
    setLoading(false)
    if (error) {
      toast.error('Erro ao enviar email de recuperação.')
      return
    }
    toast.success('Email de recuperação enviado')
    setSent(true)
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
          <CardTitle className="text-2xl font-bold">Recuperar Senha</CardTitle>
          <CardDescription>
            {sent
              ? 'Verifique seu email para instruções de recuperação.'
              : 'Digite seu email para receber instruções de recuperação de senha.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Enviar Email
              </Button>
            </form>
          ) : null}
          <Link
            to="/login"
            className="flex items-center justify-center gap-1.5 mt-4 text-sm text-slate-500 hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para login
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
