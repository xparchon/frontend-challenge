# Desafio Frontend — Marketplace de NFTs

Implemente o **NFT Marketplace** em React e TypeScript, seguindo o [layout no Figma](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1).

O desafio avalia fidelidade visual, qualidade das interações, integração com APIs, gerenciamento de estado assíncrono, tempo real, acessibilidade e performance.

## Execução local

```sh
npm install
npm run dev
```

O desenvolvimento ativa MSW automaticamente. A demonstração usa as variáveis de [`.env.demo`](./.env.demo); para gerar e visualizar o build com mocks:

```sh
npm run build:demo
npm run preview
```

Comandos de qualidade: `npm run typecheck`, `npm run lint`, `npm run test:e2e` e `npm run lighthouse`. O Lighthouse gera três medições para início e detalhe em perfis desktop e mobile; os relatórios ficam em `lighthouse/reports/`.

## 1. Escopo

Entregue os fluxos de descoberta, compra e conta do colecionador, com versões desktop e mobile. APIs, autenticação, carteiras e pagamentos devem funcionar com dados simulados. Integrações reais com blockchain, extensões de carteira e gateways de pagamento estão fora do escopo.

O Figma define a identidade visual e a composição das telas. Este enunciado define os comportamentos e os cenários de avaliação. Estados não desenhados devem seguir o mesmo padrão visual.

## 2. Stack obrigatória

| Responsabilidade | Tecnologia |
| --- | --- |
| Interface | React |
| Linguagem | TypeScript |
| Roteamento | TanStack Router |
| Estado remoto | TanStack Query |
| Cliente HTTP | Axios |
| Integração de dados | REST APIs |
| Tempo real | Socket.IO |
| Estilização | Tailwind CSS |
| Componentes | shadcn/ui |
| Mocking | MSW |
| Testes E2E e regressão visual | Playwright |
| Auditoria de performance e qualidade | Lighthouse |

As tecnologias devem participar efetivamente da solução. A ferramenta de build, a organização do projeto e as bibliotecas complementares ficam a critério do candidato.

## 3. Telas e fluxos

| Tela | Funcionalidades obrigatórias |
| --- | --- |
| Início | Destaques, catálogo, busca, filtros, ordenação e navegação para o NFT |
| Detalhes do NFT | Galeria, informações, edição, quantidade, favoritos e compra |
| Carrinho de NFTs | Edição de quantidades, remoção, cupom e resumo de valores |
| Pagamento | Dados do colecionador, seleção de carteira e rede, revisão e envio do pedido |
| Confirmação de pedido | Resultado, identificação da transação, itens, taxas e total |
| Login | Autenticação, validação e retorno ao fluxo anterior |
| Cadastro | Criação de conta, validação e tratamento de conflito |
| Perfil do colecionador | Edição dos dados, avatar e alteração de senha |
| Carteiras | Cadastro e edição de carteiras principal e secundária |

Implemente os frames desktop e mobile disponíveis. Perfil, carteiras e confirmação também devem funcionar em mobile, mesmo sem um frame específico.

Páginas editoriais, suporte, atividade, ofertas e downloads não fazem parte da entrega. Links externos e ações auxiliares devem ter comportamento coerente; ações fora do escopo não devem aparentar sucesso funcional.

### Notas da implementação visual

- A busca adicional na página inicial foi mantida como atalho de descoberta; ela não aparece no frame original do Figma e complementa os filtros existentes.
- As rotas `/cart`, `/checkout`, `/orders/:orderId`, `/login`, `/register`, `/profile` e `/wallets` apresentam interfaces responsivas. Cadastro, login, perfil, carteiras, carrinho e pedidos usam a API simulada com MSW.
- A rota `/market/nfts/:nftId` apresenta a composição específica de detalhes em mobile e desktop.

### Demonstração de autenticação

O cadastro, login, sessão e logout são simulados pela API MSW usando Axios. O cadastro cria uma sessão automaticamente; a sessão fica persistida no `localStorage` com validade móvel de 30 dias, renovada ao revalidar após refresh, e o botão de sair encerra a sessão. Após expiração, o fluxo privado redireciona ao login e retoma a rota solicitada depois da autenticação.

