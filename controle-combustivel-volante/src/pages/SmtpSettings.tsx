import { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Mail,
  Server,
  Send,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ShieldAlert,
  Info,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  getSmtpSettings,
  saveSmtpSettings,
  testSmtpConnection,
  type SmtpSettings as SmtpSettingsType,
} from '@/services/smtp'

export default function SmtpSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false)

  // Form states
  const [host, setHost] = useState('')
  const [port, setPort] = useState('587')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [senderAddress, setSenderAddress] = useState('')
  const [senderName, setSenderName] = useState('Controle Combustível Volante')
  const [tls, setTls] = useState(true)
  const [authMethod, setAuthMethod] = useState<'PLAIN' | 'LOGIN'>('PLAIN')

  // Loaded metadata
  const [savedSettings, setSavedSettings] = useState<SmtpSettingsType | null>(null)
  const [testEmail, setTestEmail] = useState('')

  const loadSettings = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getSmtpSettings()
      setSavedSettings(data)
      setHost(data.host || '')
      setPort(data.port ? data.port.toString() : '587')
      setUsername(data.username || '')
      setPassword('') // Never show password, keep input blank
      setSenderAddress(data.sender_address || '')
      setSenderName(data.sender_name || 'Controle Combustível Volante')
      setTls(data.tls !== false)
      setAuthMethod(data.auth_method === 'LOGIN' ? 'LOGIN' : 'PLAIN')
    } catch (err: any) {
      console.error('Erro ao buscar configurações de SMTP:', err)
      toast.error('Não foi possível carregar as configurações de SMTP.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedHost = host.trim()
    const parsedPort = parseInt(port, 10)
    const trimmedSender = senderAddress.trim()

    if (!trimmedHost) {
      toast.error('Informe o servidor/host SMTP.')
      return
    }

    if (isNaN(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
      toast.error('A porta SMTP deve ser um número válido entre 1 e 65535.')
      return
    }

    if (!trimmedSender) {
      toast.error('Informe o email do remetente.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedSender)) {
      toast.error('Informe um email de remetente válido.')
      return
    }

    setSaving(true)
    try {
      const res = await saveSmtpSettings({
        host: trimmedHost,
        port: parsedPort,
        username: username.trim(),
        password: password.trim() ? password : undefined,
        sender_address: trimmedSender,
        sender_name: senderName.trim(),
        tls,
        auth_method: authMethod,
      })

      setSavedSettings(res.data)
      setPassword('') // Clear form password input after save
      toast.success(res.message || 'Configurações de SMTP salvas com sucesso!')
    } catch (err: any) {
      console.error('Erro ao salvar SMTP:', err)
      const errorMsg =
        err?.response?.message ||
        err?.message ||
        'Ocorreu um erro ao salvar as configurações de SMTP.'
      toast.error(errorMsg)
    } finally {
      setSaving(false)
    }
  }

  const handleOpenTestModal = () => {
    if (!host.trim()) {
      toast.error('Preencha o servidor/host SMTP antes de testar.')
      return
    }
    if (!senderAddress.trim()) {
      toast.error('Preencha o email do remetente antes de testar.')
      return
    }
    setIsTestDialogOpen(true)
  }

  const handleSendTestEmail = async () => {
    const trimmedRecipient = testEmail.trim()
    if (!trimmedRecipient) {
      toast.error('Informe o email para onde deseja enviar o teste.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedRecipient)) {
      toast.error('Informe um endereço de email válido.')
      return
    }

    setTesting(true)
    try {
      const res = await testSmtpConnection({
        to: trimmedRecipient,
        host: host.trim(),
        port: parseInt(port, 10) || 587,
        username: username.trim(),
        password: password.trim() ? password : undefined,
        sender_address: senderAddress.trim(),
        sender_name: senderName.trim(),
        tls,
        auth_method: authMethod,
      })

      toast.success(res.message || 'Email de teste enviado com sucesso!')
      setIsTestDialogOpen(false)
    } catch (err: any) {
      console.error('Erro no envio de teste:', err)
      const errorMsg =
        err?.response?.message ||
        err?.message ||
        'Falha no envio do email de teste. Verifique os dados informados.'
      toast.error(errorMsg)
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm text-slate-500 font-medium">
          Carregando configurações de SMTP...
        </span>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Configuração de SMTP
            </h1>
            {savedSettings?.configured ? (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1">
                <CheckCircle2 className="h-3 w-3" /> Configurado
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-amber-700 bg-amber-50 border-amber-200 gap-1"
              >
                <AlertCircle className="h-3 w-3" /> Não Configurado
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Configure o servidor de emails para envio de notificações transacionais de solicitações
            e abastecimento.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadSettings}
            disabled={loading || saving || testing}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" /> Recarregar
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleOpenTestModal}
            className="gap-2"
          >
            <Send className="h-4 w-4 text-primary" /> Testar Envio
          </Button>
        </div>
      </div>

      {/* Info notice */}
      <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-4 flex gap-3 text-sm text-blue-900">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-medium text-blue-950">Envio de Notificações Automáticas</p>
          <p className="text-blue-800 text-xs sm:text-sm">
            Estas credenciais são utilizadas para disparar emails aos administradores quando novas
            solicitações são criadas e aos motoristas quando solicitações são aprovadas ou
            reprovadas.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              Parâmetros do Servidor SMTP
            </CardTitle>
            <CardDescription>
              Insira os dados fornecidos pelo seu provedor de email (Gmail, SendGrid, Mailgun,
              Amazon SES, Outlook, etc.).
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="smtp-host" className="text-slate-700">
                  Servidor / Host <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="smtp-host"
                  placeholder="ex: smtp.gmail.com ou smtp.sendgrid.net"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp-port" className="text-slate-700">
                  Porta <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="smtp-port"
                  type="number"
                  placeholder="587 ou 465"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  min="1"
                  max="65535"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtp-username" className="text-slate-700">
                  Usuário SMTP
                </Label>
                <Input
                  id="smtp-username"
                  placeholder="ex: seu-email@empresa.com ou apikey"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="smtp-password" className="text-slate-700">
                    Senha / Token SMTP
                  </Label>
                  {savedSettings?.has_password && (
                    <span className="text-xs text-emerald-700 flex items-center gap-1 font-medium">
                      <KeyRound className="h-3 w-3" /> Senha configurada
                    </span>
                  )}
                </div>
                <Input
                  id="smtp-password"
                  type="password"
                  placeholder={
                    savedSettings?.has_password
                      ? '•••••••• (deixe em branco para manter a atual)'
                      : 'Digite a senha ou token de app'
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <p className="text-xs text-slate-500">
                  Por motivos de segurança, a senha nunca é exposta de volta na interface.
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" /> Remetente das Mensagens
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sender-address" className="text-slate-700">
                    Email do Remetente (From) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="sender-address"
                    type="email"
                    placeholder="ex: no-reply@suaempresa.com.br"
                    value={senderAddress}
                    onChange={(e) => setSenderAddress(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sender-name" className="text-slate-700">
                    Nome de Exibição do Remetente
                  </Label>
                  <Input
                    id="sender-name"
                    placeholder="ex: Controle Combustível Volante"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-primary" /> Segurança e Autenticação
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="smtp-tls"
                      className="text-sm font-medium text-slate-900 cursor-pointer"
                    >
                      TLS / STARTTLS
                    </Label>
                    <p className="text-xs text-slate-500">
                      Criptografia segura para comunicação com o servidor SMTP (recomendado).
                    </p>
                  </div>
                  <Switch id="smtp-tls" checked={tls} onCheckedChange={setTls} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="auth-method" className="text-slate-700">
                    Método de Autenticação
                  </Label>
                  <Select
                    value={authMethod}
                    onValueChange={(val: 'PLAIN' | 'LOGIN') => setAuthMethod(val)}
                  >
                    <SelectTrigger id="auth-method" className="bg-white">
                      <SelectValue placeholder="Selecione o método" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PLAIN">PLAIN (Padrão)</SelectItem>
                      <SelectItem value="LOGIN">LOGIN</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">
                    A maioria dos servidores modernos aceita o método PLAIN.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 py-4">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              {savedSettings?.updated && (
                <span>
                  Última atualização: {new Date(savedSettings.updated).toLocaleString('pt-BR')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleOpenTestModal}
                disabled={saving || testing}
                className="gap-2 flex-1 sm:flex-initial"
              >
                <Send className="h-4 w-4" />
                Testar Envio
              </Button>
              <Button
                type="submit"
                disabled={saving || testing}
                className="gap-2 flex-1 sm:flex-initial"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Salvar Configurações
                  </>
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </form>

      {/* Test Email Dialog */}
      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Testar Envio de Email
            </DialogTitle>
            <DialogDescription>
              Envie uma mensagem de teste para validar a conectividade e autenticação com o servidor
              SMTP configurado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="test-recipient">Email de Destino</Label>
              <Input
                id="test-recipient"
                type="email"
                placeholder="seu-email@exemplo.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-slate-500">
                O email de teste será enviado a partir de <strong>{senderAddress || '—'}</strong>{' '}
                via{' '}
                <strong>
                  {host}:{port}
                </strong>
                .
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsTestDialogOpen(false)}
              disabled={testing}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSendTestEmail}
              disabled={testing || !testEmail.trim()}
              className="gap-2"
            >
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Enviar Teste
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
