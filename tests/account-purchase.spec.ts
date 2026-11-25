import { expect, test, type Page } from '@playwright/test'

async function fundTestWallet(page: Page, walletLabel?: string, amount = '100', reloadAfter = false) {
  await page.evaluate(async ({ walletLabel, amount }) => {
    const storedSession = localStorage.getItem('kurio.session')
    if (!storedSession) throw new Error('Authenticated session is missing.')
    const session = JSON.parse(storedSession) as { user: { id: string }; accessToken: string }
    const headers = { Authorization: `Bearer ${session.accessToken}` }
    const walletsResponse = await fetch('/api/wallets', { headers })
    if (!walletsResponse.ok) throw new Error('Could not load test wallets.')
    const wallets = await walletsResponse.json() as Array<{ id: string; label: string; isPrimary: boolean }>
    const wallet = walletLabel ? wallets.find((item) => item.label === walletLabel) : wallets.find((item) => item.isPrimary)
    if (!wallet) throw new Error('No test wallet is available to fund.')

    const [whole = '0', fraction = ''] = amount.split('.')
    const amountWei = (BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, '0').slice(0, 18))).toString()
    const allBalances = JSON.parse(localStorage.getItem('kurio.mock.walletBalances') ?? '{}') as Record<string, Record<string, string>>
    allBalances[session.user.id] = { ...allBalances[session.user.id], [wallet.id]: amountWei }
    localStorage.setItem('kurio.mock.walletBalances', JSON.stringify(allBalances))
  }, { walletLabel, amount })
  if (reloadAfter) await page.reload()
}

async function signIn(page: Page, password = 'NovaKurio!23') {
  await page.goto('/login')
  const form = page.locator('form:visible').first()
  await form.locator('input[name="email"]').fill('nova@kurio.test')
  await form.locator('input[name="password"]').fill(password)
  await Promise.all([
    page.waitForURL((url) => url.pathname === '/'),
    form.getByRole('button', { name: 'Entrar' }).click(),
  ])
  await fundTestWallet(page)
}

test('profile updates and wallet records persist after refresh', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await signIn(page)
  await page.goto('/profile')

  const profileForm = page.locator('form:visible').first()
  await profileForm.locator('[name="displayName"]').fill('Nova Perfil Atualizado')
  await profileForm.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText('Perfil salvo.').first()).toBeVisible()
  await page.reload()
  await expect(page.locator('form:visible').first().locator('[name="displayName"]')).toHaveValue('Nova Perfil Atualizado')

  await page.goto('/wallets')
  await page.getByRole('button', { name: 'Adicionar' }).nth(1).click()
  const walletForm = page.locator('form:visible').filter({ has: page.locator('[name="label"]') }).last()
  await walletForm.locator('[name="label"]').fill('Solana de teste')
  await walletForm.locator('[name="network"]').selectOption('Solana')
  await walletForm.locator('[name="address"]').fill('11111111111111111111111111111111')
  await walletForm.locator('[name="type"]').selectOption('WalletConnect')
  await walletForm.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(page.getByText('Carteira adicionada.').first()).toBeVisible()
  await page.reload()
  await expect(page.getByText('Solana de teste', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('11111111111111111111111111111111').first()).toBeVisible()

  await page.goto('/profile')
  const passwordForm = page.locator('form:visible').filter({ has: page.locator('[name="currentPassword"]') })
  await passwordForm.locator('[name="currentPassword"]').fill('NovaKurio!23')
  await passwordForm.locator('[name="newPassword"]').fill('NovaAtualizada!23')
  await passwordForm.locator('[name="confirmPassword"]').fill('NovaAtualizada!23')
  await passwordForm.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText('Senha alterada.').first()).toBeVisible()

  await page.getByRole('complementary').getByRole('button', { name: 'Sair' }).click()
  await signIn(page, 'NovaAtualizada!23')
  await expect(page.getByRole('link', { name: 'Nova Perfil Atualizado' })).toBeVisible()
})