| E-mail | Senha |
| --- | --- |
| `nova@kurio.test` | `NovaKurio!23` |
| `artista@kurio.test` | `ArtistaKurio!23` |

As senhas da simulação são armazenadas como hashes SHA-256, nunca em texto puro. As contas criadas ficam no armazenamento local do navegador. Para restaurar os dados de demonstração e remover a sessão, execute no console do navegador:

```js
localStorage.removeItem('kurio.session')
localStorage.removeItem('kurio.mock.auth.users')
localStorage.removeItem('kurio.mock.auth.sessions')
localStorage.removeItem('kurio.mock.profiles')
localStorage.removeItem('kurio.mock.wallets')
localStorage.removeItem('kurio.mock.walletBalances')
localStorage.removeItem('kurio.mock.favorites')
localStorage.removeItem('kurio.mock.carts')
localStorage.removeItem('kurio.mock.orders')
localStorage.removeItem('kurio.mock.idempotency')
localStorage.removeItem('kurio.mock.availability')
localStorage.removeItem('kurio.mock.priceOverrides')
localStorage.removeItem('kurio.mock.paymentOutcome')
localStorage.removeItem('kurio.mock.walletConnection')
localStorage.removeItem('kurio.mock.favoriteFailure')
sessionStorage.removeItem('kurio.checkout.idempotency')
location.reload()
```

### Perfil, carteiras e compras simuladas

Os formulários de perfil e carteira enviam mutations Axios para a API MSW. Dados de perfil, avatar, carteiras e carrinho são persistidos no navegador e isolados por usuário. O carrinho visitante é combinado ao carrinho da conta na primeira consulta autenticada. O cupom `KURIO10` aplica 10%; `EXPIRED10` e qualquer código desconhecido retornam erro.

| Recurso | Contrato |
| --- | --- |
| Perfil | `GET` e `PUT /api/profile`; avatar em `PUT /api/profile/avatar`; senha em `POST /api/profile/password` |
| Carteiras e saldo | `GET` e `POST /api/wallets`; `PUT` e `DELETE /api/wallets/:walletId`; saldo em `GET /api/wallets/:walletId/balance`; conectar/desconectar em `POST /api/wallets/:walletId/connect` e `/disconnect` |
| Favoritos | `GET /api/favorites`; `PUT` e `DELETE /api/favorites/:nftId` |
| Carrinho e cotação | `GET /api/cart`; `POST /api/cart/items`; `PATCH` e `DELETE /api/cart/items/:nftId`; cupom em `PUT /api/cart/coupon` |
| Pedidos | `POST /api/orders` com `Idempotency-Key`; consultar recibo e estado em `GET /api/orders/:orderId` |

O checkout revalida cotação, quantidade, rede e saldo da carteira. O saldo ETH é fictício, persistido por carteira em `kurio.mock.walletBalances`, exibido no checkout e debitado uma única vez quando o pedido é aceito; uma recusa não altera o saldo e uma tentativa acima do saldo disponível é bloqueada. Pedidos repetidos com a mesma chave e os mesmos dados recuperam o pedido original sem novo débito; a mesma chave com conteúdo diferente retorna conflito. Pedidos confirmados removem do carrinho apenas as quantidades compradas e o recibo mantém o snapshot do pedido. A taxa simulada é `0.016 ETH`.

Para adicionar fundos de teste à carteira principal da sessão atual, execute no console do navegador:

```js
const session = JSON.parse(localStorage.getItem('kurio.session'))
const walletsByUser = JSON.parse(localStorage.getItem('kurio.mock.wallets') || '{}')
const wallet = walletsByUser[session.user.id].find((item) => item.isPrimary)
const balances = JSON.parse(localStorage.getItem('kurio.mock.walletBalances') || '{}')
balances[session.user.id] = {
  ...balances[session.user.id],
  [wallet.id]: '100000000000000000000', // 100 ETH em wei
}
localStorage.setItem('kurio.mock.walletBalances', JSON.stringify(balances))
location.reload()
```

Para exercitar cenários determinísticos no console do navegador, defina `kurio.mock.paymentOutcome` como `rejected` ou `pending` (padrão: confirmado); pedidos pendentes são confirmados automaticamente após um segundo. Defina `kurio.mock.walletConnection` como `rejected` para simular recusa de conexão. Para validar a mudança de cotação, entre no checkout, defina o override antes de confirmar e então clique em “Confirmar compra”:

