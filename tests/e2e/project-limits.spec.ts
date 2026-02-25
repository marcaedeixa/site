import { expect, test } from '@playwright/test'

const EMAIL = 'cardoso.tads@gmail.com'
const PASSWORD = '51D3r41!'

// Limites do plano pago
const MAX_ACTORS = 40
const MAX_OBJECTS = 30

test.use({ viewport: { width: 1280, height: 800 } })

test.describe.serial('Limites do plano pago', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.locator('#email').fill(EMAIL)
    await page.locator('#password').fill(PASSWORD)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await page.waitForURL('**/dashboard', { timeout: 15000 })
  })

  async function criarProjetoEAbrirEditor(page: any, nome: string) {
    await page.getByText('Criar Novo Projeto').first().click()
    const dialog = page.locator('[role="dialog"]')
    await dialog.locator('#name').fill(nome)
    await dialog.getByRole('button', { name: 'Criar Projeto' }).click()
    await expect(dialog).toBeHidden({ timeout: 15000 })
    await page.getByRole('button', { name: 'Abrir Editor' }).first().click()
    await page.waitForURL('**/dashboard/editor/**', { timeout: 15000 })
    await page.waitForTimeout(2000)
  }

  // Gera iniciais únicas: A1, A2, ..., Z9, etc.
  function gerarIniciais(i: number): string {
    const letra = String.fromCharCode(65 + Math.floor((i - 1) / 9))
    const num = ((i - 1) % 9) + 1
    return `${letra}${num}`
  }

  test('limite de atores (máx 40)', async ({ page }) => {
    test.setTimeout(300000)

    await criarProjetoEAbrirEditor(page, `Teste Atores ${Date.now()}`)

    // Criar 40 atores
    for (let i = 1; i <= MAX_ACTORS; i++) {
      await page.getByTitle('Cadastrar Ator').click()

      const modal = page.locator('[role="dialog"]')
      await expect(modal).toBeVisible({ timeout: 5000 })

      // Verificar contagem no modal (ex: "Atores: 0/40")
      await expect(modal.getByText(`Atores: ${i - 1}/${MAX_ACTORS}`)).toBeVisible({ timeout: 5000 })

      await modal.locator('#actorName').fill(`Ator ${i}`)
      await modal.locator('#actorInitials').fill(gerarIniciais(i))
      await modal.getByRole('button', { name: 'Criar Ator' }).click()
      await expect(modal).toBeHidden({ timeout: 10000 })
    }

    // 41º ator: abrir modal e verificar que já está no limite
    await page.getByTitle('Cadastrar Ator').click()
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible({ timeout: 5000 })

    // Verificar contagem 40/40
    await expect(modal.getByText(`Atores: ${MAX_ACTORS}/${MAX_ACTORS}`)).toBeVisible({ timeout: 10000 })

    await modal.locator('#actorName').fill('Ator Extra')
    await modal.locator('#actorInitials').fill('ZZ')
    await modal.getByRole('button', { name: 'Criar Ator' }).click()

    // Deve mostrar erro de limite (modal permanece aberto)
    await expect(modal.getByText(/Limite máximo de \d+ atores/)).toBeVisible({ timeout: 10000 })
    await page.keyboard.press('Escape')
  })

  test('limite de objetos (máx 30)', async ({ page }) => {
    test.setTimeout(300000)

    await criarProjetoEAbrirEditor(page, `Teste Objetos ${Date.now()}`)

    // Criar 30 objetos
    for (let i = 1; i <= MAX_OBJECTS; i++) {
      await page.getByTitle('Cadastrar Objeto').click()

      const modal = page.locator('[role="dialog"]')
      await expect(modal).toBeVisible({ timeout: 5000 })

      await modal.locator('#objectName').fill(`Objeto ${i}`)
      await modal.locator('#objectInitials').fill(gerarIniciais(i))
      await modal.getByRole('button', { name: 'Criar Objeto' }).click()
      await expect(modal).toBeHidden({ timeout: 10000 })
    }

    // 31º objeto: deve falhar
    await page.getByTitle('Cadastrar Objeto').click()
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible({ timeout: 5000 })

    await modal.locator('#objectName').fill('Objeto Extra')
    await modal.locator('#objectInitials').fill('ZZ')
    await modal.getByRole('button', { name: 'Criar Objeto' }).click()

    await expect(modal.getByText(/Limite máximo de \d+ objetos/)).toBeVisible({ timeout: 10000 })
    await page.keyboard.press('Escape')
  })

  test('limite de cenas (máx 300 para plano pago)', async ({ page }) => {
    test.setTimeout(600000) // 10 min

    // Abrir o projeto que já tem palco criado (pelo usuário)
    const searchInput = page.locator('input[placeholder="Buscar projetos..."]')
    await searchInput.fill('Teste Cenas')
    await page.waitForTimeout(1000)

    const editorBtn = page.getByRole('button', { name: 'Abrir Editor' }).first()
    await editorBtn.click()
    await page.waitForURL('**/dashboard/editor/**', { timeout: 15000 })
    await page.waitForTimeout(2000)

    const novaCenaBtn = page.getByRole('button', { name: 'Nova Cena' })

    // Agora usa o limite correto do plano pago (300)
    const effectiveLimit = 300

    // Handler global para capturar alerta de limite
    let limitMessage = ''
    page.on('dialog', async (dialog) => {
      limitMessage = dialog.message()
      await dialog.accept()
    })

    for (let i = 1; i <= effectiveLimit + 1; i++) {
      await novaCenaBtn.click()
      await page.waitForTimeout(150)

      if (limitMessage) {
        expect(limitMessage).toContain(`Limite máximo de ${effectiveLimit} cenas`)
        return
      }
    }

    throw new Error(`Esperava atingir limite de ${effectiveLimit} cenas, mas não houve alerta`)
  })
})
