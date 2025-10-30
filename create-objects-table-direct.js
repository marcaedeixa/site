// Script para criar a tabela objects diretamente
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Variáveis de ambiente não encontradas!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createObjectsTable() {
  console.log('🚀 Criando tabela objects...\n')

  try {
    // 1. Criar a tabela objects
    console.log('🔄 Criando tabela objects...')
    const { error: createTableError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS objects (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          name VARCHAR(100) NOT NULL,
          initials VARCHAR(3) NOT NULL,
          color VARCHAR(7) DEFAULT '#3B82F6',
          notes TEXT,
          appearance_config JSONB DEFAULT '{
            "shape": "square",
            "width": 80,
            "height": 80,
            "strokeDasharray": "5,5"
          }'::jsonb,
          position_x FLOAT DEFAULT 0,
          position_y FLOAT DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    })

    if (createTableError) {
      console.log('⚠️  Erro ao criar tabela:', createTableError.message)
    } else {
      console.log('✅ Tabela objects criada com sucesso!')
    }

    // 2. Criar índices
    console.log('🔄 Criando índices...')
    const { error: indexError } = await supabase.rpc('exec', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_objects_project_id ON objects(project_id);
        CREATE INDEX IF NOT EXISTS idx_objects_user_id ON objects(user_id);
        CREATE INDEX IF NOT EXISTS idx_objects_project_user ON objects(project_id, user_id);
      `
    })

    if (indexError) {
      console.log('⚠️  Erro ao criar índices:', indexError.message)
    } else {
      console.log('✅ Índices criados com sucesso!')
    }

    // 3. Habilitar RLS
    console.log('🔄 Habilitando RLS...')
    const { error: rlsError } = await supabase.rpc('exec', {
      sql: `ALTER TABLE objects ENABLE ROW LEVEL SECURITY;`
    })

    if (rlsError) {
      console.log('⚠️  Erro ao habilitar RLS:', rlsError.message)
    } else {
      console.log('✅ RLS habilitado com sucesso!')
    }

    // 4. Criar políticas RLS
    console.log('🔄 Criando políticas RLS...')
    const policies = [
      {
        name: 'SELECT policy',
        sql: `
          CREATE POLICY "Users can view objects from their projects" ON objects
            FOR SELECT USING (
              project_id IN (
                SELECT id FROM projects WHERE user_id = auth.uid()
              )
            );
        `
      },
      {
        name: 'INSERT policy',
        sql: `
          CREATE POLICY "Users can insert objects in their projects" ON objects
            FOR INSERT WITH CHECK (
              project_id IN (
                SELECT id FROM projects WHERE user_id = auth.uid()
              )
            );
        `
      },
      {
        name: 'UPDATE policy',
        sql: `
          CREATE POLICY "Users can update objects in their projects" ON objects
            FOR UPDATE USING (
              project_id IN (
                SELECT id FROM projects WHERE user_id = auth.uid()
              )
            );
        `
      },
      {
        name: 'DELETE policy',
        sql: `
          CREATE POLICY "Users can delete objects in their projects" ON objects
            FOR DELETE USING (
              project_id IN (
                SELECT id FROM projects WHERE user_id = auth.uid()
              )
            );
        `
      }
    ]

    for (const policy of policies) {
      const { error: policyError } = await supabase.rpc('exec', { sql: policy.sql })
      if (policyError) {
        console.log(`⚠️  Erro ao criar ${policy.name}:`, policyError.message)
      } else {
        console.log(`✅ ${policy.name} criada com sucesso!`)
      }
    }

    // 5. Conceder permissões
    console.log('🔄 Concedendo permissões...')
    const { error: grantError } = await supabase.rpc('exec', {
      sql: `
        GRANT ALL ON objects TO authenticated;
        GRANT USAGE ON SCHEMA public TO authenticated;
      `
    })

    if (grantError) {
      console.log('⚠️  Erro ao conceder permissões:', grantError.message)
    } else {
      console.log('✅ Permissões concedidas com sucesso!')
    }

    console.log('\n🎉 Tabela objects configurada com sucesso!')

  } catch (err) {
    console.error('❌ Erro geral:', err.message)
    process.exit(1)
  }
}

createObjectsTable()