```js
localStorage.setItem('kurio.mock.priceOverrides', JSON.stringify({ 'emerald-ape-042': '1.29' }))
```

Remova essas chaves para restaurar o comportamento padrão. Pedidos pendentes são atualizados por `order.updated`; após refresh ou reconexão, o estado é reconciliado por `GET /api/orders/:orderId`.

Para exercitar carregamento lento e recuperação do catálogo, defina `kurio.mock.networkLatencyMs` com a duração em milissegundos ou `kurio.mock.catalogFailure` como `true`. A falha retorna HTTP 503; remova a chave e use “Tentar novamente” para recuperar. O limite de latência configurável é 10 segundos.

Para variar as respostas do catálogo e simular uma conexão indisponível, use:

```js
localStorage.setItem('kurio.mock.networkLatencyBySearchMs', JSON.stringify({ Cosmic: 900, Emerald: 20 }))
localStorage.setItem('kurio.mock.networkOffline', 'true')
```

Remova `kurio.mock.networkOffline` para restaurar a conexão. Para atrasar uma única resposta após o pedido já ter sido criado — permitindo testar timeout e repetição idempotente — defina `kurio.mock.orderResponseDelayMs` em milissegundos; o cenário se limpa automaticamente após o uso.

### Catálogo e detalhe

- Busca, filtros, ordenação e paginação devem compor o estado da URL e sobreviver a refresh e navegação pelo histórico.
- Filtros devem ser combináveis; mudança de filtro deve reiniciar a paginação.
- As consultas devem refletir os parâmetros enviados à API, com tratamento de resultados vazios, falhas e respostas fora de ordem.
- O detalhe deve suportar acesso direto, NFT inexistente, edição indisponível e limite de quantidade.
- Favoritos devem persistir para o usuário autenticado.

### Carrinho

- Adicionar, alterar e remover itens, respeitando a disponibilidade por NFT e edição.
- Manter o carrinho após refresh e preservar os itens do visitante ao autenticar.
- Aplicar e remover cupom, com tratamento de código inválido ou expirado.
- Exibir subtotal, desconto, taxa de rede e total coerentes com a resposta da API.
- Refletir alterações de preço e disponibilidade recebidas enquanto o carrinho estiver aberto.

Valores em ETH devem trafegar como strings decimais e manter precisão nos cálculos e na apresentação. Quantidades são inteiras. A cotação da API é a referência para finalizar o pedido.

### Pagamento e confirmação

- Validar os campos do layout e permitir revisão antes do envio.
- Utilizar as carteiras cadastradas, com seleção de rede e simulação de conexão, recusa e desconexão.
- Revalidar preço, disponibilidade, cupom e taxas antes de confirmar a compra. Mudanças devem exigir nova confirmação do usuário.
- Impedir pedidos duplicados em cliques repetidos ou reenvios após timeout.
- Representar pedido pendente, confirmado e recusado, com recuperação após refresh ou reconexão.
- Exibir a confirmação somente para pedido efetivamente confirmado na simulação.
- Preservar os itens em falhas; após confirmação, remover do carrinho apenas os itens e quantidades comprados.

O recibo deve reproduzir o snapshot do pedido. Alterações posteriores no catálogo não podem modificar seus valores. Referências de transação e links de exploração são simulados.

### Conta e sessão

Cadastro, login, logout e sessão são obrigatórios, integrados à API simulada. Checkout, perfil, carteiras, favoritos e pedidos exigem autenticação.

A sessão deve ser recuperável após refresh. Trate expiração durante a navegação e durante o checkout, preservando o contexto para retomada. Logout e troca de usuário devem limpar dados privados em cache e subscriptions da sessão anterior.

Valide os formulários de cadastro, perfil, senha e carteiras, incluindo erros retornados pela API. Alterações confirmadas devem permanecer após refresh. Use credenciais fictícias e não armazene senhas em claro.

## 4. Integração e estado

Use TanStack Router nas rotas, parâmetros de busca e proteção dos fluxos privados. Use TanStack Query nas consultas, mutations e sincronização do cache. As chamadas REST devem passar pelo Axios.

A solução deve garantir:

