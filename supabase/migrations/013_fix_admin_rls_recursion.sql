-- =============================================
-- Corrige recursão infinita nas políticas de admin_users
-- =============================================
--
-- Problema (erro 42P17):
--   As políticas de admin_users consultavam a própria admin_users num
--   EXISTS (SELECT 1 FROM admin_users ...). O Postgres avalia a política,
--   que lê a tabela, que dispara a política de novo — laço infinito.
--   Qualquer SELECT em admin_users, admin_access_logs ou
--   landing_page_content retornava erro.
--
-- Solução:
--   Isolar a checagem em funções SECURITY DEFINER. Elas executam com os
--   privilégios do dono da tabela, que não está sujeito a RLS, então a
--   leitura interna não reentra na política.
--
--   search_path fica fixo para a função não poder ser sequestrada por um
--   schema malicioso no caminho de busca.

-- ---------------------------------------------
-- Funções auxiliares
-- ---------------------------------------------

CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.id::text = auth.uid()::text
      AND admin_users.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.id::text = auth.uid()::text
      AND admin_users.role = 'super_admin'
      AND admin_users.is_active = true
  );
$$;

COMMENT ON FUNCTION public.is_active_admin() IS
  'Checa se o usuário autenticado é admin ativo. SECURITY DEFINER para não reentrar no RLS de admin_users.';
COMMENT ON FUNCTION public.is_active_super_admin() IS
  'Checa se o usuário autenticado é super_admin ativo. SECURITY DEFINER para não reentrar no RLS de admin_users.';

REVOKE ALL ON FUNCTION public.is_active_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_super_admin() TO authenticated;

-- ---------------------------------------------
-- admin_users
-- ---------------------------------------------

DROP POLICY IF EXISTS "Super admins can view all admin users" ON admin_users;
DROP POLICY IF EXISTS "Super admins can manage admin users" ON admin_users;

-- "Admin users can view their own data" é mantida: compara auth.uid() com a
-- própria linha, sem ler a tabela, então não recursiona.

CREATE POLICY "Super admins can view all admin users" ON admin_users
  FOR SELECT USING (public.is_active_super_admin());

CREATE POLICY "Super admins can manage admin users" ON admin_users
  FOR ALL USING (public.is_active_super_admin());

-- ---------------------------------------------
-- admin_access_logs
-- ---------------------------------------------

DROP POLICY IF EXISTS "Super admins can view all logs" ON admin_access_logs;

CREATE POLICY "Super admins can view all logs" ON admin_access_logs
  FOR SELECT USING (public.is_active_super_admin());

-- ---------------------------------------------
-- landing_page_content
-- ---------------------------------------------
-- A política de escrita lia admin_users diretamente e era arrastada para a
-- mesma recursão. A de leitura pública (USING true) fica como está — a
-- landing page precisa ser legível por visitante anônimo.

DROP POLICY IF EXISTS "landing_page_content_admin" ON landing_page_content;

CREATE POLICY "landing_page_content_admin" ON landing_page_content
  FOR ALL USING (public.is_active_admin());
