# Roteiro de Demonstração — BSM System

> Roteiro para apresentação ao vivo. Cada etapa foi testada e confirmada funcionando (web, 2026-06-25). Siga a ordem sugerida — ela conta uma história (visão geral → operação do dia a dia → controle administrativo) em vez de pular entre telas soltas.

## Antes de começar

- [ ] Confirme que o navegador está logado como **admin** da empresa que você vai usar na demo (não use uma conta de Super Admin para a parte "operacional" — ela vê dados de todas as empresas e pode confundir o cliente).
- [ ] Tenha um equipamento, um chamado e um documento **já cadastrados de antemão** como pano de fundo, para a tela de Dashboard não aparecer vazia no primeiro clique.
- [ ] Se for mostrar e-mail de notificação, confirme que `RESEND_API_KEY` está configurado no ambiente que você está demonstrando — caso contrário, as notificações funcionam normalmente dentro do app, só o e-mail não chega.
- [ ] Evite clicar em "Excluir" em qualquer tela durante a demo (equipamento, empresa, chamado) — são ações reais. Se quiser mostrar a exclusão, peça para o cliente sugerir um item de teste específico para isso.

---

## 1. Login e visão geral (Dashboard)

1. Acesse `/login`, mostre o formulário simples (e-mail + senha).
2. Após entrar, pare na **Dashboard** e aponte os cartões: total de equipamentos, chamados abertos, em andamento, resolvidos.
3. Mostre as listas "Equipamentos Recentes" e "Chamados Ativos" — explique que são atalhos diretos para o que precisa de atenção.

**Fala sugerida:** "Esse é o painel que o administrador da empresa vê todos os dias — um resumo rápido do que está pendente, sem precisar caçar informação."

---

## 2. Equipamentos

1. Vá em **Equipamentos** na barra lateral.
2. Mostre a busca e os filtros de status (Ativo, Manutenção, Calibração, Inativo).
3. Clique em **Novo Equipamento** — percorra o assistente de 3 passos:
   - **Identificação**: nome, código interno, marca/modelo, categoria, localização.
   - **Calibração**: periodicidade e pontos de calibração (pode pular se não for o foco).
   - **Confirmação**: resumo antes de salvar.
4. Abra o equipamento criado e mostre as abas: **Dados**, **Calibração**, **Manutenção**, **Documentos**.
5. Mostre o ícone de QR Code na listagem — explique que cada equipamento tem um QR único para acesso rápido via celular (campo, chão de fábrica).

**Fala sugerida:** "Cada equipamento tem um QR code fixo. Um técnico no campo escaneia com o celular e cai direto na ficha técnica, sem precisar abrir o sistema e procurar."

---

## 3. Chamados (Tickets)

1. Vá em **Chamados**.
2. Mostre os filtros por status (Aberto, Em Andamento, Resolvido) e a busca.
3. Clique em **Novo Chamado** — passos: selecionar equipamento → detalhes (título, descrição, prioridade, foto opcional) → confirmação.
4. Abra um chamado existente e mostre:
   - Os botões de transição de status (ex: "Iniciar", "Resolver").
   - A seção de comentários — adicione um comentário ao vivo.
5. Se o cliente for um administrador que recebe suporte da sua equipe, destaque o toggle **"Acionar Suporte BSM"** na criação do chamado — ele roteia o chamado direto para o time de suporte, sem precisar de e-mail ou WhatsApp.

**Fala sugerida:** "Em vez de mandar mensagem perdida no WhatsApp, o time abre um chamado aqui, com histórico, prioridade e responsável — tudo rastreável."

---

## 4. Documentos

1. Vá em **Documentos**.
2. Mostre a lista com categorias e a busca.
3. Abra um documento e mostre o **histórico de versões** e o botão de download.
4. Se o usuário logado for administrador, mostre o toggle de **visibilidade para funcionários** — explique que documentos sensíveis podem ficar restritos só a administradores.

**Fala sugerida:** "Documentos técnicos, certificados, manuais — tudo versionado. Quando uma versão nova entra, a anterior não se perde, fica no histórico."

---

## 5. Calibração (se o cliente tiver perfil de laboratório/metrologia)

> Esta seção só faz sentido para clientes com necessidade de registro de calibração formal — pule se não for o caso.

1. Na ficha de um equipamento, vá na aba **Calibração**.
2. Mostre os pontos de calibração cadastrados e o histórico de calibrações anteriores.
3. Se você (Super Admin) for demonstrar o registro de uma calibração nova: escolha o template, preencha os pontos, gere a planilha — mostre o botão de download da planilha gerada.

**Fala sugerida:** "O sistema gera automaticamente a planilha de calibração a partir de um template, já preenchida com os dados do equipamento e os pontos medidos — sem trabalho manual de copiar e colar."

---

## 6. Usuários e Permissões

1. Vá em **Usuários** (menu administrativo).
2. Mostre a lista de usuários da empresa, com cargo (admin/funcionário) e status (ativo/inativo).
3. Clique em um usuário e mostre a matriz de permissões — explique que cada módulo (equipamento, chamado, documento, etc.) pode ser ajustado individualmente além do padrão do cargo.
4. Mostre o botão de **convidar novo usuário** (não precisa enviar de fato durante a demo, a menos que queira mostrar o e-mail chegando).

**Fala sugerida:** "Cada funcionário só vê e faz o que faz sentido para o papel dele. E isso é ajustável usuário por usuário, não é tudo ou nada."

---

## 7. Configurações da Empresa (personalização)

1. Vá em **Configurações** (admin).
2. Mostre a edição de **cor da marca** — altere a cor primária e salve, mostre o resultado refletido na interface (pode levar até ~60 segundos para atualizar em outras abas, é normal).
3. Mostre o upload de **logotipo**.
4. Mostre **categorias de documentos** e **preferências de notificação**.

**Fala sugerida:** "O sistema veste a cor da marca de vocês — não é um sistema genérico, é o sistema de vocês com a cara de vocês."

---

## 8. Notificações

1. Aponte o ícone de sino no topo — mostre notificações não lidas.
2. Explique que avisos de calibração próxima do vencimento chegam automaticamente (verificação diária), sem precisar lembrar manualmente.

---

## Encerrando

- Recapitule os 3 pontos que mais ressoam com o perfil do cliente (ex: rastreabilidade de chamados, controle de documentos, alertas de calibração).
- Pergunte se eles querem ver o **app mobile** (se aplicável) — equipamentos, chamados e QR scanner também funcionam no celular, para uso em campo.

---

## Coisas para evitar mostrar/clicar ao vivo (não são bugs, só não estão prontas para holofote)

- Não exclua uma **empresa** durante a demo — é uma ação destrutiva real, sem confirmação dupla além do diálogo padrão.
- Evite mostrar o e-mail de notificação de chamado se `RESEND_API_KEY` não estiver configurado no ambiente — a notificação dentro do app funciona, o e-mail simplesmente não sai.
- No mobile, não existe tela de cadastro de calibração acessível pela navegação normal — não tente chegar lá durante a demo.