- contratos tipados entre transporte, estado e interface;
- estados de carregamento, vazio, erro, sucesso e atualização em segundo plano;
- invalidação coerente após mutations e eventos;
- cancelamento ou descarte de respostas obsoletas;
- isolamento dos dados por usuário e pelos parâmetros da consulta;
- recuperação de falhas sem duplicar operações;
- tratamento de rotas inexistentes e acesso direto a qualquer tela prevista.

Aplique atualização otimista em pelo menos uma interação, com rollback em caso de falha. A política de cache, retries e sincronização deve ser documentada.

## 5. Contratos REST

Defina e documente os contratos utilizados. Os recursos mínimos são:

| Recurso | Operações |
| --- | --- |
| Sessão e conta | Cadastro, login, consulta da sessão, logout e expiração |
| NFTs | Listagem com busca/filtros/ordenação/paginação e detalhe por identificador |
| Favoritos | Consulta, inclusão e remoção |
| Carrinho | Consulta, inclusão, alteração e remoção de itens |
| Cotação | Validação de cupom, disponibilidade, descontos, taxas e total |
| Pedidos | Criação idempotente e consulta do estado e recibo |
| Perfil | Consulta, atualização de dados/avatar e alteração de senha |
| Carteiras | Consulta, cadastro e atualização |

As respostas devem representar erros de validação, sessão inválida, falta de permissão, recurso inexistente, conflito de disponibilidade e falha transitória.

As mutations de pedido devem aceitar uma chave de idempotência. Na simulação, a mesma tentativa deve recuperar o mesmo pedido; reutilizar a chave com conteúdo diferente deve gerar conflito.

## 6. Mocking com MSW

Implemente os mocks na camada de rede, reutilizando contratos e cenários entre desenvolvimento, demonstração e testes. Componentes, hooks e cliente Axios não devem conter respostas fictícias ou caminhos alternativos de negócio.

Os mocks devem manter estado consistente entre catálogo, favoritos, carrinho, perfil, carteiras e pedidos. Persistência local é permitida para sustentar refresh; o reset deve restaurar integralmente um cenário conhecido.

### Simulating Network Conditions and Failures

Simule condições de rede e falhas com MSW, incluindo lentidão, latência variável, timeouts, indisponibilidade de conexão e respostas HTTP de erro. Os cenários devem ser configuráveis e reproduzíveis, permitindo avaliar o carregamento, o feedback de erro e a recuperação da interface.

Disponibilize fixtures com variedade suficiente para exercitar filtros e paginação, pelo menos dois usuários e cenários determinísticos de:

- sucesso e resultado vazio;
- latência variável e respostas fora de ordem;
- falhas de conexão e respostas HTTP 4xx/5xx;
- sessão expirada e acesso não autorizado;
- conflito de cadastro ou de validação de formulário;
- cupom inválido ou expirado;
- preço alterado ou edição esgotada durante a compra;
- timeout após criação do pedido, com recuperação por idempotência;
- pagamento confirmado e pagamento recusado.

