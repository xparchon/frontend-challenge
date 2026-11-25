import { useId, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import axios from 'axios'
import { Link, useNavigate } from '@tanstack/react-router'
import { validateWalletFields, type WalletFieldErrors } from '@/features/account/walletValidation'
import {
  useChangePassword,
  useCreateWallet,
  useDeleteWallet,
  useProfile,
  useUpdateAvatar,
  useUpdateProfile,
  useUpdateWallet,
  useWallets,
} from '@/features/account/useAccountData'
import { useAuth } from '@/features/auth/useAuth'
import type { ApiErrorResponse } from '@/types/api'
import type { Wallet, WalletInput } from '@/types/account'

const primaryButtonClass = 'inline-flex min-h-11 items-center justify-center rounded-md bg-kurio-goldStrong px-5 font-semibold text-kurio-ink hover:bg-kurio-gold disabled:cursor-not-allowed disabled:opacity-60'
const profileFieldClass = 'mt-2 h-12 w-full rounded-md border border-kurio-line bg-transparent px-3 text-sm text-kurio-cream outline-none focus:border-kurio-goldStrong md:h-8 md:rounded-sm'
const marketSearch = { search: '', category: '', network: '', maxPrice: 12.3, sort: 'recent', page: 1 } as const

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message
    if (typeof message === 'string') return message
  }
  return fallback
}

function AccountLogoutButton({ className }: { className: string }) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  return (
    <>
      <button type="button" className={className} onClick={async () => {
        setError('')
        try {
          await logout()
          await navigate({ to: '/login' })
        } catch (logoutError) {
          setError(getErrorMessage(logoutError, 'Não foi possível encerrar a sessão.'))
        }
      }}><svg aria-hidden="true" viewBox="0 0 24 24" className="hidden h-4 w-4 md:block" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" /></svg>Sair</button>
      {error && <span role="alert" className="text-xs text-red-300">{error}</span>}
    </>
  )
}

function AccountSidebar({ active }: { active: 'profile' | 'wallets' }) {
  const links = [
    { key: 'profile', label: 'Dados do perfil', to: '/profile' as const, icon: '♙' },
    { key: 'wallets', label: 'Carteiras', to: '/wallets' as const, icon: '⌖' },
    { key: 'activity', label: 'Atividade', icon: '♧' },
    { key: 'wishlist', label: 'Lista de interesse', icon: '♡' },
    { key: 'offers', label: 'Ofertas', icon: '◉' },
    { key: 'downloads', label: 'Arquivos baixados', icon: '⇩' },
    { key: 'support', label: 'Suporte', icon: '△' },
  ]
  return (
    <aside className="h-[326px] bg-kurio-surface">
      <h2 className="flex h-[35px] items-center px-2.5 font-semibold">Meu perfil</h2>
      <nav aria-label="Navegação do perfil">
        {links.map((item) => {
          const isActive = item.key === active
          const className = `flex h-9 items-center gap-3 border-l-4 px-2.5 text-xs ${isActive ? 'border-kurio-goldStrong bg-kurio-ink/40 text-kurio-goldStrong' : 'border-transparent text-kurio-gold/90 hover:bg-kurio-ink/40'}`
          return item.to ? (
            <Link key={item.label} to={item.to} aria-current={isActive ? 'page' : undefined} className={className}>
              <span aria-hidden="true" className="w-3 text-center text-sm">{item.icon}</span>{item.label}
            </Link>
          ) : <span key={item.label} className={className}><span aria-hidden="true" className="w-3 text-center text-sm">{item.icon}</span>{item.label}</span>
        })}
        <AccountLogoutButton className="flex h-[39px] w-full items-center gap-3 border-t border-kurio-line px-2.5 text-left text-xs text-kurio-goldStrong hover:bg-kurio-ink/40" />
      </nav>
    </aside>
  )
}

function AccountDesktopLayout({ active, children }: { active: 'profile' | 'wallets'; children: ReactNode }) {
  return (
    <div className="mx-auto hidden min-h-[calc(100dvh-72px)] w-[calc(100%-48px)] max-w-[960px] grid-cols-[248px_minmax(0,1fr)] items-start gap-[22px] pb-12 pt-3 md:grid">
      <AccountSidebar active={active} />
      <section className="min-w-0">{children}</section>
    </div>
  )
}

function ProfileField({ label, name, value, type = 'text', required = true }: { label: string; name: string; value: string; type?: string; required?: boolean }) {
  return (
    <label className="block text-xs text-kurio-cream/90">
      {label}{required && <span className="text-kurio-goldStrong">*</span>}
      <input name={name} type={type} defaultValue={value} required={required} className={profileFieldClass} />
    </label>
  )
}

