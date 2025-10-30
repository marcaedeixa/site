const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function checkAndFixRLS() {
  console.log('🔒 Verificando e corrigindo políticas de RLS...\n')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.log('❌ Configurações do Supabase não encontradas!')
    return
  }
  
  // Usar service role para verificar e criar políticas
  const supabase = createClient(supabaseUrl, serviceRoleKey)
  
  try {
    // 1. Verificar se RLS está habilitado
    console.log('1. 🔍 Verificando status do RLS...')
    const { data: tableInfo, error: tableError } = await supabase
      .from('pg_tables')
      .select('*')
      .eq('tablename', 'projects')
      .eq('schemaname', 'public')
    
    if (tableError) {
      console.log('⚠️ Não foi possível verificar tabela via pg_tables')
    } else {
      console.log('✅ Tabela projects encontrada')
    }
    
    // 2. Verificar políticas existentes
    console.log('\n2. 📋 Verificando políticas existentes...')
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'projects')
    
    if (policiesError) {
      console.log('⚠️ Erro ao verificar políticas:', policiesError.message)
    } else {
      console.log('📋 Políticas encontradas:', policies.length)
      policies.forEach(policy => {
        console.log(`   - ${policy.policyname} (${policy.cmd}) - ${policy.qual}`)
      })
    }
    
    // 3. Criar políticas necessárias se não existirem
    console.log('\n3. 🛠️ Criando políticas de RLS...')
    
    const policies_to_create = [
      {
        name: 'projects_select_policy',
        sql: `
          CREATE POLICY "projects_select_policy" ON "public"."projects"
          AS PERMISSIVE FOR SELECT
          TO authenticated
          USING (auth.uid() = user_id);
        `
      },
      {
        name: 'projects_insert_policy', 
        sql: `
          CREATE POLICY "projects_insert_policy" ON "public"."projects"
          AS PERMISSIVE FOR INSERT
          TO authenticated
          WITH CHECK (auth.uid() = user_id);
        `
      },
      {
        name: 'projects_update_policy',
        sql: `
          CREATE POLICY "projects_update_policy" ON "public"."projects"
          AS PERMISSIVE FOR UPDATE
          TO authenticated
          USING (auth.uid() = user_id)
          WITH CHECK (auth.uid() = user_id);
        `
      },
      {
        name: 'projects_delete_policy',
        sql: `
          CREATE POLICY "projects_delete_policy" ON "public"."projects"
          AS PERMISSIVE FOR DELETE
          TO authenticated
          USING (auth.uid() = user_id);
        `
      }
    ]
    
    for (const policy of policies_to_create) {
      try {
        console.log(`   Criando política: ${policy.name}...`)
        const { error } = await supabase.rpc('exec_sql', { sql: policy.sql })
        
        if (error) {
          if (error.message.includes('already exists')) {
            console.log(`   ✅ Política ${policy.name} já existe`)
          } else {
            console.log(`   ❌ Erro ao criar ${policy.name}:`, error.message)
          }
        } else {
          console.log(`   ✅ Política ${policy.name} criada com sucesso`)
        }
      } catch (err) {
        // Tentar criar diretamente via SQL
        try {
          const { error: directError } = await supabase
            .from('_sql')
            .insert({ query: policy.sql })
          
          if (directError) {
            console.log(`   ⚠️ Não foi possível criar ${policy.name} automaticamente`)
            console.log(`   📝 Execute manualmente no Supabase SQL Editor:`)
            console.log(`   ${policy.sql}`)
          }
        } catch (directErr) {
          console.log(`   ⚠️ Política ${policy.name} precisa ser criada manualmente`)
        }
      }
    }
    
    // 4. Habilitar RLS se não estiver habilitado
    console.log('\n4. 🔐 Habilitando RLS na tabela projects...')
    try {
      const { error: rlsError } = await supabase.rpc('exec_sql', { 
        sql: 'ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;' 
      })
      
      if (rlsError) {
        if (rlsError.message.includes('already enabled')) {
          console.log('   ✅ RLS já está habilitado')
        } else {
          console.log('   ❌ Erro ao habilitar RLS:', rlsError.message)
        }
      } else {
        console.log('   ✅ RLS habilitado com sucesso')
      }
    } catch (err) {
      console.log('   ⚠️ Execute manualmente: ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;')
    }
    
    console.log('\n📝 POLÍTICAS NECESSÁRIAS PARA A TABELA PROJECTS:')
    console.log('   Se as políticas não foram criadas automaticamente, execute no Supabase SQL Editor:')
    console.log('')
    policies_to_create.forEach(policy => {
      console.log(policy.sql)
      console.log('')
    })
    
  } catch (err) {
    console.log('❌ Erro inesperado:', err.message)
  }
}

checkAndFixRLS()