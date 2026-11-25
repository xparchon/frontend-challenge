import { expect, test, type Page } from '@playwright/test'

async function signIn(page: Page) {
  await page.goto('/login')
  const form = page.locator('form:visible').first()
  await form.locator('input[name="email"]').fill('nova@kurio.test')
  await form.locator('input[name="password"]').fill('NovaKurio!23')
  await Promise.all([
    page.waitForURL((url) => url.pathname === '/'),
    form.getByRole('button', { name: 'Entrar' }).click(),
  ])
}

test('desktop profile follows the reference layout and omits the footer', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await signIn(page)
  await page.goto('/profile')

  await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Navegação do perfil' })).toBeVisible()
  await expect(page.getByRole('contentinfo')).toHaveCount(0)

  const displayName = page.getByRole('textbox', { name: 'Nome de exibição*' }).first()
  const username = page.getByRole('textbox', { name: 'Nome de usuário*' }).first()
  const displayNameBox = await displayName.boundingBox()
  const usernameBox = await username.boundingBox()
  if (!displayNameBox || !usernameBox) throw new Error('Profile fields should be visible on desktop.')
  expect(usernameBox.x).toBeGreaterThan(displayNameBox.x + displayNameBox.width / 2)
})

test('desktop account pages keep the same frame and expose wallet creation', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await signIn(page)
  await page.goto('/profile')

  const profileSidebar = await page.getByRole('complementary').boundingBox()
  const profileHeading = await page.getByRole('heading', { name: 'Perfil do colecionador' }).boundingBox()
  await page.goto('/wallets')

  await expect(page.getByRole('heading', { name: 'Carteira principal' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Navegação do perfil' }).getByText('Arquivos baixados')).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Igual à carteira principal' })).toBeVisible()
  await expect(page.getByRole('contentinfo')).toHaveCount(0)
  const walletSidebar = await page.getByRole('complementary').boundingBox()
  const walletHeading = await page.getByRole('heading', { name: 'Carteira principal' }).boundingBox()

  expect(walletSidebar).toEqual(profileSidebar)
  expect(walletHeading?.x).toBe(profileHeading?.x)
  expect(walletHeading?.y).toBe(profileHeading?.y)
})

test('mobile profile uses account navigation and has no site footer', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page)
  await page.goto('/profile')

  await expect(page.getByRole('heading', { name: 'Meu perfil' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Seções da conta' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Navegação mobile' })).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: 'Navegação do perfil' })).toHaveCount(0)
  await expect(page.getByRole('contentinfo')).toHaveCount(0)

  const dimensions = await page.locator('body').evaluate((body) => ({
    width: body.scrollWidth,
    viewport: body.clientWidth,
  }))
  expect(dimensions.width).toBeLessThanOrEqual(dimensions.viewport)
})
