import puppeteer from 'puppeteer'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const TEST_EMAIL = 'teste@marcaedeixa.com'
const TEST_PASSWORD = 'senha123'
const APP_URL = 'http://localhost:3002'

async function testProjectCreationWithPuppeteer() {
  console.log('🚀 Iniciando teste de criação de projeto com Puppeteer...\n')

  let browser
  let page

  try {
    // Lançar browser
    console.log('🌐 Abrindo browser...')
    browser = await puppeteer.launch({
      headless: false, // Mostrar browser para debug
      defaultViewport: { width: 1280, height: 720 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    page = await browser.newPage()

    // Configurar console logs
    page.on('console', msg => {
      console.log(`🖥️  Console [${msg.type()}]:`, msg.text())
    })

    page.on('pageerror', error => {
      console.log(`❌ Erro na página:`, error.message)
    })

    // 1. Navegar para a página de login
    console.log('🔐 Navegando para página de login...')
    await page.goto(`${APP_URL}/login`, { waitUntil: 'networkidle2' })

    // Aguardar um pouco para a página carregar
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Tirar screenshot do login
    await page.screenshot({ path: 'login-page.png', fullPage: true })
    console.log('📸 Screenshot do login salva: login-page.png')

    // 2. Fazer login
    console.log('📝 Preenchendo formulário de login...')
    
    // Aguardar campos aparecerem
    await page.waitForSelector('input[type="email"]', { timeout: 10000 })
    await page.waitForSelector('input[type="password"]', { timeout: 10000 })

    // Preencher email
    await page.type('input[type="email"]', TEST_EMAIL)
    await new Promise(resolve => setTimeout(resolve, 500))

    // Preencher senha
    await page.type('input[type="password"]', TEST_PASSWORD)
    await new Promise(resolve => setTimeout(resolve, 500))

    // Clicar no botão de login
    await page.click('button[type="submit"]')
    console.log('✅ Formulário de login enviado')

    // Aguardar redirecionamento para dashboard
    console.log('⏳ Aguardando redirecionamento...')
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 })

    // Verificar se chegou no dashboard
    const currentUrl = page.url()
    console.log(`📍 URL atual: ${currentUrl}`)

    if (currentUrl.includes('/dashboard')) {
      console.log('✅ Login realizado com sucesso!')
    } else {
      console.log('❌ Login falhou - não redirecionou para dashboard')
      await page.screenshot({ path: 'login-failed.png', fullPage: true })
      return
    }

    // Tirar screenshot do dashboard
    await page.screenshot({ path: 'dashboard-page.png', fullPage: true })
    console.log('📸 Screenshot do dashboard salva: dashboard-page.png')

    // 3. Tentar criar um projeto
    console.log('\n📁 Tentando criar um novo projeto...')

    // Procurar botão de criar projeto
    const createButtons = [
      'button:contains("Criar Projeto")',
      'button:contains("Novo Projeto")',
      'button:contains("+")',
      '[data-testid="create-project"]',
      '.create-project-btn',
      'button[aria-label*="criar"]',
      'button[aria-label*="novo"]'
    ]

    let createButtonFound = false
    for (const selector of createButtons) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 })
        console.log(`✅ Botão encontrado: ${selector}`)
        await page.click(selector)
        createButtonFound = true
        break
      } catch (error) {
        console.log(`❌ Botão não encontrado: ${selector}`)
      }
    }

    if (!createButtonFound) {
      console.log('🔍 Procurando por qualquer botão na página...')
      const buttons = await page.$$eval('button', buttons => 
        buttons.map(btn => ({
          text: btn.textContent?.trim(),
          className: btn.className,
          id: btn.id
        }))
      )
      console.log('🔘 Botões encontrados:', buttons)

      // Tentar clicar no primeiro botão que pareça ser de criar
      const possibleButtons = buttons.filter(btn => 
        btn.text?.toLowerCase().includes('criar') ||
        btn.text?.toLowerCase().includes('novo') ||
        btn.text?.includes('+')
      )

      if (possibleButtons.length > 0) {
        console.log('🎯 Tentando clicar em:', possibleButtons[0])
        await page.evaluate((buttonText) => {
          const buttons = Array.from(document.querySelectorAll('button'))
          const targetButton = buttons.find(btn => btn.textContent?.trim() === buttonText)
          if (targetButton) targetButton.click()
        }, possibleButtons[0].text)
        createButtonFound = true
      }
    }

    if (createButtonFound) {
      console.log('✅ Botão de criar projeto clicado!')
      
      // Aguardar modal ou formulário aparecer
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Tirar screenshot do modal
      await page.screenshot({ path: 'create-project-modal.png', fullPage: true })
      console.log('📸 Screenshot do modal salva: create-project-modal.png')

      // Procurar campos do formulário
      console.log('📝 Procurando campos do formulário...')
      
      const nameInput = await page.$('input[name="name"], input[placeholder*="nome"], input[placeholder*="Nome"]')
      const descInput = await page.$('input[name="description"], textarea[name="description"], input[placeholder*="descrição"], textarea[placeholder*="descrição"]')

      if (nameInput) {
        console.log('✅ Campo nome encontrado')
        await nameInput.type('Projeto Teste Puppeteer')
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      if (descInput) {
        console.log('✅ Campo descrição encontrado')
        await descInput.type('Projeto criado automaticamente via Puppeteer para testar RLS')
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      // Procurar botão de salvar/criar
      const saveButtons = [
        'button:contains("Criar")',
        'button:contains("Salvar")',
        'button[type="submit"]',
        'button:contains("Confirmar")'
      ]

      let saveButtonFound = false
      for (const selector of saveButtons) {
        try {
          await page.waitForSelector(selector, { timeout: 2000 })
          console.log(`✅ Botão salvar encontrado: ${selector}`)
          await page.click(selector)
          saveButtonFound = true
          break
        } catch (error) {
          console.log(`❌ Botão salvar não encontrado: ${selector}`)
        }
      }

      if (saveButtonFound) {
        console.log('✅ Formulário enviado!')
        
        // Aguardar resposta
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        // Verificar se houve erro ou sucesso
        const errorMessages = await page.$$eval('[role="alert"], .error, .alert-error', 
          elements => elements.map(el => el.textContent?.trim())
        )

        const successMessages = await page.$$eval('.success, .alert-success, [role="status"]', 
          elements => elements.map(el => el.textContent?.trim())
        )

        if (errorMessages.length > 0) {
          console.log('❌ Erros encontrados:', errorMessages)
        }

        if (successMessages.length > 0) {
          console.log('✅ Mensagens de sucesso:', successMessages)
        }

        // Tirar screenshot final
        await page.screenshot({ path: 'after-create-project.png', fullPage: true })
        console.log('📸 Screenshot final salva: after-create-project.png')

        // Verificar se projeto apareceu na lista
        await new Promise(resolve => setTimeout(resolve, 2000))
        const projectCards = await page.$$eval('[data-testid*="project"], .project-card, .project-item', 
          elements => elements.map(el => el.textContent?.trim())
        )

        if (projectCards.length > 0) {
          console.log('✅ Projetos encontrados na página:', projectCards)
        } else {
          console.log('❌ Nenhum projeto encontrado na página')
        }

      } else {
        console.log('❌ Botão de salvar não encontrado')
      }

    } else {
      console.log('❌ Botão de criar projeto não encontrado')
    }

    // Aguardar um pouco antes de fechar
    console.log('\n⏳ Aguardando 5 segundos antes de fechar...')
    await new Promise(resolve => setTimeout(resolve, 5000))

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message)
    
    if (page) {
      await page.screenshot({ path: 'error-screenshot.png', fullPage: true })
      console.log('📸 Screenshot do erro salva: error-screenshot.png')
    }
  } finally {
    if (browser) {
      await browser.close()
      console.log('🔒 Browser fechado')
    }
  }

  console.log('\n🎉 Teste concluído!')
  console.log('📁 Verifique as screenshots geradas para análise visual')
}

// Executar teste
testProjectCreationWithPuppeteer().catch(console.error)