test('wallet validation explains invalid addresses and accepts a valid Ethereum address', async ({ page }) => {
  await signIn(page)
  await page.goto('/wallets')
  await page.getByRole('button', { name: 'Adicionar' }).nth(1).click()

  const walletForm = page.locator('form:visible').filter({ has: page.locator('[name="label"]') }).last()
  await walletForm.locator('[name="label"]').fill('Minha carteira')
  await walletForm.locator('[name="network"]').selectOption('Ethereum')
  await walletForm.locator('[name="address"]').fill('67585875866')
  await walletForm.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(walletForm.getByText('Informe um endereço Ethereum ou Polygon no formato 0x seguido de 40 caracteres hexadecimais.')).toBeVisible()
  await expect(walletForm.locator('[name="address"]')).toHaveAttribute('aria-invalid', 'true')

  await walletForm.locator('[name="address"]').fill(`0x${'A'.repeat(40)}`)
  await walletForm.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(page.getByText('Carteira adicionada.').first()).toBeVisible()
  await expect(page.getByText('Minha carteira', { exact: true }).first()).toBeVisible()
})

test('favorites persist and roll back when a favorite mutation fails', async ({ page }) => {
  await signIn(page)
  await page.goto('/market/nfts/emerald-ape-042')
  const addButton = page.getByRole('button', { name: 'Adicionar aos favoritos: Emerald Ape #042' })
  await expect(addButton).toHaveAttribute('aria-pressed', 'false')
  await page.evaluate(() => localStorage.setItem('kurio.mock.favoriteFailure', 'true'))
  await addButton.click()
  await expect(page.getByRole('alert')).toHaveText('Não foi possível atualizar os favoritos. Tente novamente.')
  await expect(addButton).toHaveAttribute('aria-pressed', 'false')

  await page.evaluate(() => localStorage.removeItem('kurio.mock.favoriteFailure'))
  await addButton.click()
  await expect(page.getByRole('status').filter({ hasText: 'Adicionado aos favoritos.' })).toBeVisible()
  await page.reload()
  const removeButton = page.getByRole('button', { name: 'Remover dos favoritos: Emerald Ape #042' })
  await expect(removeButton).toHaveAttribute('aria-pressed', 'true')
  await removeButton.click()
  await expect(page.getByRole('status').filter({ hasText: 'Removido dos favoritos.' })).toBeVisible()
})

test('NFT can be purchased with a refreshed quote and a saved wallet', async ({ page }) => {
  await signIn(page)
  await page.goto('/market/nfts/emerald-ape-042')
  await page.getByRole('button', { name: 'Comprar NFT' }).click()
  await expect(page).toHaveURL(/\/cart$/)

  await page.getByLabel('Código promocional').fill('KURIO10')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByText('1.087 ETH').first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Seguir para o pagamento' })).toBeVisible()
  await page.getByRole('link', { name: 'Seguir para o pagamento' }).click()

  await expect(page.getByText('Saldo simulado disponível: 100 ETH')).toBeVisible()
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(page.getByText(/Conexão simulada com/)).toBeVisible()
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByRole('heading', { name: 'Compra confirmada' })).toBeVisible()
  await expect(page.getByText('1.087 ETH').first()).toBeVisible()
  await expect.poll(async () => page.evaluate(async () => {
    const session = JSON.parse(localStorage.getItem('kurio.session') ?? 'null') as { user: { id: string }; accessToken: string } | null
    if (!session) throw new Error('Authenticated session is missing.')
    const headers = { Authorization: `Bearer ${session.accessToken}` }
    const walletsResponse = await fetch('/api/wallets', { headers })
    const wallets = await walletsResponse.json() as Array<{ id: string; isPrimary: boolean }>
    const wallet = wallets.find((item) => item.isPrimary)
    if (!wallet) throw new Error('Primary wallet is missing.')
    const response = await fetch(`/api/wallets/${wallet.id}/balance`, { headers })
    const balance = await response.json() as { amount: string }
    return balance.amount
  })).toBe('98.913')

  await page.goto('/cart')
  await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
})