Use MSW também na simulação dos eventos com [@mswjs/socket.io-binding](https://github.com/mswjs/socket.io-binding). O cliente usa WebSocket no path `/socket.io`; o import do Socket.IO é adiado até depois da inicialização do MSW para que o interceptor capture o construtor WebSocket.

Os cenários devem exercitar `socket.io-client`. Substituir o socket por chamadas diretas a setters, callbacks ou ao cache não atende ao requisito.

A camada de mocks deve ser ativada por configuração e estar disponível no build de demonstração. Mudanças nos dados simulados devem ser refletidas tanto nas respostas REST quanto nos eventos correspondentes.

## 7. Tempo real com Socket.IO

Implemente, no mínimo, os seguintes eventos:

| Evento | Comportamento esperado |
| --- | --- |
| `nft.updated` | Atualizar preço e disponibilidade no catálogo, detalhe e carrinho |
| `order.updated` | Atualizar o estado do pedido e apresentar confirmação ou recusa |

Os eventos devem carregar identidade estável, recurso afetado e versão. O cliente deve tolerar duplicatas e eventos antigos, sem regredir um estado mais recente nem reaplicar efeitos.

Após reconexão, reconcilie os recursos ativos com a API REST. Eventos de uma sessão anterior não podem atualizar dados de outro usuário. Listeners e subscriptions devem ser liberados ao encerrar seu ciclo de vida.

Implemente o cenário:

1. Um NFT está no carrinho.
2. Seu preço ou disponibilidade muda durante a navegação.
3. A interface informa a alteração e atualiza o resumo.
4. O checkout impede a confirmação com uma cotação desatualizada.

Também deve funcionar uma interrupção de conexão enquanto o pedido está pendente. Após reconectar ou recarregar a página, o usuário deve recuperar seu estado sem criar outra compra. Pedidos confirmados ou recusados são terminais.

## 8. Interface, responsividade e acessibilidade

Preserve tipografia, cores, espaçamentos, hierarquia, imagens, proporções e composição do Figma. Adapte os componentes shadcn/ui à identidade visual do projeto.

Todas as telas devem funcionar em desktop, tablet e mobile, com atenção a filtros, navegação, formulários, carrinho e checkout. Avalie, no mínimo, larguras de 390, 768 e 1440 pixels.

Use **skeletons com shimmer effect** nos componentes dependentes de dados durante o carregamento, incluindo catálogo, detalhe e resumo do carrinho. Preserve as dimensões do conteúdo para evitar deslocamentos de layout e respeite a preferência por movimento reduzido.

São obrigatórios:

- navegação por teclado e foco visível;
- controle de foco em diálogos e drawers;
- semântica adequada, labels e mensagens de erro associadas aos campos;
- alternativas textuais para imagens relevantes;
- contraste legível e estados não dependentes apenas de cor;
- feedback acessível para mutations e alterações em tempo real;
- ausência de overflow horizontal indevido e perda de conteúdo com zoom.

Use os assets do arquivo quando disponíveis e mantenha imagens e fontes necessárias acessíveis à execução local. Documente qualquer substituição de asset ou ajuste de acessibilidade em relação ao layout.

## 9. Testes com Playwright

Entregue testes E2E executáveis com os mocks, cobrindo:

1. Busca, filtros combinados, ordenação, paginação e restauração pelo histórico.
2. Acesso direto ao detalhe e tratamento de recurso inexistente.
3. Cadastro, login, expiração de sessão, logout e troca de usuário.
4. Favoritos, incluindo falha de mutation e recuperação do estado.
5. Carrinho, quantidades, remoção, cupom e persistência após refresh/login.
6. Compra completa, do catálogo ao recibo confirmado.
7. Falha de pagamento, clique repetido e timeout com recuperação do mesmo pedido.
8. Edição de perfil, avatar, senha e carteiras, com erros de validação.
9. Alteração de preço/disponibilidade via Socket.IO durante o checkout.
10. Eventos duplicados ou antigos, desconexão e retomada de pedido pendente.
11. Navegação por teclado, foco de diálogos e validação de formulários.
12. Skeletons durante carregamento lento, feedback de falha e recuperação após nova tentativa.

Execute os fluxos principais em Chromium, nos viewports desktop e mobile. Inclua regressão visual de início, detalhe, carrinho e pagamento, com baselines versionadas e dados estáveis.

As baselines ficam em [`tests/visual-regression.spec.ts-snapshots/`](./tests/visual-regression.spec.ts-snapshots/). Atualize-as somente após revisar uma mudança visual intencional: `npm run test:e2e -- tests/visual-regression.spec.ts --update-snapshots=all`.

Cada teste deve partir de um estado isolado. Controle relógio, latência e disparo dos eventos nos cenários sensíveis a tempo. Entregue relatório HTML e traces das falhas.

As verificações devem observar a interface e os resultados das operações. Os testes de tempo real precisam passar pelo cliente Socket.IO e os de REST pelos handlers MSW.

## 10. Performance e Lighthouse

Audite início e detalhe do NFT com Lighthouse em perfis mobile e desktop, usando build otimizado e o cenário padrão dos mocks.

| Categoria | Meta |
| --- | ---: |
| Performance | ≥ 90 |
| Accessibility | ≥ 95 |
| Best Practices | ≥ 95 |
| SEO | ≥ 90 |

Execute três medições por página e perfil e reporte a mediana de cada categoria. Versione a configuração da auditoria e entregue relatórios HTML/JSON, versões das ferramentas, ambiente e condições de execução.

Registre LCP, CLS e TBT. Justifique resultados abaixo das metas e identifique as causas. A auditoria deve carregar as imagens, fontes e funcionalidades da entrega, sem simplificações exclusivas para melhorar a pontuação.

### Resultados da auditoria local

Medianas de três execuções por página/perfil, em build otimizado de demonstração com mocks ativos. Ambiente: Lighthouse 12.6.1, Chromium 158.0.0.0, Node.js 26.13.1 e Vite 7.3.8, executados localmente pelo Vite Preview em Windows.

| Página | Perfil | Performance | Acessibilidade | Best Practices | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Início | Desktop | 100 | 100 | 96 | 100 | 0,643 s | 0,000 | 0 ms |
| Detalhe | Desktop | 100 | 100 | 96 | 100 | 0,616 s | 0,027 | 0 ms |
| Início | Mobile | 93 | 100 | 96 | 100 | 2,800 s | 0,000 | 0 ms |
| Detalhe | Mobile | 93 | 100 | 96 | 100 | 2,801 s | 0,000 | 0 ms |

Todas as categorias atingiram as metas definidas. Os relatórios HTML/JSON e a configuração reproduzível estão em [`lighthouse/reports/`](./lighthouse/reports/) e nos arquivos `lighthouserc.*.cjs`. O modo desktop teve uma medição de performance 99 na página inicial; a mediana permaneceu 100.

## 11. Critérios de avaliação

| Critério | Pontos | Evidência esperada |
| --- | ---: | --- |
| Fidelidade visual e responsividade | 20 | Aderência ao Figma e consistência entre tamanhos de tela |
| Fluxos e experiência de uso | 20 | Compra e conta completas, validações e recuperação de erros |
| Integração e estado | 15 | Router, Query, Axios, contratos e cache coerentes |
| Tempo real | 10 | Eventos, reconexão, ordenação e sincronização com REST |
| Mocking | 10 | MSW, cenários determinísticos, persistência e reset |
| Testes | 10 | Cobertura dos fluxos e falhas com Playwright |
| Acessibilidade | 5 | Operação por teclado, semântica, foco e feedback |
| Performance | 5 | Resultados e análise das auditorias Lighthouse |
| Arquitetura e documentação | 5 | Tipagem, responsabilidades e execução reproduzível |
| **Total** | **100** | |

São eliminatórios: ausência de uso efetivo da stack obrigatória, fluxos principais apenas visuais, compra confirmada sem resposta da simulação, exposição de dados entre usuários, eventos simulados diretamente na UI ou ausência de testes E2E executáveis.

## 12. Entrega

Entregue código-fonte, lockfile, assets, mocks, fixtures, testes e configurações de auditoria.

O **deploy é obrigatório**. Envie o link do repositório e uma URL pública da aplicação. Recomenda-se [Vercel](https://vercel.com/docs/frameworks/frontend/vite); [Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/vite/) e [Cloudflare Pages](https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/) também são aceitos.

Para Vercel, importe o repositório e mantenha as configurações de build definidas em [`vercel.json`](./vercel.json): `npm run build:demo`, saída `dist` e fallback de SPA para acesso direto e refresh das rotas. O build de demonstração ativa MSW e Socket.IO simulados sem variáveis secretas ou serviços externos. Para Netlify e Cloudflare Pages, use `npm run build:demo` como comando e `dist` como diretório de publicação; `public/_redirects` fornece o fallback de SPA.

A versão publicada deve corresponder ao código entregue e permanecer acessível durante a avaliação, com os mocks e os fluxos de tempo real funcionando. Acesso direto e refresh das rotas devem funcionar no ambiente publicado.

O `README.md` da solução deve conter setup, variáveis de ambiente, credenciais fictícias, seleção e reset dos cenários, comandos de execução e instruções para reproduzir os fluxos de falha.

Consulte [ARCHITECTURE.md](./ARCHITECTURE.md) para contratos REST/eventos, política de sessão, estado do carrinho, estratégia de cache, reconciliação REST/Socket.IO, limitações e decisões de UX.

Disponibilize comandos para desenvolvimento com mocks, build, preview, verificação de tipos, lint, testes Playwright e auditoria Lighthouse.

A entrega deve executar a partir de um checkout limpo, sem depender de serviços privados ou do backend de produção.
