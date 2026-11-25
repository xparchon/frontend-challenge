import { expect, test } from '@playwright/test'

test('authentication dialog supports keyboard focus, escape, and focus restoration', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')

  const trigger = page.getByRole('button', { name: 'Entrar', exact: true })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Entrar na Kurio' })
  const email = dialog.getByRole('textbox', { name: 'E-mail' })
  await expect(email).toBeFocused()

  await page.keyboard.press('Tab')
  await expect(dialog.getByLabel('Senha')).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(email).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
})
