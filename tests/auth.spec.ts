import { expect, test } from '@playwright/test'

test('one mobile visibility control toggles both registration password fields', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/register')

  const form = page.locator('form').first()
  await expect(page.getByRole('button', { name: 'Mostrar senha' })).toHaveCount(1)
  await expect(form.locator('input[name="password"]')).toHaveAttribute('type', 'password')
  await expect(form.locator('input[name="confirmPassword"]')).toHaveAttribute('type', 'password')

  await page.getByRole('button', { name: 'Mostrar senha' }).click()
  await expect(form.locator('input[name="password"]')).toHaveAttribute('type', 'text')
  await expect(form.locator('input[name="confirmPassword"]')).toHaveAttribute('type', 'text')

  await page.getByRole('button', { name: 'Ocultar senha' }).click()
  await expect(form.locator('input[name="password"]')).toHaveAttribute('type', 'password')
  await expect(form.locator('input[name="confirmPassword"]')).toHaveAttribute('type', 'password')

  const username = `mobile${Date.now()}`
  await form.locator('input[name="username"]').fill(username)
  await form.locator('input[name="email"]').fill(`${username}@kurio.test`)
  await form.locator('input[name="password"]').fill('ContaNova!23')
  await form.locator('input[name="confirmPassword"]').fill('ContaNova!23')
  await form.getByRole('button', { name: 'Criar perfil' }).click()

  await expect(page).toHaveURL(/\/\?search=/)
  await expect(page.getByRole('link', { name: 'Perfil' })).toBeVisible()
})

test('logs in, restores the session after refresh, and logs out', async ({ page }) => {
  await page.goto('/login')
  const form = page.locator('form').last()
  await form.locator('input[name="email"]').fill('nova@kurio.test')
  await form.locator('input[name="password"]').fill('NovaKurio!23')
  await form.getByRole('button', { name: 'Entrar' }).click()

  await expect(page).toHaveURL(/\/\?search=/)
  await expect(page.getByRole('link', { name: 'Nova Reserva' })).toBeVisible()
  const sessionLifetime = await page.evaluate(() => {
    const stored = localStorage.getItem('kurio.session')
    if (!stored) throw new Error('Persistent session was not stored.')
    return Date.parse((JSON.parse(stored) as { expiresAt: string }).expiresAt) - Date.now()
  })
  expect(sessionLifetime).toBeGreaterThan(29 * 24 * 60 * 60 * 1000)

  await page.reload()
  await expect(page.getByRole('link', { name: 'Nova Reserva' })).toBeVisible()
  await page.goto('/profile')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()
  await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('button', { name: 'Sair' }).click()
  await expect(page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('button', { name: 'Entrar' })).toBeVisible()
})

test('expired session returns to login and resumes checkout after reauthentication', async ({ page }) => {
  await page.goto('/login')
  const form = page.locator('form').last()
  await form.locator('input[name="email"]').fill('nova@kurio.test')
  await form.locator('input[name="password"]').fill('NovaKurio!23')
  await form.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/\?search=/)

  await page.goto('/checkout')
  await page.evaluate(() => {
    const stored = localStorage.getItem('kurio.session')
    if (!stored) throw new Error('Persistent session was not stored.')
    const session = JSON.parse(stored) as { expiresAt: string }
    session.expiresAt = new Date(Date.now() - 1_000).toISOString()
    localStorage.setItem('kurio.session', JSON.stringify(session))
  })
  await page.reload()
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fcheckout/)

  const loginForm = page.locator('form').last()
  await loginForm.locator('input[name="email"]').fill('nova@kurio.test')
  await loginForm.locator('input[name="password"]').fill('NovaKurio!23')
  await loginForm.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/checkout/)
  await expect(page.getByText('Seu carrinho está vazio.')).toBeVisible()
})

test('requires a session for private routes and resumes the requested route after login', async ({ page }) => {
  await page.goto('/profile')
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fprofile/)

  const form = page.locator('form').last()
  await form.locator('input[name="email"]').fill('nova@kurio.test')
  await form.locator('input[name="password"]').fill('NovaKurio!23')
  await form.getByRole('button', { name: 'Entrar' }).click()

  await expect(page).toHaveURL(/\/profile/)
  await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()
  await page.getByRole('complementary').getByRole('button', { name: 'Sair' }).click()
  await expect(page).toHaveURL(/\/login/)
})

test('creates an account and starts a persistent session', async ({ page }) => {
  const username = `colecionador${Date.now()}`
  await page.goto('/register')

  const form = page.locator('form').last()
  await form.locator('input[name="username"]').fill(username)
  await form.locator('input[name="email"]').fill(`${username}@kurio.test`)
  await form.locator('input[name="password"]').fill('ContaNova!23')
  await form.locator('input[name="confirmPassword"]').fill('ContaNova!23')
  await form.getByRole('button', { name: 'Criar conta' }).click()

  await expect(page).toHaveURL(/\/\?search=/)
  await expect(page.getByRole('link', { name: username })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('link', { name: username })).toBeVisible()
})

test('shows credential, password confirmation, and duplicate account errors', async ({ page }) => {
  await page.goto('/login')
  const loginForm = page.locator('form').last()
  await loginForm.locator('input[name="email"]').fill('nova@kurio.test')
  await loginForm.locator('input[name="password"]').fill('senha-incorreta')
  await loginForm.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('alert')).toHaveText('E-mail ou senha incorretos.')

  await page.goto('/register')
  const registerForm = page.locator('form').last()
  await registerForm.locator('input[name="username"]').fill('nova.kurio')
  await registerForm.locator('input[name="email"]').fill('nova@kurio.test')
  await registerForm.locator('input[name="password"]').fill('ContaNova!23')
  await registerForm.locator('input[name="confirmPassword"]').fill('OutraSenha!23')
  await registerForm.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page.getByRole('alert')).toHaveText('As senhas não correspondem.')

  await registerForm.locator('input[name="confirmPassword"]').fill('ContaNova!23')
  await registerForm.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page.getByRole('alert')).toHaveText('E-mail ou nome de usuário já cadastrado.')
})
