Title: 

Request testnet tokens
======================

post https://api.circle.com/v1/faucet/drips


Request testnet tokens for your wallet.

# Header parameters

## X-Request-Id (string)

Developer-provided parameter used to identify this request. Useful when communicating with Circle Support.

# Body parameters

## blockchain (string) *Required*

The testnet blockchain network the resource will be created on or is currently on.

Allowed values: ETH-SEPOLIA AVAX-FUJI MATIC-AMOY SOL-DEVNET ARB-SEPOLIA UNI-SEPOLIA BASE-SEPOLIA OP-SEPOLIA APTOS-TESTNET

## address (string) *Required*

Blockchain generated unique identifier, associated with wallet (account), smart contract or other blockchain objects.

## native (boolean)
Request native testnet tokens.

## usdc (boolean)
Request USDC testnet tokens.

## eurc (boolean)
Request EURC testnet tokens.

# Response
## 400 Error

## Response Body

object

### code (integer) *Required*
Code that corresponds to the error.

### message (string) *Required*
Message that describes the error.

# Request:

## Node-Fetch:
```
const fetch = require('node-fetch');

const url = 'https://api.circle.com/v1/faucet/drips';
const options = {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    address: '0xca9142d0b9804ef5e239d3bc1c7aa0d1c74e7350',
    blockchain: 'MATIC-AMOY'
  })
};

fetch(url, options)
  .then(res => res.json())
  .then(json => console.log(json))
  .catch(err => console.error('error:' + err));
  ```

  ### Response:
  #### 400:
  ```
  {
  "code": 0,
  "message": ""
}
  ```

  ## Node-HTTP:
```
const http = require('https');

const options = {
  method: 'POST',
  hostname: 'api.circle.com',
  port: null,
  path: '/v1/faucet/drips',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, function (res) {
  const chunks = [];

  res.on('data', function (chunk) {
    chunks.push(chunk);
  });

  res.on('end', function () {
    const body = Buffer.concat(chunks);
    console.log(body.toString());
  });
});

req.write(JSON.stringify({
  address: '0xca9142d0b9804ef5e239d3bc1c7aa0d1c74e7350',
  blockchain: 'MATIC-AMOY'
}));
req.end();
```


  ### Response:
  #### 400:
  ```
  {
  "code": 0,
  "message": ""
}
  ```

  # USDC Example:

  ```

  const fetch = require('node-fetch');

const url = 'https://api.circle.com/v1/faucet/drips';
const options = {
  method: 'POST',
  headers: {
    Authorization: 'Bearer TEST_API_KEY:2d1e5894b5a23fbe39e41fe1b57aff65:49bb6c3f8edbfa999c1ef5b17cd49eb1',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    blockchain: 'BASE-SEPOLIA',
    usdc: true,
    address: '0xb8125c1916eC79cc1E8D594b93FF1d7091110cD9'
  })
};

fetch(url, options)
  .then(res => res.json())
  .then(json => console.log(json))
  .catch(err => console.error('error:' + err));

```

# ETH on Base Example:

```

const fetch = require('node-fetch');

const url = 'https://api.circle.com/v1/faucet/drips';
const options = {
  method: 'POST',
  headers: {
    Authorization: 'Bearer TEST_API_KEY:2d1e5894b5a23fbe39e41fe1b57aff65:49bb6c3f8edbfa999c1ef5b17cd49eb1',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    blockchain: 'BASE-SEPOLIA',
    usdc: false,
    address: '0xb8125c1916eC79cc1E8D594b93FF1d7091110cD9',
    native: true
  })
};

fetch(url, options)
  .then(res => res.json())
  .then(json => console.log(json))
  .catch(err => console.error('error:' + err));

  ```

  Title: Testnet Faucets

URL Source: https://developers.circle.com/w3s/developer-console-faucet

Markdown Content:
Faucets are essential for developers to quickly obtain testnet tokens, including native tokens like ETH and stablecoins like USDC, to fund their wallets on blockchain test networks for testing purposes.

Testnet tokens play a critical role in test network environments for two primary use cases:

*   **Cover network gas fees:** Use native tokens like ETH to pay network gas fees for testnet transactions.
*   **Validate smart contract functionality:** Experiment with funds flows in your smart contracts to validate behavior and support for specific digital assets.

Circle provides two faucets:

*   **Public Faucet:** Distributes USDC and EURC on supported blockchain test networks.
*   **Developer Console Faucet:** Distributes native tokens like AVAX, ETH, and MATIC, and stablecoins like USDC. To access the Developer Console faucet, you must log in with your Circle developer account.

The following table describes the properties of each faucet:

|  | Public Faucet | Developer Console Faucet |
| --- | --- | --- |
| **Cost** | Free and open for anyone to use. No account required. | Free and open for anyone to use. You must log in with your Circle developer to use the faucet. |
| **Supported Wallets** | Any wallet on a supported blockchain test network, specified by wallet address. | Any wallet generated using Circle’s developer platform (via API or UI), specified by Wallet ID. |
| **Tokens sent per request** | Stablecoins • USDC: 10 • EURC: 10 | Stablecoins • USDC: 20 Native tokens • ARB: 0.01 • AVAX: 0.1 • BASE: 0.01 • ETH: 0.01 • MATIC: 0.2 • OP: 0.01 • UNI: 0.01 • SOL: 0.01 **• APT: 0.01** |
| **Request limits** | One request every 24 hours for USDC per testnet. One request every 24 hours for EURC per testnet. | Ten requests per developer account or team every 24 hours. |
| **Supported Testnets** | • Algorand TestNet • Arbitrum Sepolia • Avalanche Fuji • Base Sepolia • Celo Alfajores • Ethereum Sepolia • Hedera Testnet • NEAR Testnet • Noble Testnet • Optimism Sepolia • Polygon PoS Amoy • Polkadot Westend • Solana Devnet • Stellar Testnet • Unichain Sepolia | • Arbitrum Sepolia • Avalanche Fuji • Base Sepolia • Optimism Sepolia • Ethereum Sepolia • Polygon PoS Amoy • Unichain Sepolia • Solana Devnet **• Aptos Testnet** |

Use the Public Faucet to send USDC and EURC to your testnet wallets. To request tokens, go to [faucet.circle.com](https://faucet.circle.com/).

Use the Developer Console Faucet to send USDC, AVAX, ETH, and MATIC to your testnet wallets generated using Circle’s developer platform. To request tokens, navigate to [console.circle.com/faucet](https://console.circle.com/faucet).

Use the steps in the following sections to get the ID of the wallet to send tokens to.

1.   Navigate to **User Controlled****>****Users**.
2.   Click on a user to view the user details.
3.   Click on a wallet to view the wallet details. Confirm the network displayed matches the network you plan to send tokens to.
4.   Click the copy icon in the Wallet ID field.

1.   Navigate to **Dev Controlled****>****Wallets**.
2.   Click on a wallet to view the wallet details. Confirm the network displayed matches the network you plan to send tokens to.
3.   Click the copy icon in the Wallet ID field.

1.   Navigate to **Console Wallets**.
2.   Click on a wallet to view the wallet details. Confirm the network displayed is the network you plan to send tokens to.
3.   Click the copy icon in the Wallet ID field.

To acquire a wallet ID programmatically, use an API request to [GET /v1/w3s/wallets](https://developers.circle.com/api-reference/wallets/developer-controlled-wallets/get-wallets) to retrieve a list of wallets in your account.

To fund your wallets programmatically, submit a request to [POST /v1/faucet/drips](https://developers.circle.com/api-reference/w3s/programmable-wallets/request-testnet-tokens).

Bash

```
curl --request POST \
     --url https://api.circle.com/v1/faucet/drips \
     --header 'Accept: application/json' \
     --header 'Authorization: Bearer TEST_API_KEY:XXX' \
     --header 'Content-Type: application/json' \
     --data '
{
    "address": "0x...",
    "blockchain": "MATIC-AMOY",
    "native": true,
    "usdc": true,
    "eurc": true
}
'
```