test('checkout blocks purchases above the simulated wallet balance', async ({ page }) => {
  await signIn(page)
  await fundTestWallet(page, undefined, '0.5')
  await page.goto('/market/nfts/emerald-ape-042')
  await page.getByRole('button', { name: 'Comprar NFT' }).click()
  await page.getByRole('link', { name: 'Seguir para o pagamento' }).click()

  await expect(page.getByText('Saldo simulado disponível: 0.5 ETH')).toBeVisible()
  await expect(page.getByText(/Saldo insuficiente/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeDisabled()

  const result = await page.evaluate(async () => {
    const session = JSON.parse(localStorage.getItem('kurio.session') ?? 'null') as { user: { id: string }; accessToken: string } | null
    if (!session) throw new Error('Authenticated session is missing.')
    const headers = { Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json' }
    const [cartResponse, walletsResponse] = await Promise.all([
      fetch('/api/cart', { headers }),
      fetch('/api/wallets', { headers }),
    ])
    const cart = await cartResponse.json() as { quoteVersion: number; items: Array<{ nftId: string; edition: string; quantity: number }> }
    const wallets = await walletsResponse.json() as Array<{ id: string; isPrimary: boolean }>
    const wallet = wallets.find((item) => item.isPrimary)
    if (!wallet) throw new Error('Primary wallet is missing.')
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { ...headers, 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({
        walletId: wallet.id,
        quoteVersion: cart.quoteVersion,
        items: cart.items.map(({ nftId, edition, quantity }) => ({ nftId, edition, quantity })),
      }),
    })
    return { status: response.status, body: await response.json() as { message?: string } }
  })
  expect(result.status).toBe(402)
  expect(result.body.message).toContain('Saldo insuficiente')
})

test('visitor cart contents merge into the account after login', async ({ page }) => {
  await page.goto('/market/nfts/emerald-ape-042')
  await page.getByRole('button', { name: 'Comprar NFT' }).click()
  await expect(page.getByRole('link', { name: 'Entrar e finalizar' })).toBeVisible()
  await page.getByRole('link', { name: 'Entrar e finalizar' }).click()
  await expect(page).toHaveURL(/\/login\?returnTo=/)

  const form = page.locator('form:visible').first()
  await form.locator('input[name="email"]').fill('nova@kurio.test')
  await form.locator('input[name="password"]').fill('NovaKurio!23')
  await Promise.all([
    page.waitForURL((url) => url.pathname === '/checkout'),
    form.getByRole('button', { name: 'Entrar' }).click(),
  ])
  await expect(page.getByText('Emerald Ape #042')).toBeVisible()
  await expect(page.getByText('1.19 ETH').first()).toBeVisible()
})

test('wallet and payment refusals are visible and rejected purchases preserve the cart', async ({ page }) => {
  await signIn(page)
  await page.goto('/market/nfts/emerald-ape-042')
  await page.getByRole('button', { name: 'Comprar NFT' }).click()
  await page.getByRole('link', { name: 'Seguir para o pagamento' }).click()
  await page.evaluate(() => {
    localStorage.setItem('kurio.mock.walletConnection', 'rejected')
    localStorage.setItem('kurio.mock.paymentOutcome', 'rejected')
  })

  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(page.getByRole('alert')).toContainText('conexão da carteira foi recusada')
  await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeDisabled()

  await page.evaluate(() => localStorage.removeItem('kurio.mock.walletConnection'))
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Tentar novamente' })).toBeVisible()
  await expect.poll(async () => page.evaluate(async () => {
    const session = JSON.parse(localStorage.getItem('kurio.session') ?? 'null') as { user: { id: string }; accessToken: string } | null
    if (!session) throw new Error('Authenticated session is missing.')
    const headers = { Authorization: `Bearer ${session.accessToken}` }
    const walletsResponse = await fetch('/api/wallets', { headers })
    const wallets = await walletsResponse.json() as Array<{ id: string; isPrimary: boolean }>
    const wallet = wallets.find((item) => item.isPrimary)
    if (!wallet) throw new Error('Primary wallet is missing.')
    const response = await fetch(`/api/wallets/${wallet.id}/balance`, { headers })
    const balance = await response.json() as { amount: string }
    return balance.amount
  })).toBe('100')

  await page.goto('/cart')
  await expect(page.getByText('Emerald Ape #042')).toBeVisible()
})

test('checkout refreshes a changed quote and requires a second confirmation', async ({ page }) => {
  await signIn(page)
  await page.goto('/market/nfts/emerald-ape-042')
  await page.getByRole('button', { name: 'Comprar NFT' }).click()
  await page.getByRole('link', { name: 'Seguir para o pagamento' }).click()
  await page.evaluate(() => {
    localStorage.setItem('kurio.mock.priceOverrides', JSON.stringify({ 'emerald-ape-042': '1.29' }))
  })

  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByRole('alert')).toContainText('A cotação mudou')
  await expect(page.getByText('1.306 ETH').first()).toBeVisible()

  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByRole('heading', { name: 'Compra confirmada' })).toBeVisible()
  await expect(page.getByText('1.306 ETH').first()).toBeVisible()
})

