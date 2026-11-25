import { expect, test, type Page } from '@playwright/test'

async function signInAndFundWallet(page: Page) {
  await page.goto('/login')
  const form = page.locator('form:visible').first()
  await form.locator('input[name="email"]').fill('nova@kurio.test')
  await form.locator('input[name="password"]').fill('NovaKurio!23')
  await Promise.all([
    page.waitForURL((url) => url.pathname === '/'),
    form.getByRole('button', { name: 'Entrar' }).click(),
  ])
  await page.evaluate(async () => {
    const stored = localStorage.getItem('kurio.session')
    if (!stored) throw new Error('Authenticated session is missing.')
    const session = JSON.parse(stored) as { user: { id: string }; accessToken: string }
    const headers = { Authorization: `Bearer ${session.accessToken}` }
    const response = await fetch('/api/wallets', { headers })
    if (!response.ok) throw new Error('Could not load test wallets.')
    const wallets = await response.json() as Array<{ id: string; isPrimary: boolean }>
    const wallet = wallets.find((item) => item.isPrimary)
    if (!wallet) throw new Error('Primary wallet is missing.')
    const balances = JSON.parse(localStorage.getItem('kurio.mock.walletBalances') ?? '{}') as Record<string, Record<string, string>>
    balances[session.user.id] = { ...balances[session.user.id], [wallet.id]: '100000000000000000000' }
    localStorage.setItem('kurio.mock.walletBalances', JSON.stringify(balances))
  })
  await expect(page.getByText('Atualizações em tempo real conectadas.', { exact: true })).toBeVisible()
}

async function addNftAndOpenCheckout(page: Page) {
  await page.goto('/market/nfts/emerald-ape-042')
  await page.getByRole('button', { name: 'Comprar NFT' }).click()
  await page.getByRole('link', { name: 'Seguir para o pagamento' }).click()
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(page.getByText(/Conexão simulada com/)).toBeVisible()
}

async function createScenarioRequest(page: Page, path: string, method: 'PUT' | 'POST', body?: unknown) {
  return page.evaluate(async ({ path, method, body }) => {
    const stored = localStorage.getItem('kurio.session')
    if (!stored) throw new Error('Authenticated session is missing.')
    const session = JSON.parse(stored) as { accessToken: string }
    const response = await fetch(path, {
      method,
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    return { status: response.status, body: await response.json() as Record<string, unknown> }
  }, { path, method, body })
}

test('NFT update events refresh catalog, detail, cart, and invalidate stale checkout quotes', async ({ page }) => {
  await signInAndFundWallet(page)
  await page.goto('/market/nfts/emerald-ape-042')
  await expect(page.getByText('1.19 ETH').first()).toBeVisible()
  await page.getByRole('button', { name: 'Comprar NFT' }).click()
  await page.getByRole('link', { name: 'Seguir para o pagamento' }).click()

  const previousCart = await page.evaluate(async () => {
    const stored = localStorage.getItem('kurio.session')
    if (!stored) throw new Error('Authenticated session is missing.')
    const session = JSON.parse(stored) as { accessToken: string }
    const response = await fetch('/api/cart', { headers: { Authorization: `Bearer ${session.accessToken}` } })
    if (!response.ok) throw new Error('Could not load the initial cart quote.')
    return await response.json() as {
      quoteVersion: number
      items: Array<{ nftId: string; edition: string; quantity: number }>
    }
  })

  const wallets = await page.evaluate(async () => {
    const stored = localStorage.getItem('kurio.session')
    if (!stored) throw new Error('Authenticated session is missing.')
    const session = JSON.parse(stored) as { accessToken: string }
    const response = await fetch('/api/wallets', { headers: { Authorization: `Bearer ${session.accessToken}` } })
    if (!response.ok) throw new Error('Could not load test wallets.')
    return await response.json() as Array<{ id: string; isPrimary: boolean }>
  })
  const wallet = wallets.find((item) => item.isPrimary)
  if (!wallet) throw new Error('Primary wallet is missing.')

  const update = await createScenarioRequest(page, '/api/mock/scenarios/nfts/emerald-ape-042', 'PUT', {
    price: '1.37',
    editionsAvailable: 40,
    eventSequence: true,
  })
  expect(update.status).toBe(200)
  await expect(page.getByRole('status').filter({ hasText: 'O preço ou a disponibilidade' })).toBeVisible()
  await expect(page.getByText('1.37 ETH').first()).toBeVisible()

  await page.goto('/market')
  await expect(page.getByRole('link', { name: /Emerald Ape #042/ })).toContainText('1.37 ETH')
  await page.goto('/market/nfts/emerald-ape-042')
  await expect(page.getByText('1.37 ETH').first()).toBeVisible()
  await page.goto('/checkout')

  const staleQuote = await page.evaluate(async ({ walletId, cart }) => {
    const stored = localStorage.getItem('kurio.session')
    if (!stored) throw new Error('Authenticated session is missing.')
    const session = JSON.parse(stored) as { accessToken: string }
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify({
        walletId,
        quoteVersion: cart.quoteVersion,
        items: cart.items,
      }),
    })
    return { status: response.status, body: await response.json() as { message?: string } }
  }, { walletId: wallet.id, cart: previousCart })
  expect(staleQuote.status).toBe(409)
  expect(staleQuote.body.message).toContain('A cotação mudou')
})

test('pending orders recover after reload/reconnect and ignore duplicate or stale events', async ({ page }) => {
  await signInAndFundWallet(page)
  await addNftAndOpenCheckout(page)
  await page.evaluate(() => {
    localStorage.setItem('kurio.mock.paymentOutcome', 'pending')
    localStorage.setItem('kurio.mock.orderSettlementDelayMs', '5000')
  })

  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByRole('heading', { name: 'Pedido em processamento' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Pedido em processamento' })).toBeVisible()

  await page.context().setOffline(true)
  await page.waitForTimeout(1_000)
  await page.context().setOffline(false)
  await expect(page.getByText('Atualizações em tempo real conectadas.', { exact: true })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('heading', { name: 'Compra confirmada' })).toBeVisible({ timeout: 12_000 })

  const orderId = new URL(page.url()).pathname.split('/').pop()
  if (!orderId) throw new Error('Order route is missing its order id.')
  const duplicateEvents = await createScenarioRequest(page, `/api/mock/scenarios/orders/${orderId}/events`, 'POST')
  expect(duplicateEvents.status).toBe(200)
  await expect(page.getByRole('heading', { name: 'Compra confirmada' })).toBeVisible()

  const order = duplicateEvents.body
  expect(order.status).toBe('confirmed')
})
