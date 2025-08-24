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