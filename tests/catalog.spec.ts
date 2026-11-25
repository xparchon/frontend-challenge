import { expect, test } from '@playwright/test'

test('catalog pagination, combined filters, sorting, reload, and history stay in the URL', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/market')
  await expect(page.getByRole('link', { name: /Emerald Ape #042/ })).toBeVisible()

  await page.getByRole('button', { name: '2', exact: true }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(page.getByRole('link', { name: /Crimson Echo #318/ })).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/page=1/)
  await expect(page.getByRole('link', { name: /Emerald Ape #042/ })).toBeVisible()

  await page.getByRole('textbox', { name: 'Buscar NFTs' }).fill('Cosmic')
  await expect(page.getByRole('link', { name: /Cosmic Bloom #118/ })).toBeVisible()
  await page.getByRole('button', { name: 'Arte digital' }).click()
  await page.getByRole('button', { name: /Ethereum/ }).click()
  await page.getByLabel('Ordenar NFTs').selectOption('price-asc')

  const search = new URL(page.url()).searchParams
  expect(search.get('search')).toBe('Cosmic')
  expect(search.get('category')).toBe('Arte digital')
  expect(search.get('network')).toBe('Ethereum')
  expect(search.get('sort')).toBe('price-asc')
  expect(search.get('page')).toBe('1')

  await page.reload()
  await expect(page.getByRole('link', { name: /Cosmic Bloom #118/ })).toBeVisible()
  await page.goBack()
  await expect.poll(() => new URL(page.url()).searchParams.get('sort')).toBe('recent')
  await page.goForward()
  await expect.poll(() => new URL(page.url()).searchParams.get('sort')).toBe('price-asc')
})

test('direct access to a missing NFT presents a not-found state', async ({ page }) => {
  await page.goto('/market/nfts/nonexistent-nft')
  await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Voltar ao marketplace' })).toBeVisible()
})
