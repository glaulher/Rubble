import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Fuel, Loader2, Mail, Lock } from 'lucide-react'
import { toast } from 'sonner'

export default function Signup() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
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
    const { error } = await signUp(email, password)
    setLoading(false)
    if (error) {
      toast.error('Erro ao cadastrar. Este email já pode estar em uso.')
      return
    }
    toast.success('Conta criada com sucesso!')
    navigate('/')
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
          <CardTitle className="text-2xl font-bold">Acesso Centralizado</CardTitle>
          <CardDescription>
            O cadastro e controle de acesso são gerenciados exclusivamente pelo Rubble.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-slate-600">
            Para utilizar o Controle de Combustível, faça login na sua conta do Rubble e acesse pelo menu lateral em <strong>Ferramentas &gt; Controle de Combustível</strong>.
          </p>
          <Button asChild className="w-full">
            <a href="/#/login">Ir para o Rubble</a>
          </Button>
          <p className="text-center text-sm text-slate-500 pt-2">
            <Link to="/login" className="text-primary font-medium hover:underline">
              Voltar ao login direto
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
