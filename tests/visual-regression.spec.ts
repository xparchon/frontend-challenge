import { expect, test, type Page } from '@playwright/test'

const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
] as const

const screens = ['home', 'detail', 'cart', 'checkout'] as const

async function addNftToCart(page: Page) {
  await page.goto('/market/nfts/emerald-ape-042')
  await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible()
  await page.getByRole('button', { name: 'Comprar NFT' }).click()
  await expect(page).toHaveURL(/\/cart$/)
}

async function prepareScreen(page: Page, screen: (typeof screens)[number]) {
  if (screen === 'home') {
    await page.goto('/')
    await expect(page.getByRole('link', { name: /Emerald Ape #042/ })).toBeVisible()
    return
  }

  if (screen === 'detail') {
    await page.goto('/market/nfts/emerald-ape-042')
    await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible()
    return
  }

  await addNftToCart(page)
  if (screen === 'cart') return

  await page.getByRole('link', { name: 'Entrar e finalizar' }).click()
  const form = page.locator('form:visible').last()
  await form.locator('input[name="email"]').fill('nova@kurio.test')
  await form.locator('input[name="password"]').fill('NovaKurio!23')
  await Promise.all([
    page.waitForURL((url) => url.pathname === '/checkout'),
    form.getByRole('button', { name: 'Entrar' }).click(),
  ])
  await expect(page.getByText('Emerald Ape #042')).toBeVisible()
}

for (const viewport of viewports) {
  for (const screen of screens) {
    test(`${viewport.name} ${screen} visual baseline`, async ({ page }, testInfo) => {
      test.skip((testInfo.project.name === 'mobile-chromium') !== (viewport.name === 'mobile'))
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await prepareScreen(page, screen)
      await page.evaluate(() => document.fonts.ready)
      await expect(page).toHaveScreenshot(`${viewport.name}-${screen}.png`, {
        animations: 'disabled',
        caret: 'hide',
        fullPage: true,
      })
    })
  }
}
