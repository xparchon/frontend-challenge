import { expect, test } from '@playwright/test'

test('mobile visitor can add an NFT and resume checkout after login', async ({ page }) => {
  await page.goto('/market/nfts/emerald-ape-042')
  await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Comprar NFT' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

  await page.getByRole('button', { name: 'Comprar NFT' }).click()
  await expect(page).toHaveURL(/\/cart$/)
  await expect(page.getByRole('link', { name: 'Entrar e finalizar' })).toBeVisible()
  await page.getByRole('link', { name: 'Entrar e finalizar' }).click()

  const form = page.locator('form:visible').last()
  await form.locator('input[name="email"]').fill('nova@kurio.test')
  await form.locator('input[name="password"]').fill('NovaKurio!23')
  await form.getByRole('button', { name: 'Entrar' }).click()

  await expect(page).toHaveURL(/\/checkout/)
  await expect(page.getByText('Emerald Ape #042')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