test('checkout purchases mixed-network carts one network at a time', async ({ page }) => {
  await signIn(page)
  await page.evaluate(async () => {
    const storedSession = localStorage.getItem('kurio.session')
    if (!storedSession) throw new Error('Authenticated session is missing.')
    const token = (JSON.parse(storedSession) as { accessToken: string }).accessToken
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    const addCartItem = async (item: { nftId: string; edition: string }) => {
      const response = await fetch('/api/cart/items', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...item, quantity: 1 }),
      })
      if (!response.ok) throw new Error(`Could not add ${item.nftId} to the cart.`)
    }

    await addCartItem({ nftId: 'emerald-ape-042', edition: '1/50' })
    await addCartItem({ nftId: 'sage-nomad-009', edition: '1/10' })
  })
  await page.goto('/wallets')
  await page.getByRole('button', { name: 'Adicionar' }).nth(1).click()
  const polygonWalletForm = page.locator('form:visible').filter({ has: page.locator('[name="label"]') }).last()
  await polygonWalletForm.locator('[name="label"]').fill('Polygon de teste')
  await polygonWalletForm.locator('[name="network"]').selectOption('Polygon')
  await polygonWalletForm.locator('[name="address"]').fill('0xB23000000000000000000000000000000000A443')
  await polygonWalletForm.locator('[name="type"]').selectOption('MetaMask')
  await polygonWalletForm.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(page.getByText('Carteira adicionada.').first()).toBeVisible()
  await fundTestWallet(page, 'Polygon de teste')

  await page.goto('/cart')
  await expect(page.getByText('0.032 ETH').first()).toBeVisible()
  await page.getByRole('link', { name: 'Seguir para o pagamento' }).click()

  await expect(page.getByRole('heading', { name: 'Seus NFTs · Ethereum' })).toBeVisible()
  await expect(page.getByText('Emerald Ape #042')).toBeVisible()
  await expect(page.getByText('Sage Nomad #009')).toHaveCount(0)
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByRole('heading', { name: 'Compra confirmada' })).toBeVisible()
  await page.getByRole('link', { name: 'Continuar com os itens restantes' }).click()

  await expect(page.getByRole('heading', { name: 'Seus NFTs · Polygon' })).toBeVisible()
  await expect(page.getByText('Sage Nomad #009')).toBeVisible()
  await expect(page.getByText('Emerald Ape #042')).toHaveCount(0)
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByRole('heading', { name: 'Compra confirmada' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Continuar com os itens restantes' })).toHaveCount(0)
})

test('buyer can add a wallet from checkout and return to payment', async ({ page }) => {
  await page.goto('/register')
  const form = page.locator('form').last()
  const username = `buyer${Date.now()}`
  await form.locator('input[name="username"]').fill(username)
  await form.locator('input[name="email"]').fill(`${username}@kurio.test`)
  await form.locator('input[name="password"]').fill('ContaNova!23')
  await form.locator('input[name="confirmPassword"]').fill('ContaNova!23')
  await form.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page).toHaveURL(/\/\?search=/)

  await page.goto('/market/nfts/emerald-ape-042')
  await page.getByRole('button', { name: 'Comprar NFT' }).click()
  await page.getByRole('link', { name: 'Seguir para o pagamento' }).click()
  await page.getByRole('link', { name: 'Gerenciar carteiras' }).click()
  await expect(page).toHaveURL(/\/wallets\?returnTo=%2Fcheckout/)

  const walletForm = page.locator('form:visible').filter({ has: page.locator('[name="label"]') }).first()
  await walletForm.locator('[name="address"]').fill(`0x${'C'.repeat(40)}`)
  await walletForm.getByRole('button', { name: 'Salvar carteira' }).click()
  await fundTestWallet(page, undefined, '100', true)
  await expect(page).toHaveURL(/\/checkout$/)
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByRole('heading', { name: 'Compra confirmada' })).toBeVisible()
})

