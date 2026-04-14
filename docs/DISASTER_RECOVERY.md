# Plano de Recuperação de Desastres — CasaGeri

## Visão Geral

| Métrica | Alvo |
|---------|------|
| RTO (Recovery Time Objective) | 2 horas |
| RPO (Recovery Point Objective) | 24 horas (Supabase PITR: segundos para plano Pro) |
| Janela de backup | Diário às 03:00 (health-check) |
| Retenção de backup | 7 dias (gratuito) / 30 dias (Pro) via Supabase PITR |

---

## Arquitetura de Backup

O banco de dados é gerenciado pelo **Supabase**:
- **Point-in-Time Recovery (PITR)** disponível no plano Pro — restauração para qualquer segundo dos últimos 7–30 dias
- **Backups diários automáticos** feitos pela Supabase em todos os planos
- **Health-check diário às 03:00** — o sistema loga contagem de casas/residentes/usuários para validar conectividade

---

## Cenário 1: Banco de dados inacessível

**Sintomas:** API retorna 500, logs mostram erros de conexão Prisma

**Ações (0–30 min):**
1. Acesse o [painel Supabase](https://supabase.com/dashboard)
2. Verifique o status do projeto em **Database → Overview**
3. Se o projeto estiver pausado (plano gratuito pausa após 7 dias de inatividade): clique em **Restore project**
4. Aguarde 2–5 minutos para o banco reiniciar
5. Verifique o `/health` da API: `https://[api-url]/health`

**Se o banco estiver corrompido (30–120 min):**
1. Acesse Supabase → **Database → Backups**
2. Selecione o último backup antes do incidente
3. Clique em **Restore** (cria um novo projeto com os dados)
4. Atualize a variável `DATABASE_URL` no Vercel com a nova connection string
5. Execute `pnpm db:push` para garantir que o schema está sincronizado
6. Faça redeploy da API no Vercel

---

## Cenário 2: Deploy com bug crítico (rollback)

**Sintomas:** Funcionalidade quebrada após deploy recente

**Ações (0–15 min):**
1. Acesse o painel do Vercel → projeto da API ou web
2. Clique em **Deployments**
3. Encontre o último deploy estável (antes do problema)
4. Clique em **Promote to Production** para fazer rollback imediato

---

## Cenário 3: Vazamento de credenciais

**Sintomas:** Acesso suspeito nos logs, JWT comprometido

**Ações imediatas:**
1. Acesse Supabase → **Database → Connection Pooling** → rotacione a senha do banco
2. Gere novo `JWT_SECRET` (mínimo 256 bits aleatórios)
3. Atualize as variáveis no Vercel → dispare novo deploy
4. Todos os tokens existentes serão invalidados (usuários precisarão fazer login novamente)
5. Revise os logs de audit do sistema para identificar ações suspeitas

---

## Cenário 4: Servidor de jobs (Redis) indisponível

**Sintomas:** Notificações de medicamentos param; crons não executam

**Impacto:** Apenas jobs assíncronos. O CRUD e a interface continuam funcionando normalmente.

**Ações:**
- Em produção (Vercel): Redis/Bull não são utilizados (ambiente serverless). Crons são gerenciados externamente.
- Em desenvolvimento local: reinicie o serviço Redis com `redis-server`

---

## Contatos de Emergência

| Função | Responsável | Contato |
|--------|------------|---------|
| Desenvolvedor | Henrique Mombach | GitHub: @henriquemombach08-oss |
| Suporte Supabase | — | https://supabase.com/support |
| Suporte Vercel | — | https://vercel.com/support |

---

## Checklist Pós-Incidente

- [ ] Causa raiz identificada
- [ ] Sistema restaurado e validado
- [ ] Usuários notificados sobre o incidente e resolução
- [ ] Documentação atualizada com lições aprendidas
- [ ] Medidas preventivas implementadas
