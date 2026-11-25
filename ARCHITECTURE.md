# Arquitetura

## Camadas e fluxo de dados

- **Interface:** React e TypeScript em `src/features`, com componentes de catálogo, detalhes, conta e comércio.
- **Rotas:** TanStack Router em `src/lib/router/router.tsx`. Busca, filtros, ordenação e paginação do catálogo são serializados na URL.
- **Estado remoto:** TanStack Query; os hooks de domínio ficam em `src/features/*/use*.ts` e usam chaves com o identificador do usuário para separar dados privados.
- **Transporte REST:** Axios, centralizado em `src/lib/api/axios.ts`; os contratos de autenticação, catálogo e comércio ficam em `src/lib/api`.
- **Mocks:** MSW intercepta REST e WebSocket em `src/mocks`. Fixtures e estado simulado ficam fora dos componentes. O armazenamento local mantém o cenário entre refreshes.

Fluxo de leitura: componente → hook TanStack Query → função Axios → handler MSW → fixture/armazenamento local. Atualizações de estado passam por mutations; erros HTTP permanecem erros de transporte e são apresentados pela interface.

## Sessão e isolamento de conta

A sessão simulada é persistida em `kurio.session` e revalidada pela API ao carregar a aplicação. A validade é de 30 dias, renovada quando a sessão é validada. As contas de demonstração são semeadas pelo handler MSW; as senhas são comparadas por hash SHA-256, não armazenadas em texto puro.

Chaves privadas de Query incluem o `userId`. Logout remove o cache privado e o carrinho da conta; a mudança de sessão também desmonta a subscription Socket.IO anterior. O carrinho visitante usa uma chave separada e é mesclado à conta ao autenticar.

## Cache, carrinho e pedidos

- Queries usam `staleTime` de 30 segundos, `gcTime` de 5 minutos, duas tentativas de retry e não refazem consultas apenas por foco da janela.
- Favoritos e quantidades do carrinho usam atualização otimista; falhas restauram o snapshot anterior e as mutations revalidam o estado do servidor simulado.
- A cotação do carrinho é a fonte de verdade. Valores ETH trafegam como strings decimais; cálculos de total e saldo usam inteiros em wei.
- A API valida disponibilidade, cotação, rede e saldo antes de aceitar o pedido. `Idempotency-Key` identifica a tentativa; o recibo conserva o snapshot do pedido e não depende dos valores atuais do catálogo.
- Pedidos pendentes são reconciliados com `GET /api/orders/:orderId` no carregamento e após reconexão. `order.updated` atualiza a consulta ativa; confirmação/recusa são estados terminais.

## Contratos de tempo real

O cliente usa `socket.io-client` com transporte WebSocket e path `/socket.io`. No modo de demonstração, `@mswjs/socket.io-binding` conecta esse cliente ao handler `ws.link` do MSW. O pacote do cliente é carregado dinamicamente depois de `worker.start()`: o engine Socket.IO captura o construtor WebSocket ao importar, e importá-lo antes da instalação do interceptor deixava a conexão escapar do mock.

O cliente envia `session.subscribe` com o token da sessão simulada. O handler valida o token antes de associar a conexão a um usuário e responde `session.ready`. Os eventos são:

| Evento | Identidade e ordenação | Efeito |
| --- | --- | --- |
| `nft.updated` | `eventId`, `resourceId`, `version` monotônica por NFT, `updatedAt` | Atualiza catálogo/detalhe, invalida carrinho e informa mudanças relevantes. |
| `order.updated` | `eventId`, `resourceId`, `userId`, `version` monotônica por pedido | Atualiza somente o pedido pertencente ao usuário inscrito. |

O cliente valida a forma dos payloads, descarta versões duplicadas/antigas e invalida consultas ativas após reconexão. O conjunto de conexões e o transporte Socket.IO são simulados no navegador; não substituem um servidor persistente, uma rede blockchain ou um serviço de pagamento real.

## Cenários e reset

As fixtures iniciais estão em `src/mocks/fixtures`. Estado de contas, sessões, carteiras/saldos, favoritos, carrinhos, pedidos, idempotência e overrides de preço/estoque usa chaves `kurio.mock.*` no `localStorage`. O cenário de latência controlada usa `kurio.mock.networkLatencyMs`; `kurio.mock.catalogFailure=true` simula HTTP 503 no catálogo. Os testes Playwright criam contextos isolados e alteram essas chaves apenas para o cenário específico.

O reset de demonstração remove as chaves listadas na seção de reset do [README.md](./README.md) e recarrega a página.

## Limitações e decisões de interface

- Login social, extensões de carteira, pagamentos, saldos e referências de transação são simulações locais.
- O mock de real-time só intercepta o path configurado e conserva estado no contexto do navegador; não há entrega entre processos ou usuários em dispositivos diferentes.
- Telas sem frame mobile específico, especialmente perfil e carteiras, usam uma adaptação responsiva. A tela de perfil não exibe rodapé, conforme solicitado.
- O shimmer mantém blocos de tamanho previsível e desativa a animação quando `prefers-reduced-motion` está ativo.
- Hospedagem estática usa fallback de SPA em `public/_redirects`; as rotas também funcionam por acesso direto e refresh.

## Comandos

```sh
npm install
npm run dev
npm run typecheck
npm run lint
npm run test:e2e
npm run build:demo
npm run preview
npm run lighthouse
```

O [`.env.demo`](./.env.demo) ativa MSW e Socket.IO simulado no build de demonstração. Use as contas fictícias e os cenários reproduzíveis descritos no README.
