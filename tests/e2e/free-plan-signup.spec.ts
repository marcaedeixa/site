import { expect, test } from '@playwright/test'

test('login e acesso ao painel principal', async ({ page }) => {
  // 1. Abre a página de login
  await page.goto('/login')

  // 2. Preenche email e senha
  await page.locator('#email').fill('cardoso.tads@gmail.com')
  await page.locator('#password').fill('51D3r41!')

  // 3. Clica em "Entrar"
  await page.getByRole('button', { name: 'Entrar' }).click()

  // 4. Aguarda redirecionamento para o dashboard
  await page.waitForURL('**/dashboard', { timeout: 15000 })
  await expect(page).toHaveURL(/\/dashboard/)
})
