# Manual do Administrador — CasaGeri

## Acesso ao Sistema

1. Acesse a URL do sistema no navegador
2. Faça login com email e senha de administrador
3. Você será redirecionado para o dashboard principal

---

## Gestão de Residentes

### Cadastrar novo residente

1. Menu lateral → **Residentes** → botão **+ Novo Residente**
2. Preencha os dados obrigatórios: nome, CPF, data de nascimento, data de admissão
3. Adicione diagnósticos, alergias, contato de emergência
4. Clique em **Salvar**
5. Após salvar, você pode adicionar foto e documentos na página do residente

### Editar residente

1. Clique no nome do residente na lista
2. Clique em **Editar** (canto superior direito)
3. Altere os dados e clique em **Salvar**

### Encerrar internação

1. Acesse o perfil do residente
2. Clique em **Editar** → campo **Status** → selecione **Discharged**
3. O residente sai da contagem de ocupação mas permanece no histórico

---

## Gestão de Medicamentos

### Criar prescrição

1. Menu → **Medicamentos** → **+ Nova Prescrição**
2. Selecione o residente
3. Preencha: nome do medicamento, dosagem, via, horários
4. Defina data de início e término (opcional)
5. Clique em **Salvar** — os horários serão criados automaticamente

### Visualizar schedule board

1. Menu → **Medicamentos** → aba **Board**
2. O board mostra todos os medicamentos do dia agrupados por horário
3. Status coloridos: verde = administrado, vermelho = atrasado, amarelo = pendente

### Relatório de adesão

1. Menu → **Relatórios** → **Medicamentos**
2. Selecione o período (mês/ano)
3. Veja taxa de adesão por residente e tendência mensal
4. Exporte em PDF ou Excel com os botões no canto superior direito

---

## Escala de Trabalho

### Criar escalas do mês

1. Menu → **Escala** → botão **+ Criar Escala**
2. Selecione funcionário, data, turno e horários
3. Clique em **Criar** — o sistema envia notificação ao funcionário

### Acompanhar presença

1. Menu → **Escala** → mês atual
2. Cards verdes = presentes, vermelhos = ausentes, cinza = agendados
3. Funcionários fazem check-in/check-out pelo sistema

### Configurar alertas automáticos

O sistema envia notificações automaticamente:
- **17h**: lembrete para confirmar escala do dia seguinte
- **08h05**: marca ausência para funcionários sem check-in

---

## Financeiro

### Registrar cobrança

1. Menu → **Financeiro** → **Nova Cobrança**
2. Selecione o residente, categoria, valor e vencimento
3. Clique em **Salvar**

### Registrar pagamento

1. Na lista financeira, clique na cobrança
2. Clique em **Registrar Pagamento**
3. Informe a data e forma de pagamento → **Confirmar**

### Relatório financeiro consolidado

1. Menu → **Relatórios** → **Financeiro**
2. Selecione o período
3. Veja fluxo de caixa, inadimplência e previsão
4. Exporte PDF ou Excel com o botão **Consolidado**

---

## Usuários do Sistema

### Criar novo usuário

Os usuários são criados via endpoint da API. Roles disponíveis:
- `admin` — acesso total
- `nurse` — medicamentos + residentes
- `caregiver` — check-in/out + administração de medicamentos
- `receptionist` — residentes + visitas

---

## Backup

O banco de dados é gerenciado pelo Supabase com **Point-in-Time Recovery** (PITR).
Um health-check diário às 03h00 valida a conectividade e registra o snapshot.

Para restaurar para um ponto anterior, acesse o painel Supabase → Database → Backups.
