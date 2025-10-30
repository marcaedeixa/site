# 🔧 Guia para Corrigir Configurações do Supabase

## ❌ **Problema Identificado:**
O link de confirmação de email está redirecionando para `http://localhost:3000` em vez do domínio de produção `https://marcaedeixa.vercel.app`.

## ✅ **Solução:**

### **Passo 1: Acesse o Painel do Supabase**
1. Vá para: https://supabase.com/dashboard
2. Faça login na sua conta
3. Selecione o projeto: `bxveecbtbleosmiijdrk`

### **Passo 2: Navegue para Configurações de Autenticação**
1. No painel lateral esquerdo, clique em **"Authentication"**
2. Clique em **"URL Configuration"**

### **Passo 3: Atualize as Configurações**

#### **Site URL:**
```
https://marcaedeixa.vercel.app
```

#### **Redirect URLs (adicione todas essas linhas):**
```
https://marcaedeixa.vercel.app/auth/callback
https://marcaedeixa-*.vercel.app/auth/callback
http://localhost:3000/auth/callback
```

### **Passo 4: Configurações Adicionais**
1. Vá em **Authentication** → **Settings**
2. Verifique se estão ativadas:
   - ✅ **Enable email confirmations**
   - ✅ **Enable email change confirmations**
   - ❌ **Enable phone confirmations** (opcional)

### **Passo 5: Salvar e Testar**
1. Clique em **"Save"** para salvar as configurações
2. Aguarde alguns minutos para as mudanças propagarem
3. Teste com um novo registro de usuário

## 🎯 **Resultado Esperado:**
Após essas configurações, os links de confirmação de email devem redirecionar para:
```
https://marcaedeixa.vercel.app/auth/callback
```

## ⚠️ **Notas Importantes:**
- As mudanças podem levar 2-5 minutos para propagar
- Use um email diferente para testar após as alterações
- Se ainda houver problemas, limpe o cache do navegador
- A página `/auth/callback` já foi criada e está funcionando

## 🔍 **Como Verificar se Funcionou:**
1. Registre um novo usuário em: https://marcaedeixa.vercel.app/login
2. Verifique o email de confirmação
3. O link deve redirecionar para: `https://marcaedeixa.vercel.app/auth/callback`
4. Após confirmação, você deve ser redirecionado para o dashboard

## 📞 **Suporte:**
Se ainda houver problemas após seguir este guia, verifique:
- Se todas as URLs foram salvas corretamente
- Se não há espaços extras nas configurações
- Se o projeto Supabase está ativo e funcionando