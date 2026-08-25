# Migrations

As migrations são aplicadas em **ordem alfabética do nome do arquivo**. Como
dígitos ordenam antes de letras, um arquivo sem prefixo numérico roda depois de
todos os numerados — independentemente de quando foi escrito.

Por isso **todo arquivo aqui usa o prefixo `NNN_`**, sem exceção.

## Ordem atual

| # | Arquivo | Cria |
|---|---|---|
| 001 | `create_subscription_system` | `subscription_plans`, `user_subscriptions`, `subscription_history` + a função `update_updated_at_column()` |
| 002 | `create_user_actions_table` | `user_actions` |
| 003 | `create_stripe_tables` | `stripe_customers`, `stripe_subscriptions`, `stripe_payments`, `stripe_webhook_events` |
| 004 | `create_projects_table` | `projects` |
| 005 | `fix_projects_rls` | — (ajusta RLS de `projects`) |
| 006 | `create_admin_users_table` | `admin_users`, `admin_access_logs` |
| 007 | `create_project_data_table` | `project_data` |
| 008 | `create_project_shares` | `project_shares` |
| 009 | `create_landing_page_content` | `landing_page_content` |
| 010 | `create_objects_table` | `objects` |
| 011 | `create_actors_table` | `actors` |
| 012 | `alter_actors_add_missing_columns` | — (altera `actors`) |

## Dependências que a ordem precisa respeitar

- **`001` primeiro, sempre.** Ela define `update_updated_at_column()`, usada por
  triggers em 003, 004, 007, 008, 010 e 011.
- **`004` antes de 007, 008, 010 e 011** — todas referenciam `projects`.
- **`006` antes de `009`** — a política RLS de `landing_page_content` consulta
  `admin_users` dentro de um `EXISTS (SELECT 1 FROM admin_users ...)`.
- **`007` antes de `008`** — `project_shares` cria uma política RLS sobre `project_data`.
- **`011` antes de `012`** — não dá para alterar `actors` antes de criá-la.

## Antes de commitar qualquer migration nova

```bash
node scripts/check-migration-order.js
```

O script percorre os arquivos na ordem em que serão aplicados e falha se algum
referenciar tabela ou função que ainda não existe. Ele detecta dependências em `REFERENCES`, `ALTER TABLE`, `CREATE POLICY ... ON`
e também dentro de subconsultas (`EXISTS (SELECT 1 FROM outra_tabela ...)`) —
este último caso foi o que derrubou a primeira tentativa de aplicação.

## Aplicar tudo num banco novo

```bash
node scripts/build-migration-bundle.js
```

Gera `supabase/bundle.generated.sql` com as 12 migrations concatenadas na ordem
certa, pronto para colar no SQL Editor do Supabase. O arquivo é gerado e está
no `.gitignore` — a fonte da verdade são os arquivos desta pasta.

## Scripts de diagnóstico

Consultas de inspeção que **não** alteram schema ficam em `supabase/diagnostics/`,
fora desta pasta, para não entrarem na sequência de aplicação.
