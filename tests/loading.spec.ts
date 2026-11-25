import { expect, test } from '@playwright/test'

test('catalog, NFT detail, and cart summary show reduced-motion-friendly shimmer skeletons', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => localStorage.setItem('kurio.mock.networkLatencyMs', '900'))

  await page.goto('/market')
  const catalogSkeleton = page.getByRole('status', { name: 'Carregando catálogo' })
  await expect(catalogSkeleton).toBeVisible()
  await expect(catalogSkeleton.locator('.skeleton-shimmer').first()).toBeVisible()
  await expect.poll(() => catalogSkeleton.locator('.skeleton-shimmer').first().evaluate((element) => {
    return getComputedStyle(element, '::after').animationName
  })).toBe('none')

  await page.getByRole('link', { name: /Emerald Ape #042/ }).click()
  await expect(page.getByRole('status', { name: 'Carregando detalhes do NFT' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible()

  await page.goto('/cart')
  const cartSkeleton = page.getByRole('status', { name: 'Carregando carrinho' })
  await expect(cartSkeleton).toBeVisible()
  await expect(cartSkeleton.locator('.skeleton-shimmer')).toHaveCount(9)
  await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
})

test('catalog failure feedback can recover after a retry', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('kurio.mock.catalogFailure', 'true'))
  await page.goto('/market')
  await expect(page.getByText('Não foi possível carregar o catálogo.')).toBeVisible({ timeout: 15_000 })

  await page.evaluate(() => localStorage.removeItem('kurio.mock.catalogFailure'))
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByRole('link', { name: /Emerald Ape #042/ })).toBeVisible()
})

test('network outages show an error and recover when connectivity returns', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('kurio.mock.networkOffline', 'true'))
  await page.goto('/market')
  await expect(page.getByText('Não foi possível carregar o catálogo.')).toBeVisible({ timeout: 15_000 })

  await page.evaluate(() => localStorage.removeItem('kurio.mock.networkOffline'))
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByRole('link', { name: /Emerald Ape #042/ })).toBeVisible()
})

test('a slower stale catalog response does not replace newer search results', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('kurio.mock.networkLatencyBySearchMs', JSON.stringify({ Cosmic: 900, Emerald: 20 }))
  })
  await page.goto('/market')
  const search = page.getByRole('textbox', { name: 'Buscar NFTs' })
  const slowRequest = page.waitForRequest((request) => {
    const url = new URL(request.url())
    return url.pathname === '/api/nfts' && url.searchParams.get('search') === 'Cosmic'
  })

  await search.fill('Cosmic')
  await slowRequest
  await search.fill('Emerald')
  await expect(page.getByRole('link', { name: /Emerald Ape #042/ })).toBeVisible()
  await page.waitForTimeout(950)
  await expect(page.getByRole('link', { name: /Emerald Ape #042/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Cosmic Bloom/ })).not.toBeVisible()
})