function ProfilePasswordField({ label, name, autoComplete, required = true }: { label: string; name: string; autoComplete: string; required?: boolean }) {
  const [visible, setVisible] = useState(false)
  return (
    <label className="block text-xs text-kurio-cream/90">
      {label}
      <span className="relative block">
        <input name={name} type={visible ? 'text' : 'password'} autoComplete={autoComplete} minLength={name === 'currentPassword' ? undefined : 8} required={required} className={`${profileFieldClass} pr-10`} />
        <button type="button" aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${label.toLowerCase()}`} aria-pressed={visible} onClick={() => setVisible((current) => !current)} className="absolute right-2 top-[calc(50%+4px)] grid h-8 w-8 -translate-y-1/2 place-items-center text-kurio-goldStrong">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            {visible ? <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" /><circle cx="12" cy="12" r="3" /></> : <><path d="m3 3 18 18M10.6 6.2A10.8 10.8 0 0 1 12 6c6.5 0 10 6 10 6a16.7 16.7 0 0 1-3.2 3.8M6.2 6.2C3.5 8 2 12 2 12s3.5 6 10 6a10.7 10.7 0 0 0 3.7-.7" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>}
          </svg>
        </button>
      </span>
    </label>
  )
}

function ProfileAvatarControls({ avatar, compact = false, onChange, onRemove }: {
  avatar: string | null
  compact?: boolean
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void
  onRemove?: () => void
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={`${compact ? 'h-14 w-14' : 'h-10 w-10'} grid shrink-0 place-items-center overflow-hidden rounded-full bg-kurio-ink text-kurio-goldStrong`}>
        {avatar
          ? <img src={avatar} alt="Avatar do perfil" className="h-full w-full object-cover" />
          : <svg aria-hidden="true" viewBox="0 0 24 24" className={compact ? 'h-7 w-7' : 'h-5 w-5'} fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20c.5-3.4 2.8-5.3 6.5-5.3s6 1.9 6.5 5.3" /></svg>}
      </span>
      {!compact && (
        <>
          <label className={`${primaryButtonClass} h-8 min-h-0 cursor-pointer rounded-sm px-4 text-xs`}>
            Alterar
            <input type="file" accept="image/*" onChange={onChange} className="sr-only" aria-label="Selecionar avatar" />
          </label>
          <button type="button" onClick={onRemove} className="px-1 text-xs text-kurio-cream/80">Remover</button>
        </>
      )}
    </div>
  )
}

function getEnsHandle(value: string) {
  return value.replace(/\.eth$/i, '')
}

function getEnsName(values: FormData) {
  const handle = String(values.get('ensName') ?? '').trim()
  const suffix = String(values.get('ensSuffix') ?? '.eth')
  return handle.toLowerCase().endsWith(suffix.toLowerCase()) ? handle : `${handle}${suffix}`
}

function ProfileEnsField({ value }: { value: string }) {
  return (
    <label className="block text-xs text-kurio-cream/90">
      Nome ENS<span className="text-kurio-goldStrong">*</span>
      <span className="flex gap-2">
        <select name="ensSuffix" defaultValue=".eth" aria-label="Sufixo ENS" className={`${profileFieldClass} w-[64px] shrink-0 px-2`}>
          <option value=".eth">.eth</option>
        </select>
        <input name="ensName" defaultValue={getEnsHandle(value)} required className={profileFieldClass} />
      </span>
    </label>
  )
}

function ProfileFormFields({ profile, onAvatarChange, onAvatarRemove, compact = false }: {
  profile: NonNullable<ReturnType<typeof useProfile>['data']>
  onAvatarChange: (event: ChangeEvent<HTMLInputElement>) => void
  onAvatarRemove: () => void
  compact?: boolean
}) {
  return (
    <>
      <ProfileField label="Nome de exibição" name="displayName" value={profile.displayName} />
      <ProfileField label="Nome de usuário" name="username" value={profile.username} />
      <ProfileField label="E-mail" name="email" type="email" value={profile.email} />
      <ProfileEnsField value={profile.ensName} />
      <ProfileField label="Apelido da carteira" name="walletNickname" value={profile.walletNickname} />
      <div>
        <p className="block text-xs text-kurio-cream/90">Avatar</p>
        <div className="mt-2"><ProfileAvatarControls avatar={profile.avatar} compact={compact} onChange={onAvatarChange} onRemove={onAvatarRemove} /></div>
      </div>
    </>
  )
}

export function ProfilePage() {
  const profileQuery = useProfile()
  const updateProfile = useUpdateProfile()
  const updateAvatar = useUpdateAvatar()
  const changePassword = useChangePassword()
  const { session } = useAuth()
  const [profileFeedback, setProfileFeedback] = useState('')
  const [passwordFeedback, setPasswordFeedback] = useState('')
  const [avatarError, setAvatarError] = useState('')
  const profile = profileQuery.data

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setProfileFeedback('')
    const values = new FormData(event.currentTarget)
    try {
      await updateProfile.mutateAsync({
        displayName: String(values.get('displayName') ?? ''),
        username: String(values.get('username') ?? ''),
        email: String(values.get('email') ?? ''),
        ensName: getEnsName(values),
        walletNickname: String(values.get('walletNickname') ?? ''),
      })
      setProfileFeedback('Perfil salvo.')
    } catch (error) {
      setProfileFeedback(getErrorMessage(error, 'Não foi possível salvar o perfil.'))
    }
  }

  const saveDesktopProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setProfileFeedback('')
    setPasswordFeedback('')
    const form = event.currentTarget
    const values = new FormData(form)
    const currentPassword = String(values.get('currentPassword') ?? '')
    const newPassword = String(values.get('newPassword') ?? '')
    const confirmPassword = String(values.get('confirmPassword') ?? '')
    const changingPassword = Boolean(currentPassword || newPassword || confirmPassword)

    if (changingPassword && (!currentPassword || !newPassword || !confirmPassword)) {
      setPasswordFeedback('Preencha os três campos para alterar a senha.')
      return
    }

    try {
      await updateProfile.mutateAsync({
        displayName: String(values.get('displayName') ?? ''),
        username: String(values.get('username') ?? ''),
        email: String(values.get('email') ?? ''),
        ensName: getEnsName(values),
        walletNickname: String(values.get('walletNickname') ?? ''),
      })
      setProfileFeedback('Perfil salvo.')
    } catch (error) {
      setProfileFeedback(getErrorMessage(error, 'Não foi possível salvar o perfil.'))
      return
    }

    if (changingPassword) {
      try {
        await changePassword.mutateAsync({ currentPassword, newPassword, confirmPassword })
        setPasswordFeedback('Senha alterada.')
        form.querySelectorAll<HTMLInputElement>('[name="currentPassword"], [name="newPassword"], [name="confirmPassword"]').forEach((input) => { input.value = '' })
      } catch (error) {
        setPasswordFeedback(getErrorMessage(error, 'Não foi possível alterar a senha.'))
      }
    }
  }

  const savePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPasswordFeedback('')
    const form = event.currentTarget
    const values = new FormData(form)
    try {
      await changePassword.mutateAsync({
        currentPassword: String(values.get('currentPassword') ?? ''),
        newPassword: String(values.get('newPassword') ?? ''),
        confirmPassword: String(values.get('confirmPassword') ?? ''),
      })
      form.reset()
      setPasswordFeedback('Senha alterada.')
    } catch (error) {
      setPasswordFeedback(getErrorMessage(error, 'Não foi possível alterar a senha.'))
    }
  }

  const selectAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) {
      setAvatarError('Selecione uma imagem de até 2 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') return
      setAvatarError('')
      updateAvatar.mutate(reader.result, { onError: (error) => setAvatarError(getErrorMessage(error, 'Não foi possível atualizar o avatar.')) })
    }
    reader.onerror = () => setAvatarError('Não foi possível ler o arquivo selecionado.')
    reader.readAsDataURL(file)
  }

  const removeAvatar = () => {
    setAvatarError('')
    updateAvatar.mutate('', { onError: (error) => setAvatarError(getErrorMessage(error, 'Não foi possível remover o avatar.')) })
  }

  if (profileQuery.isLoading || !profile) {
    const hasError = profileQuery.isError
    const message = hasError ? 'Não foi possível carregar o perfil.' : 'Carregando perfil...'
    return (
      <>
        <AccountDesktopLayout active="profile">
          <p className="text-sm" role={hasError ? 'alert' : 'status'}>{message}</p>
          {hasError && <button type="button" onClick={() => void profileQuery.refetch()} className="mt-3 text-xs underline">Tentar novamente</button>}
        </AccountDesktopLayout>
        <section className="min-h-dvh px-5 pt-8 md:hidden">
          <p role={hasError ? 'alert' : 'status'}>{message}</p>
          {hasError && <button type="button" onClick={() => void profileQuery.refetch()} className="mt-3 text-xs underline">Tentar novamente</button>}
        </section>
      </>
    )
  }

  return (
    <>
      <AccountDesktopLayout active="profile">
        <h1 className="mb-7 text-sm font-semibold">Perfil do colecionador</h1>
        <form key={profile.userId} onSubmit={saveDesktopProfile} className="grid grid-cols-2 gap-x-[22px] gap-y-6">
          <ProfileFormFields profile={profile} onAvatarChange={selectAvatar} onAvatarRemove={removeAvatar} />
          <section className="col-start-1 space-y-4 pt-1">
              <h2 className="font-semibold">Alterar senha</h2>
              <ProfilePasswordField label="Senha atual" name="currentPassword" autoComplete="current-password" required={false} />
              <ProfilePasswordField label="Nova senha" name="newPassword" autoComplete="new-password" required={false} />
              <ProfilePasswordField label="Confirmar nova senha" name="confirmPassword" autoComplete="new-password" required={false} />
              <button type="submit" disabled={updateProfile.isPending || changePassword.isPending} className={`${primaryButtonClass} h-8 min-h-0 w-[104px] rounded-sm text-xs`}>{updateProfile.isPending || changePassword.isPending ? 'Salvando...' : 'Salvar'}</button>
              {profileFeedback && <p role={updateProfile.isError ? 'alert' : 'status'} className="text-xs">{profileFeedback}</p>}
              {passwordFeedback && <p role={changePassword.isError ? 'alert' : 'status'} className="text-xs">{passwordFeedback}</p>}
              {avatarError && <p role="alert" className="text-xs text-red-300">{avatarError}</p>}
          </section>
        </form>
      </AccountDesktopLayout>

      <section className="mx-auto min-h-dvh w-full max-w-lg bg-kurio-ink px-5 pb-8 pt-5 md:hidden">
        <header className="flex items-center justify-between gap-3">
          <Link to="/" search={marketSearch} aria-label="Voltar ao marketplace" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-kurio-surface text-kurio-goldStrong">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m15 18-6-6 6-6" /></svg>
          </Link>
          <div className="min-w-0 flex-1 text-center"><p className="text-[10px] uppercase tracking-[0.18em] text-kurio-gold/70">Conta</p><h1 className="mt-1 text-base font-semibold">Meu perfil</h1></div>
          <AccountLogoutButton className="rounded-full border border-kurio-line px-3 py-2 text-xs text-kurio-goldStrong" />
        </header>
        <div className="mt-6 flex items-center gap-4 rounded-2xl bg-kurio-surface p-4">
          <ProfileAvatarControls avatar={profile.avatar} compact />
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{session?.user.displayName ?? profile.displayName}</p><p className="mt-1 truncate text-xs text-kurio-cream/60">{profile.email}</p></div>
        </div>
        <nav aria-label="Seções da conta" className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-kurio-surface p-1">
          <Link to="/profile" aria-current="page" className="rounded-lg bg-kurio-goldStrong px-3 py-3 text-center text-xs font-semibold text-kurio-ink">Dados do perfil</Link>
          <Link to="/wallets" className="rounded-lg px-3 py-3 text-center text-xs text-kurio-cream/70">Carteiras</Link>
        </nav>
        <form key={profile.userId} onSubmit={saveProfile}>
          <section className="mt-5 rounded-2xl bg-kurio-surface p-4">
            <h2 className="mb-4 text-sm font-semibold">Informações pessoais</h2>
            <div className="space-y-4"><ProfileFormFields profile={profile} onAvatarChange={selectAvatar} onAvatarRemove={removeAvatar} /></div>
          </section>
          <button type="submit" disabled={updateProfile.isPending} className={`${primaryButtonClass} mt-5 h-12 w-full rounded-xl`}>{updateProfile.isPending ? 'Salvando...' : 'Salvar alterações'}</button>
          {profileFeedback && <p role={updateProfile.isError ? 'alert' : 'status'} className="mt-2 text-center text-xs">{profileFeedback}</p>}
          {avatarError && <p role="alert" className="mt-2 text-center text-xs text-red-300">{avatarError}</p>}
        </form>
        <form onSubmit={savePassword} className="mt-4 rounded-2xl bg-kurio-surface p-4">
          <h2 className="mb-4 text-sm font-semibold">Alterar senha</h2>
          <div className="space-y-4">
            <ProfilePasswordField label="Senha atual" name="currentPassword" autoComplete="current-password" />
            <ProfilePasswordField label="Nova senha" name="newPassword" autoComplete="new-password" />
            <ProfilePasswordField label="Confirmar nova senha" name="confirmPassword" autoComplete="new-password" />
          </div>
          <button type="submit" disabled={changePassword.isPending} className={`${primaryButtonClass} mt-4 h-12 w-full rounded-xl`}>{changePassword.isPending ? 'Salvando...' : 'Salvar senha'}</button>
          {passwordFeedback && <p role={changePassword.isError ? 'alert' : 'status'} className="mt-2 text-center text-xs">{passwordFeedback}</p>}
        </form>
      </section>
    </>
  )
}

function WalletReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="block text-xs text-kurio-cream/90">
      {label}<span className="text-kurio-goldStrong">*</span>
      <input value={value} readOnly className={profileFieldClass} />
    </label>
  )
}

type WalletFormFieldErrors = Partial<Record<keyof WalletFieldErrors, string>>
type WalletFieldName = keyof WalletFieldErrors

function getWalletFieldErrors(fieldErrors: WalletFieldErrors | Record<string, string[]>): WalletFormFieldErrors {
  const result: WalletFormFieldErrors = {}
  for (const field of ['label', 'address', 'network', 'type'] as const) {
    const message = fieldErrors[field]?.[0]
    if (message) result[field] = message
  }
  return result
}

function WalletForm({ wallet, profile, isPrimary, sameAsPrimary = false, primaryNetwork, pending, fieldErrors, onFieldErrorsChange, onFieldChange, onCancel, onSubmit }: {
  wallet: Wallet | null
  profile: NonNullable<ReturnType<typeof useProfile>['data']>
  isPrimary: boolean
  sameAsPrimary?: boolean
  primaryNetwork?: Wallet['network']
  pending: boolean
  fieldErrors: WalletFormFieldErrors
  onFieldErrorsChange: (errors: WalletFormFieldErrors) => void
  onFieldChange: (field: WalletFieldName) => void
  onCancel?: () => void
  onSubmit: (input: WalletInput) => void
}) {
  const formId = useId()
  const initialNetwork = !isPrimary && sameAsPrimary ? primaryNetwork ?? 'Ethereum' : wallet?.network ?? 'Ethereum'
  const [network, setNetwork] = useState<Wallet['network']>(initialNetwork)
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const rawNetwork = values.get('network')
    const rawType = values.get('type')
    const input: WalletInput = {
      label: String(values.get('label') ?? '').trim(),
      address: String(values.get('address') ?? '').trim(),
      secondaryAddress: String(values.get('secondaryAddress') ?? ''),
      network: !isPrimary && sameAsPrimary ? (primaryNetwork ?? 'Ethereum') : rawNetwork === 'Polygon' || rawNetwork === 'Solana' ? rawNetwork : 'Ethereum',
      type: rawType === 'WalletConnect' || rawType === 'Coinbase Wallet' ? rawType : 'MetaMask',
      isPrimary,
    }
    const errors = getWalletFieldErrors(validateWalletFields(input))
    onFieldErrorsChange(errors)
    if (Object.keys(errors).length) return
    onSubmit(input)
  }
  return (
    <form key={`${wallet?.id ?? (isPrimary ? 'primary' : 'new-secondary')}-${sameAsPrimary}`} noValidate onSubmit={submit} className="mt-5 grid grid-cols-1 gap-x-[22px] gap-y-[14px] sm:grid-cols-2">
      <WalletReadonlyField label="Nome de exibição" value={profile.displayName} />
      <label className="block text-xs text-kurio-cream/90">
        Apelido da carteira<span className="text-kurio-goldStrong">*</span>
        <input id={`${formId}-label`} name="label" defaultValue={wallet?.label ?? (isPrimary ? profile.walletNickname : '')} className={`${profileFieldClass} ${fieldErrors.label ? 'border-red-400 focus:border-red-400' : ''}`} aria-invalid={Boolean(fieldErrors.label)} aria-describedby={fieldErrors.label ? `${formId}-label-error` : undefined} onChange={() => onFieldChange('label')} minLength={2} required />
        {fieldErrors.label && <p id={`${formId}-label-error`} className="mt-1 text-[10px] text-red-300">{fieldErrors.label}</p>}
      </label>
      <label className="block text-xs text-kurio-cream/90">
        Rede<span className="text-kurio-goldStrong">*</span>
        <select id={`${formId}-network`} name="network" value={network} onChange={(event) => {
          setNetwork(event.target.value as Wallet['network'])
          onFieldChange('network')
          onFieldChange('address')
        }} disabled={!isPrimary && sameAsPrimary} className={`${profileFieldClass} ${fieldErrors.network ? 'border-red-400 focus:border-red-400' : ''}`} aria-invalid={Boolean(fieldErrors.network)} aria-describedby={fieldErrors.network ? `${formId}-network-error` : undefined}>
          <option>Ethereum</option><option>Polygon</option><option>Solana</option>
        </select>
        {fieldErrors.network && <p id={`${formId}-network-error`} className="mt-1 text-[10px] text-red-300">{fieldErrors.network}</p>}
      </label>
      <WalletReadonlyField label="Nome do perfil" value={profile.username} />
      <label className="block text-xs text-kurio-cream/90">
        Endereço da carteira<span className="text-kurio-goldStrong">*</span>
        <input id={`${formId}-address`} name="address" defaultValue={wallet?.address ?? ''} className={`${profileFieldClass} ${fieldErrors.address ? 'border-red-400 focus:border-red-400' : ''}`} placeholder={network === 'Solana' ? 'Base58, 32 a 44 caracteres' : '0x + 40 caracteres hexadecimais'} aria-invalid={Boolean(fieldErrors.address)} aria-describedby={fieldErrors.address ? `${formId}-address-error` : undefined} onChange={() => onFieldChange('address')} required />
        {fieldErrors.address && <p id={`${formId}-address-error`} className="mt-1 text-[10px] text-red-300">{fieldErrors.address}</p>}
      </label>
      <label className="block text-xs text-kurio-cream/90">
        ENS ou carteira secundária (opcional)
        <input name="secondaryAddress" defaultValue={wallet?.secondaryAddress ?? ''} className={profileFieldClass} />
      </label>
      <label className="block text-xs text-kurio-cream/90">
        Tipo de carteira<span className="text-kurio-goldStrong">*</span>
        <select id={`${formId}-type`} name="type" defaultValue={wallet?.type ?? 'MetaMask'} onChange={() => onFieldChange('type')} className={`${profileFieldClass} ${fieldErrors.type ? 'border-red-400 focus:border-red-400' : ''}`} aria-invalid={Boolean(fieldErrors.type)} aria-describedby={fieldErrors.type ? `${formId}-type-error` : undefined}>
          <option>MetaMask</option><option>WalletConnect</option><option>Coinbase Wallet</option>
        </select>
        {fieldErrors.type && <p id={`${formId}-type-error`} className="mt-1 text-[10px] text-red-300">{fieldErrors.type}</p>}
      </label>
      <WalletReadonlyField label="Código de indicação" value="KURIO" />
      <WalletReadonlyField label="E-mail" value={profile.email} />
      <label className="block text-xs text-kurio-cream/90">
        Nome ENS<span className="text-kurio-goldStrong">*</span>
        <span className="flex gap-2">
          <select aria-label="Sufixo ENS" value=".eth" disabled className={`${profileFieldClass} w-[64px] shrink-0 px-2`}><option>.eth</option></select>
          <input value={getEnsHandle(profile.ensName)} readOnly className={profileFieldClass} />
        </span>
      </label>
      <div className="col-span-full flex flex-wrap items-center gap-3 pt-1">
        <button type="submit" disabled={pending} className={`${primaryButtonClass} h-8 min-h-0 w-[112px] whitespace-nowrap rounded-sm px-2 text-[10px]`}>{pending ? 'Salvando...' : 'Salvar carteira'}</button>
        {onCancel && <button type="button" onClick={onCancel} className="px-2 text-xs text-kurio-cream/70">Cancelar</button>}
      </div>
    </form>
  )
}

export function WalletsPage({ returnTo }: { returnTo?: '/checkout' }) {
  const navigate = useNavigate()
  const walletsQuery = useWallets()
  const profileQuery = useProfile()
  const createWallet = useCreateWallet()
  const updateWallet = useUpdateWallet()
  const deleteWallet = useDeleteWallet()
  const [editingSecondary, setEditingSecondary] = useState<Wallet | null>(null)
  const [secondaryFormOpen, setSecondaryFormOpen] = useState(false)
  const [sameAsPrimary, setSameAsPrimary] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ primary: WalletFormFieldErrors; secondary: WalletFormFieldErrors }>({ primary: {}, secondary: {} })
  const wallets = walletsQuery.data ?? []
  const profile = profileQuery.data

  const saveWallet = async (input: WalletInput, isPrimary: boolean, existing: Wallet | null) => {
    setError('')
    setFeedback('')
    setFieldErrors((current) => ({ ...current, [isPrimary ? 'primary' : 'secondary']: {} }))
    try {
      if (existing) await updateWallet.mutateAsync({ ...existing, ...input, isPrimary })
      else await createWallet.mutateAsync({ ...input, isPrimary })
      if (!isPrimary) {
        setEditingSecondary(null)
        setSecondaryFormOpen(false)
      }
      if (returnTo) {
        await navigate({ to: returnTo })
        return
      }
      setFeedback(existing ? 'Carteira atualizada.' : isPrimary ? 'Carteira principal criada.' : 'Carteira adicionada.')
    } catch (mutationError) {
      const apiFieldErrors = axios.isAxiosError<ApiErrorResponse>(mutationError)
        ? mutationError.response?.data?.fieldErrors
        : undefined
      const walletErrors = apiFieldErrors ? getWalletFieldErrors(apiFieldErrors) : {}
      setFieldErrors((current) => ({ ...current, [isPrimary ? 'primary' : 'secondary']: walletErrors }))
      setError(Object.keys(walletErrors).length ? '' : getErrorMessage(mutationError, 'Não foi possível salvar a carteira.'))
    }
  }

  const updateWalletFieldErrors = (isPrimary: boolean, nextErrors: WalletFormFieldErrors) => {
    setError('')
    setFieldErrors((current) => ({ ...current, [isPrimary ? 'primary' : 'secondary']: nextErrors }))
  }

  const clearWalletFieldError = (isPrimary: boolean, field: WalletFieldName) => {
    setError('')
    setFieldErrors((current) => {
      const key = isPrimary ? 'primary' : 'secondary'
      const nextErrors = { ...current[key] }
      delete nextErrors[field]
      return { ...current, [key]: nextErrors }
    })
  }

  const removeWallet = async (wallet: Wallet) => {
    setError('')
    setFeedback('')
    try {
      await deleteWallet.mutateAsync(wallet.id)
      setFeedback('Carteira removida.')
    } catch (mutationError) {
      setError(getErrorMessage(mutationError, 'Não foi possível remover a carteira.'))
    }
  }

  const setPrimaryWallet = async (wallet: Wallet) => {
    setError('')
    setFeedback('')
    try {
      await updateWallet.mutateAsync({ ...wallet, isPrimary: true })
      setFeedback(`${wallet.label} definida como carteira principal.`)
    } catch (mutationError) {
      setError(getErrorMessage(mutationError, 'Não foi possível definir a carteira principal.'))
    }
  }

  if (walletsQuery.isLoading || profileQuery.isLoading || !profile) {
    const hasError = walletsQuery.isError || profileQuery.isError
    const message = hasError ? 'Não foi possível carregar os dados da conta.' : 'Carregando carteiras...'
    const retry = () => {
      void walletsQuery.refetch()
      void profileQuery.refetch()
    }
    return (
      <>
        <AccountDesktopLayout active="wallets">
          <p role={hasError ? 'alert' : 'status'}>{message}</p>
          {hasError && <button type="button" onClick={retry} className="mt-3 text-xs underline">Tentar novamente</button>}
        </AccountDesktopLayout>
        <section className="min-h-dvh px-5 pt-8 md:hidden">
          <p role={hasError ? 'alert' : 'status'}>{message}</p>
          {hasError && <button type="button" onClick={retry} className="mt-3 text-xs underline">Tentar novamente</button>}
        </section>
      </>
    )
  }

  const primaryWallet = wallets.find((wallet) => wallet.isPrimary) ?? wallets[0] ?? null
  const secondaryWallets = wallets.filter((wallet) => wallet.id !== primaryWallet?.id)
  const walletFormCallbacks = (isPrimary: boolean) => ({
    fieldErrors: fieldErrors[isPrimary ? 'primary' : 'secondary'],
    onFieldErrorsChange: (nextErrors: WalletFormFieldErrors) => updateWalletFieldErrors(isPrimary, nextErrors),
    onFieldChange: (field: WalletFieldName) => clearWalletFieldError(isPrimary, field),
  })
  const savePrimaryWallet = (input: WalletInput) => saveWallet(input, true, primaryWallet)
  const saveSecondaryWallet = (input: WalletInput) => saveWallet(input, false, editingSecondary)
  const openSecondaryForm = () => {
    setEditingSecondary(null)
    setSecondaryFormOpen(true)
    setError('')
    setFeedback('')
  }
  const accountTabs = (mobile = false) => (
    <nav aria-label="Seções da conta" className={`grid grid-cols-2 gap-2 rounded-xl bg-kurio-surface p-1 ${mobile ? 'mt-5' : ''}`}>
      <Link to="/profile" className="rounded-lg px-3 py-3 text-center text-xs text-kurio-cream/70">Dados do perfil</Link>
      <Link to="/wallets" aria-current="page" className="rounded-lg bg-kurio-goldStrong px-3 py-3 text-center text-xs font-semibold text-kurio-ink">Carteiras</Link>
    </nav>
  )

  return (
    <>
      <AccountDesktopLayout active="wallets">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-sm font-semibold">Carteira principal</h1>
            <p className="mt-1 text-xs text-kurio-gold/80">Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.</p>
          </div>
          <button type="button" onClick={openSecondaryForm} className="shrink-0 text-sm text-kurio-goldStrong">Adicionar</button>
        </div>
        <WalletForm wallet={primaryWallet} profile={profile} isPrimary pending={createWallet.isPending || updateWallet.isPending} {...walletFormCallbacks(true)} onSubmit={savePrimaryWallet} />
        {error && <p role="alert" className="mt-3 text-xs text-red-300">{error}</p>}
        {feedback && <p role="status" className="mt-3 text-xs text-green-300">{feedback}</p>}

        <section className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Carteira secundária</h2>
              <div className="flex items-center gap-3">
                <label className={`flex items-center gap-2 text-[10px] ${primaryWallet ? 'text-kurio-cream/80' : 'text-kurio-cream/40'}`}>
                  <input type="checkbox" checked={sameAsPrimary} disabled={!primaryWallet} onChange={(event) => setSameAsPrimary(event.target.checked)} className="accent-kurio-goldStrong" />
                  Igual à carteira principal
                </label>
                <button type="button" onClick={openSecondaryForm} className="text-sm text-kurio-goldStrong">Adicionar</button>
              </div>
          </div>
          {secondaryWallets.length ? (
            <div className="mt-4 space-y-3">
              {secondaryWallets.map((wallet) => (
                <article key={wallet.id} className="border-t border-kurio-line py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold">{wallet.label}</h3>
                      <p className="mt-1 break-all text-xs text-kurio-cream/70">{wallet.address}</p>
                      <p className="mt-1 text-xs text-kurio-gold/80">{wallet.network} · {wallet.type}</p>
                    </div>
                    <div className="flex gap-3 text-xs text-kurio-goldStrong">
                      <button type="button" onClick={() => { setEditingSecondary(wallet); setSecondaryFormOpen(true); setError('') }}>Alterar</button>
                      <button type="button" onClick={() => void setPrimaryWallet(wallet)}>Definir principal</button>
                      <button type="button" onClick={() => void removeWallet(wallet)}>Remover</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : <p className="mt-2 text-xs text-kurio-gold/80">Você ainda não adicionou uma carteira secundária.</p>}
          {secondaryFormOpen && (
            <div className="mt-5 border-t border-kurio-line pt-4">
              <h3 className="text-sm font-semibold">{editingSecondary ? 'Alterar carteira' : 'Adicionar carteira'}</h3>
              <WalletForm wallet={editingSecondary} profile={profile} isPrimary={false} sameAsPrimary={sameAsPrimary} primaryNetwork={primaryWallet?.network} pending={createWallet.isPending || updateWallet.isPending} {...walletFormCallbacks(false)} onCancel={() => { setEditingSecondary(null); setSecondaryFormOpen(false) }} onSubmit={saveSecondaryWallet} />
            </div>
          )}
        </section>
      </AccountDesktopLayout>

      <section className="mx-auto min-h-dvh w-full max-w-lg bg-kurio-ink px-5 pb-8 pt-5 md:hidden">
        <header className="flex items-center justify-between gap-3">
          <Link to="/" search={marketSearch} aria-label="Voltar ao marketplace" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-kurio-surface text-kurio-goldStrong">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m15 18-6-6 6-6" /></svg>
          </Link>
          <div className="min-w-0 flex-1 text-center"><p className="text-[10px] uppercase tracking-[0.18em] text-kurio-gold/70">Conta</p><h1 className="mt-1 text-base font-semibold">Minhas carteiras</h1></div>
          <AccountLogoutButton className="rounded-full border border-kurio-line px-3 py-2 text-xs text-kurio-goldStrong" />
        </header>
        {accountTabs(true)}
        <section className="mt-5 rounded-2xl bg-kurio-surface p-4">
          <div className="flex items-start justify-between gap-3">
            <div><h2 className="text-sm font-semibold">Carteira principal</h2><p className="mt-1 text-xs text-kurio-gold/80">Usada para comprar e receber NFTs.</p></div>
            <button type="button" onClick={openSecondaryForm} className="text-xs text-kurio-goldStrong">Adicionar</button>
          </div>
          <WalletForm wallet={primaryWallet} profile={profile} isPrimary pending={createWallet.isPending || updateWallet.isPending} {...walletFormCallbacks(true)} onSubmit={savePrimaryWallet} />
        </section>
        {error && <p role="alert" className="mt-3 text-xs text-red-300">{error}</p>}
        {feedback && <p role="status" className="mt-3 text-xs text-green-300">{feedback}</p>}
        <section className="mt-4 rounded-2xl bg-kurio-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Carteira secundária</h2>
            <div className="flex items-center gap-2">
              <label className={`flex items-center gap-1 text-[9px] ${primaryWallet ? 'text-kurio-cream/80' : 'text-kurio-cream/40'}`}>
                <input type="checkbox" checked={sameAsPrimary} disabled={!primaryWallet} onChange={(event) => setSameAsPrimary(event.target.checked)} className="accent-kurio-goldStrong" />
                Igual à principal
              </label>
              <button type="button" onClick={openSecondaryForm} className="text-xs text-kurio-goldStrong">Adicionar</button>
            </div>
          </div>
          {secondaryWallets.length ? secondaryWallets.map((wallet) => (
            <article key={wallet.id} className="mt-4 border-t border-kurio-line pt-4">
              <h3 className="text-sm font-semibold">{wallet.label}</h3>
              <p className="mt-1 break-all text-xs text-kurio-cream/70">{wallet.address}</p>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-kurio-goldStrong">
                <button type="button" onClick={() => { setEditingSecondary(wallet); setSecondaryFormOpen(true); setError('') }}>Alterar</button>
                <button type="button" onClick={() => void setPrimaryWallet(wallet)}>Definir principal</button>
                <button type="button" onClick={() => void removeWallet(wallet)}>Remover</button>
              </div>
            </article>
          )) : <p className="mt-2 text-xs text-kurio-gold/80">Você ainda não adicionou uma carteira secundária.</p>}
          {secondaryFormOpen && (
            <div className="mt-4 border-t border-kurio-line pt-4">
              <h3 className="text-sm font-semibold">{editingSecondary ? 'Alterar carteira' : 'Adicionar carteira'}</h3>
              <WalletForm wallet={editingSecondary} profile={profile} isPrimary={false} sameAsPrimary={sameAsPrimary} primaryNetwork={primaryWallet?.network} pending={createWallet.isPending || updateWallet.isPending} {...walletFormCallbacks(false)} onCancel={() => { setEditingSecondary(null); setSecondaryFormOpen(false) }} onSubmit={saveSecondaryWallet} />
            </div>
          )}
        </section>
      </section>
    </>
  )
}
