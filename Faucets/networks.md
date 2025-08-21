# Networks

The networks described here are supported by CDP REST and JSON-RPC APIs described in the left-hand nav.

## REST API

A comprehensive list of CDP APIs offered across the networks we support, along with their corresponding testnets.

### Base

| API                                                                                                             | Base Mainnet | Base Sepolia |
| :-------------------------------------------------------------------------------------------------------------- | :----------- | :----------- |
| [Addresses](/server-wallets/v1/concepts/addresses)                                                              | ✅            | ✅            |
| [Assets](/server-wallets/v1/concepts/assets)                                                                    | ✅            | ✅            |
| [Faucet](/faucets/introduction/welcome)                                                                         | -            | ✅            |
| [Networks](/api-reference/rest-api/networks/get-network-by-id)                                                  | ✅            | ✅            |
| [Paymaster](/paymaster/introduction/welcome)                                                                    | ✅            | ✅            |
| [Send](/server-wallets/v1/concepts/transfers)                                                                   | ✅            | ✅            |
| [Smart Contract Interactions](/server-wallets/v1/introduction/onchain-interactions/smart-contract-interactions) | ✅            | ✅            |
| [Smart Contract Events](/data/smart-contract-event/overview)                                                    | ✅            | -            |
| [Staking](/staking/staking-api/introduction/welcome)                                                            | -            | -            |
| [Trades](/server-wallets/v1/concepts/trades)                                                                    | ✅            | -            |
| [Server Wallet](/server-wallets/v1/concepts/wallets)                                                            | ✅            | ✅            |
| [Webhooks](/webhooks/overview)                                                                                  | ✅            | ✅            |