test('order retries recover the same order and reject a reused key with changed content', async ({ page }) => {
  await signIn(page)
  const result = await page.evaluate(async () => {
    const storedSession = localStorage.getItem('kurio.session')
    if (!storedSession) throw new Error('Authenticated session is missing.')
    const token = (JSON.parse(storedSession) as { accessToken: string }).accessToken
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

    await fetch('/api/cart/items', {
      method: 'POST',
      headers,
      body: JSON.stringify({ nftId: 'emerald-ape-042', edition: '1/50', quantity: 1 }),
    })
    const [cartResponse, walletsResponse] = await Promise.all([
      fetch('/api/cart', { headers }),
      fetch('/api/wallets', { headers }),
    ])
    const cart = await cartResponse.json() as { quoteVersion: number; items: Array<{ nftId: string; edition: string; quantity: number }> }
    const wallets = await walletsResponse.json() as Array<{ id: string; isPrimary: boolean }>
    const wallet = wallets.find((item) => item.isPrimary)
    if (!wallet) throw new Error('Primary wallet is missing.')
    const payload = {
      walletId: wallet.id,
      quoteVersion: cart.quoteVersion,
      items: cart.items.map(({ nftId, edition, quantity }) => ({ nftId, edition, quantity })),
    }
    const submit = (body: typeof payload) => fetch('/api/orders', {
      method: 'POST',
      headers: { ...headers, 'Idempotency-Key': 'playwright-retry-key' },
      body: JSON.stringify(body),
    })
    const first = await submit(payload)
    const firstOrder = await first.json() as { id: string }
    const retry = await submit(payload)
    const retryOrder = await retry.json() as { id: string }
    const conflict = await submit({ ...payload, items: payload.items.map((item) => ({ ...item, quantity: item.quantity + 1 })) })
    const balanceResponse = await fetch(`/api/wallets/${wallet.id}/balance`, { headers })
    const balance = await balanceResponse.json() as { amount: string }
    return { firstStatus: first.status, retryStatus: retry.status, firstId: firstOrder.id, retryId: retryOrder.id, conflictStatus: conflict.status, balance: balance.amount }
  })

  expect(result.firstStatus).toBe(201)
  expect(result.retryStatus).toBe(200)
  expect(result.retryId).toBe(result.firstId)
  expect(result.conflictStatus).toBe(409)
  expect(result.balance).toBe('98.794')
})

test('a client timeout after order creation recovers the same order on retry', async ({ page }) => {
  await signIn(page)
  const result = await page.evaluate(async () => {
    const storedSession = localStorage.getItem('kurio.session')
    if (!storedSession) throw new Error('Authenticated session is missing.')
    const token = (JSON.parse(storedSession) as { accessToken: string }).accessToken
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

    await fetch('/api/cart/items', {
      method: 'POST',
      headers,
      body: JSON.stringify({ nftId: 'emerald-ape-042', edition: '1/50', quantity: 1 }),
    })
    const [cartResponse, walletsResponse] = await Promise.all([
      fetch('/api/cart', { headers }),
      fetch('/api/wallets', { headers }),
    ])
    const cart = await cartResponse.json() as { quoteVersion: number; items: Array<{ nftId: string; edition: string; quantity: number }> }
    const wallets = await walletsResponse.json() as Array<{ id: string; isPrimary: boolean }>
    const wallet = wallets.find((item) => item.isPrimary)
    if (!wallet) throw new Error('Primary wallet is missing.')

    const key = 'playwright-timeout-key'
    const payload = {
      walletId: wallet.id,
      quoteVersion: cart.quoteVersion,
      items: cart.items.map(({ nftId, edition, quantity }) => ({ nftId, edition, quantity })),
    }
    const submit = (signal?: AbortSignal) => fetch('/api/orders', {
      method: 'POST',
      headers: { ...headers, 'Idempotency-Key': key },
      body: JSON.stringify(payload),
      signal,
    })

    localStorage.setItem('kurio.mock.orderResponseDelayMs', '1500')
    const controller = new AbortController()
    const abortTimer = window.setTimeout(() => controller.abort(), 250)
    let firstError = ''
    try {
      await submit(controller.signal)
    } catch (error) {
      firstError = error instanceof DOMException ? error.name : String(error)
    } finally {
      window.clearTimeout(abortTimer)
    }

    await new Promise((resolve) => window.setTimeout(resolve, 1600))
    const retry = await submit()
    const order = await retry.json() as { id: string }
    const balanceResponse = await fetch(`/api/wallets/${wallet.id}/balance`, { headers })
    const balance = await balanceResponse.json() as { amount: string }
    return { firstError, retryStatus: retry.status, orderId: order.id, balance: balance.amount }
  })

  expect(result.firstError).toBe('AbortError')
  expect(result.retryStatus).toBe(200)
  expect(result.orderId).toMatch(/^order-/)
  expect(result.balance).toBe('98.794')
})