<Info>
  When constructing a REST API request for Base, use `base-mainnet` or
  `base-sepolia` as the [network identifier](#network-identifiers).
</Info>

### Ethereum

| API                                                                                                             | Ethereum Mainnet | Ethereum Sepolia | Ethereum Hoodi |
| --------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------- | -------------- |
| [Addresses](/server-wallets/v1/concepts/addresses)                                                              | ✅                | ✅                | ✅              |
| [Assets](/server-wallets/v1/concepts/assets)                                                                    | ✅                | ✅                | -              |
| [Faucet](/faucets/introduction/welcome)                                                                         | -                | ✅                | -              |
| [Networks](/api-reference/rest-api/networks/get-network-by-id)                                                  | ✅                | ✅                | -              |
| [Paymaster](/paymaster/introduction/welcome)                                                                    | -                | -                | -              |
| [Send](/server-wallets/v1/concepts/transfers)                                                                   | ✅                | ✅                | -              |
| [Smart Contract Interactions](/server-wallets/v1/introduction/onchain-interactions/smart-contract-interactions) | ✅                | -                | -              |
| [Smart Contract Events](/data/smart-contract-event/overview)                                                    | ✅                | -                | -              |
| [Staking](/staking/staking-api/introduction/welcome)                                                            | ✅                | -                | ✅              |
| [Trades](/server-wallets/v1/concepts/trades)                                                                    | ✅                | -                | -              |
| [Server Wallet](/server-wallets/v1/concepts/wallets)                                                            | ✅                | ✅                | -              |
| [Webhooks](/webhooks/overview)                                                                                  | -                | -                | -              |

<Info>
  When constructing a REST API request for Ethereum, use `ethereum-mainnet`,
  `ethereum-sepolia` or `ethereum-hoodi` as the [network
  identifier](#network-identifiers).
</Info>

### Solana

| API                                                                                                             | Solana Mainnet | Solana Devnet |
| --------------------------------------------------------------------------------------------------------------- | -------------- | ------------- |
| [Addresses](/server-wallets/v1/concepts/addresses)                                                              | -              | -             |
| [Assets](/server-wallets/v1/concepts/assets)                                                                    | -              | -             |
| [Faucet](/faucets/introduction/welcome)                                                                         | -              | -             |
| [Networks](/api-reference/rest-api/networks/get-network-by-id)                                                  | -              | -             |
| [Paymaster](/paymaster/introduction/welcome)                                                                    | -              | -             |
| [Send](/server-wallets/v1/concepts/transfers)                                                                   | -              | -             |
| [Smart Contract Interactions](/server-wallets/v1/introduction/onchain-interactions/smart-contract-interactions) | -              | -             |
| [Smart Contract Events](/data/smart-contract-event/overview)                                                    | -              | -             |
| [Staking](/staking/staking-api/introduction/welcome)                                                            | ✅              | ✅             |
| [Trades](/server-wallets/v1/concepts/trades)                                                                    | -              | -             |
| [Server Wallet](/server-wallets/v1/concepts/wallets)                                                            | -              | -             |
| [Webhooks](/webhooks/overview)                                                                                  | -              | -             |

<Info>
  When constructing a REST API request for Solana, use `solana-mainnet` or
  `solana-devnet` as the [network identifier](#network-identifiers).
</Info>

### Others

We also support Arbitrum and Polygon.

| API                                                                                                             | Arbitrum Mainnet | Polygon Mainnet |
| --------------------------------------------------------------------------------------------------------------- | ---------------- | --------------- |
| [Addresses](/server-wallets/v1/concepts/addresses)                                                              | ✅                | ✅               |
| [Assets](/server-wallets/v1/concepts/assets)                                                                    | ✅                | ✅               |
| [Faucet](/faucets/introduction/welcome)                                                                         | -                | -               |
| [Networks](/api-reference/rest-api/networks/get-network-by-id)                                                  | ✅                | ✅               |
| [Paymaster](/paymaster/introduction/welcome)                                                                    | -                | -               |
| [Send](/server-wallets/v1/concepts/transfers)                                                                   | ✅                | ✅               |
| [Smart Contract Interactions](/server-wallets/v1/introduction/onchain-interactions/smart-contract-interactions) | ✅                | ✅               |
| [Smart Contract Events](/data/smart-contract-event/overview)                                                    | -                | -               |
| [Staking](/staking/staking-api/introduction/welcome)                                                            | -                | -               |
| [Trades](/server-wallets/v1/concepts/trades)                                                                    | ✅                | ✅               |
| [Server Wallet](/server-wallets/v1/concepts/wallets)                                                            | ✅                | ✅               |
| [Webhooks](/webhooks/overview)                                                                                  | -                | -               |

<Info>
  When constructing a REST API request for Arbitrum or Polygon, use
  `arbitrum-mainnet` or `polygon-mainnet` as the [network
  identifier](#network-identifiers).
</Info>

## JSON-RPC API

[CDP Node](/node/introduction/welcome) provides free, rate-limited RPC endpoints built for [Base](https://docs.base.org/) and the Base Sepolia testnet.

Free users are limited to approximately [50 requests per second](/node/introduction/welcome#rate-limits). Please reach out in #node on our [CDP Discord](https://discord.com/invite/cdp) to request a limit increase.

### Base

| RPC namespace                                                 | Functionality                          | Base Mainnet | Base Sepolia |
| ------------------------------------------------------------- | -------------------------------------- | ------------ | ------------ |
| [`cdp_*`](/api-reference/json-rpc-api/wallet-history)         | Historical address data                | ✅            | ✅            |
| [`pm_*`](/api-reference/json-rpc-api/paymaster)               | Gas sponsorship management (Paymaster) | ✅            | ✅            |
| [`eth_*`](/api-reference/json-rpc-api/core)                   | Base-specific EVM functionality        | ✅            | ✅            |
| [`web3_*`](/api-reference/json-rpc-api/core#web3-namespace)   | Client information                     | ✅            | ✅            |
| [`debug_*`](/api-reference/json-rpc-api/core#debug-namespace) | Debug tools                            | ✅            | ✅            |
| [`net_*`](/api-reference/json-rpc-api/core#net-namespace)     | Network info                           | ✅            | ✅            |

<Info>
  Need an RPC endpoint? [Create](https://coinbase.com/developer-platform) a new CDP account or [sign in](https://portal.cdp.coinbase.com) to your existing account, then navigate to the [Node](https://portal.cdp.coinbase.com/products/node) page to get your free RPC endpoint and start building onchain!
</Info>

<Info>
  When constructing a JSON-RPC API request, use `base` or `base-sepolia` as the [network identifier](#network-identifiers).
</Info>

## Network identifiers

The following table shows the network identifiers necessary for constructing requests to various CDP APIs:

| Network          | EVM Chain ID         | HTTP API Identifier | JSON-RPC API Identifier |
| ---------------- | -------------------- | ------------------- | ----------------------- |
| Arbitrum Mainnet | **42161** (0xa4b1)   | `arbitrum-mainnet`  | `arbitrum`              |
| Base Mainnet     | **8453** (0x2105)    | `base-mainnet`      | `base`                  |
| Base Sepolia     | **84532** (0x14a34)  | `base-sepolia`      | `base-sepolia`          |
| Bitcoin Mainnet  | -                    | `bitcoin-mainnet`   | `bitcoin`               |
| Ethereum Hoodi   | **560048** (0x88bb0) | `ethereum-hoodi`    | -                       |
| Ethereum Mainnet | **1** (0x1)          | `ethereum-mainnet`  | `ethereum`              |
| Optimism Mainnet | **10** (0xa)         | `optimism-mainnet`  | `optimism`              |
| Polygon Mainnet  | **137** (0x89)       | `polygon-mainnet`   | `polygon`               |
| Solana Devnet    | -                    | `solana-devnet`     | -                       |
| Solana Mainnet   | -                    | `solana-mainnet`    | -                       |

<Info>
  For CDP SDKs, find network identifiers in the corresponding SDK documentation
  (e.g,
  [NodeJS](https://coinbase.github.io/coinbase-sdk-nodejs/classes/coinbase_coinbase.Coinbase.html#networks)
  and
  [Python](https://coinbase.github.io/cdp-sdk-python/cdp.client.models.html#cdp.client.models.network_identifier.NetworkIdentifier)).
</Info>

## What to read next

* [Supported Networks](/get-started/supported-networks): A more high-level overview of the CDP product suite and supported features.
