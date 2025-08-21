# Quickstart- Claim testnet funds onchain using Faucets API

This guide will show you how to create a faucet request and claim testnet funds within minutes.

You will:

* Create a wallet and a faucet request for each [supported token standard](/faucets/introduction/welcome#supported-assets)
* Claim testnet funds onchain
* Return faucet transaction information and verify wallet balance(s)

## Prerequisites

It is assumed you have:

* [Created](https://portal.cdp.coinbase.com/create-account) and [signed in](https://portal.cdp.coinbase.com/signin) to an existing CDP account
* Completed the CDP SDK [getting started guide](/get-started/quickstart)

At this point, you should have initialized the CDP SDK with your API key before proceeding.

## UI (CDP Portal)

While the CDP Faucets API allows for programmatic faucet requests, you can also use the CDP Portal UI with a wallet address to claim funds in-browser.

Assuming you completed the [prerequisites](#prerequisites), navigate to <a href="https://portal.cdp.coinbase.com/products/faucet" target="_blank" rel="noopener noreferrer">Faucets</a>.

1. Select a **Network** (either [Base Sepolia](https://sepolia.basescan.org/), [Ethereum Sepolia](https://sepolia.etherscan.io/), or [Solana Devnet](https://explorer.solana.com/)).
2. Select a **Token** (either ETH, USDC, EURC, cbBTC, or SOL).
3. Enter a wallet address and click the **Claim** button.

<Frame>
  <img src="https://mintlify.s3.us-west-1.amazonaws.com/coinbase-prod/faucets/images/faucets-portal.png" />
</Frame>

Continue reading to programmatically claim testnet funds.

## Programmatically

The majority of this quickstart will focus on claiming faucet funds using a new wallet created using our [Server Wallet](/server-wallets/v1/concepts/wallets).

If you'd like to use your own wallet, skip to Step 4: [Use an external address](#4-use-an-external-address-optional).

### 1. Create a wallet

To create a wallet, use the following snippet:

<Tabs>
  <Tab value="typescript" title="TypeScript">
    ```typescript
    // Create a wallet on Base Sepolia (default)
    let wallet = await Wallet.create();
    ```

    <Info>
      Wallets are created for [Base Sepolia](https://docs.base.org/chain/network-information#base-testnet-sepolia) by default. Change the network by passing in a [network identifier](/api-reference/networks#network-identifiers):

      ```typescript
      let wallet = Wallet.create({ networkId: Coinbase.networks.EthereumSepolia });
      ```
    </Info>
  </Tab>

  <Tab value="python" title="Python">
    ```python
    # Create a wallet on Base Sepolia (default)
    wallet = Wallet.create()
    ```

    <Info>
      <p>Wallets are created for [Base Sepolia](https://docs.base.org/chain/network-information#base-testnet-sepolia) by default. Change the network by passing in the [network identifier](/api-reference/networks#network-identifiers):</p>

      ```python
      wallet = Wallet.create(network_id="ethereum-sepolia")
      ```
    </Info>
  </Tab>
</Tabs>

### 2. Claim ETH from faucet

Continue reading to create an ETH faucet request.

<Info>
  ETH claim limits are capped at [1000 claims per every 24 hours](/faucets/introduction/welcome#supported-assets) at 0.0001 ETH per claim.
</Info>

<Warning>
  This is an example where the created wallet is not persisted by default. For more details, see the [Server Wallet](/server-wallets/v1/concepts/wallets) documentation.
</Warning>

<Tabs>
  <Tab value="typescript" title="TypeScript">
    ```typescript
    // Create a faucet request and return the transaction */
    const faucetTransaction = await wallet.faucet();

    // Wait for the faucet transaction to land onchain */
    await faucetTransaction.wait();

    console.log(`Faucet transaction successfully completed: ${faucetTransaction}`);
    console.log("Transaction hash:", faucetTransaction.getTransactionHash());

    // Check wallet balance 
    console.log("Wallet balance after ETH faucet request:", await wallet.listBalances());
    ```

    After running this example, you should see output similar to the following:

    ```console
    Faucet transaction successfully completed: Coinbase::FaucetTransaction{transaction_hash: '0xd2ef7e373f99cc7deafa4e214c1cdac533d1a9b743106b62a33daebd05fb2b37', transaction_link: 'https://sepolia.basescan.org/tx/0xd2ef7e373f99cc7deafa4e214c1cdac533d1a9b743106b62a33daebd05fb2b37'}
    Transaction hash: 0xd2ef7e373f99cc7deafa4e214c1cdac533d1a9b743106b62a33daebd05fb2b37
    Wallet balance after ETH faucet request: BalanceMap(1) [Map] { 'eth' => 0.0001 }
    ```
  </Tab>

  <Tab value="python" title="Python">
    ```python
    # Create a faucet request and return the transaction
    faucet_transaction = wallet.faucet()

    # Or create a request using an address, i.e. `faucet_transaction = wallet.default_address.faucet()`

    # Wait for the faucet transaction to land onchain.
    faucet_transaction.wait()

    print(f"Faucet transaction successfully completed: {faucet_transaction}")

    # Retrieve the transaction hash for logging
    faucet_transaction.transaction_hash

    # Check wallet balance
    print("Wallet balance after faucet request:", wallet.balances());
    ```

    After running this example, you should see output similar to the following:

    ```console
    Faucet transaction successfully completed: FaucetTransaction: (transaction_hash: 0x0654306d8b7d20f440bd71e9cd475d44763c15eaff584c576faddd2e24801c98, transaction_link: https://sepolia.basescan.org/tx/0x0654306d8b7d20f440bd71e9cd475d44763c15eaff584c576faddd2e24801c98, status: complete, network_id: base-sepolia)
    Wallet balance after faucet request: {"eth":"0.0001"}
    ```
  </Tab>
</Tabs>

### 3. Claim ERC-20 token from faucet

Continue reading to create a request for (and claim) ERC-20 funds from a faucet.

<Info>
  ERC-20 claim limits are capped every 24 hours dependent on [token symbol](/faucets/introduction/welcome#supported-assets).
</Info>

After creating your wallet, request a faucet similar to above, this time passing in a supported [Asset ID](/faucets/introduction/welcome#supported-assets).

<Tabs>
  <Tab value="typescript" title="TypeScript">
    ```typescript
    // Create a faucet request and return the transaction
    const faucetTransactionUSDC = await wallet.faucet("usdc");
    const faucetTransactionCBBTC = await wallet.faucet("cbbtc");    
    // Wait for the faucet transaction to land onchain
    await faucetTransactionUSDC.wait();
    await faucetTransactionCBBTC.wait();

    console.log("\nFaucet Transactions successfully completed:")
    console.log(`USDC transaction: ${faucetTransactionUSDC}`);
    console.log("Transaction hash:", faucetTransactionUSDC.getTransactionHash());

    console.log(`cbBTC transaction: ${faucetTransactionCBBTC}`);
    console.log("Transaction hash:", faucetTransactionCBBTC.getTransactionHash());

    // Check wallet balances
    console.log("Wallet balance after ERC-20 faucet request:", await wallet.listBalances());
    ```

    After running this example, you should see output similar to the following:

    ```console
    Faucet Transactions successfully completed:
    USDC transaction: Coinbase::FaucetTransaction{transaction_hash: '0xc52f4578e487d12ff92b44fa3d9a21b6dfca772e05df5f0b723f2751178fe289', transaction_link: 'https://sepolia.basescan.org/tx/0xc52f4578e487d12ff92b44fa3d9a21b6dfca772e05df5f0b723f2751178fe289'}
    Transaction hash: 0xc52f4578e487d12ff92b44fa3d9a21b6dfca772e05df5f0b723f2751178fe289
    cbBTC transaction: Coinbase::FaucetTransaction{transaction_hash: '0xdec3164e59ae53d616dbdebabf8bfac914a619160edd0344dca8d758d09491c0', transaction_link: 'https://sepolia.basescan.org/tx/0xdec3164e59ae53d616dbdebabf8bfac914a619160edd0344dca8d758d09491c0'}
    Transaction hash: 0xdec3164e59ae53d616dbdebabf8bfac914a619160edd0344dca8d758d09491c0
    Wallet balance after ERC20 faucet request: BalanceMap(2) [Map] { 'cbbtc' => 0.0001, 'usdc' => 1 }
    ```
  </Tab>

  <Tab value="python" title="Python">
    ```python
    # Create a faucet request and return the transaction
    faucet_transaction_usdc = wallet.faucet(asset_id="usdc")
    faucet_transaction_cbbtc = wallet.faucet(asset_id="cbbtc")

    # Wait for the faucet transaction to land onchain
    faucet_transaction_usdc.wait()
    faucet_transaction_cbbtc.wait()

    print("\nFaucet Transactions successfully completed:")
    print(f"\nUSDC Transaction: {faucet_transaction_usdc}")
    print(f"\ncbBTC Transaction: {faucet_transaction_cbbtc}")

    faucet_transaction_usdc.transaction_hash
    faucet_transaction_cbbtc.transaction_hash

    # Check wallet balances
    print("Wallet balances after ERC-20 faucet request:", wallet.balances());
    ```

    After running this example, you should see output similar to the following:

    ```console
    Faucet Transaction successfully completed:
    USDC Transaction: FaucetTransaction: (transaction_hash: 0x7379cef11acc99118f1a269b818dced87bdd63f03ebe702a5fb1ebb106b2d43c, transaction_link: https://sepolia.basescan.org/tx/0x7379cef11acc99118f1a269b818dced87bdd63f03ebe702a5fb1ebb106b2d43c, status: complete, network_id: base-sepolia)
    cbBTC Transaction: FaucetTransaction: (transaction_hash: 0x0e5c882c70ee297ecc3f2065232da501cbc5ec2097e249584af01e874f4feeff, transaction_link: https://sepolia.basescan.org/tx/0x0e5c882c70ee297ecc3f2065232da501cbc5ec2097e249584af01e874f4feeff, status: complete, network_id: base-sepolia)
    Wallet balances after ERC20 faucet request: {"eth":"0.0001","usdc":"1"}
    ```
  </Tab>
</Tabs>

### 4. Use an external address (optional)

You can also bring your own wallet to claim faucet funds. Try the following to use an external address.

First, use your address to create an external address object, then wait for the faucet request to land onchain.

<Tabs>
  <Tab value="typescript" title="TypeScript">
    ```typescript
    // Create external address object for your wallet
    let externalAddress = new ExternalAddress("base-sepolia", "0x...");

    // Check wallet balance
    console.log("ETH balance before request:", await externalAddress.getBalance("eth"));

    // Create faucet request and wait for it to land onchain
    const faucetTransactionExternal = await externalAddress.faucet("eth");
    faucetTransactionExternal.wait();
    ```
  </Tab>

  <Tab value="python" title="Python">
    ```python
    # Create external address object for your wallet
    external_address = ExternalAddress("base-sepolia", "0x...")

    # Check current balance
    print("ETH balance before request:", external_address.balance("eth"))

    # Create faucet request and wait for it to land onchain
    faucet_transaction = external_address.faucet("eth")
    faucet_transaction.wait()
    ```
  </Tab>
</Tabs>

Your transaction may take some time to complete. You can monitor it by checking its status:

<Tabs>
  <Tab value="typescript" title="TypeScript">
    ```typescript
    while (true) {
      const status = await faucetTransactionExternal.getStatus();
      console.log("Current Transaction Status:", status);

      // Check if complete
      if (status === "complete") {
          console.log("\nFaucet Transaction successfully completed:");
          console.log(faucetTransactionExternal);
          break;
      }

      // Wait for 30 seconds before rechecking
      console.log("Transaction is not yet complete...");
      await new Promise(resolve => setTimeout(resolve, 30000)); 
    }

    // Check balance 
    console.log("ETH balance after claim:", await externalAddress.getBalance("eth"));
    ```
  </Tab>

  <Tab value="python" title="Python">
    ```python
    while True:
        status = faucet_transaction.status
        print("Current Transaction Status:", status)

        # Check if complete
        if status == Transaction.Status.COMPLETE:
            print("\nFaucet Transaction successfully completed:")
            print(faucet_transaction)
            break

        print("Transaction is not yet complete...")
        # Wait for 30 seconds before rechecking
        time.sleep(30)

    # Check balance 
    balance = external_address.balance("eth")
    print("ETH balance after claim:", balance)
    ```
  </Tab>
</Tabs>

After running this example, you should see output similar to the following:

<Tabs>
  <Tab value="typescript" title="TypeScript">
    ```console
    ETH balance before request: 0.0013
    Current Transaction Status: pending
    Transaction is not yet complete...
    Current Transaction Status: complete

    Faucet Transaction successfully completed:
    FaucetTransaction {
      model: {
        transaction: {
          from_address_id: '',
          network_id: 'base-sepolia',
          status: 'complete',
          to_address_id: '0xF73C0009bE9337C00651A0Cdd05051dA204418c3',
          transaction_hash: '0xde2142cb2de6841b26160d2cff5ceb5acdaf4de30cbd58d4b607ab07a3e0bae5',
          transaction_link: 'https://sepolia.basescan.org/tx/0xde2142cb2de6841b26160d2cff5ceb5acdaf4de30cbd58d4b607ab07a3e0bae5',
          unsigned_payload: ''
        },
        transaction_hash: '0xde2142cb2de6841b26160d2cff5ceb5acdaf4de30cbd58d4b607ab07a3e0bae5',
        transaction_link: 'https://sepolia.basescan.org/tx/0xde2142cb2de6841b26160d2cff5ceb5acdaf4de30cbd58d4b607ab07a3e0bae5'
      },
      _transaction: Transaction {
        model: {
          from_address_id: '',
          network_id: 'base-sepolia',
          status: 'complete',
          to_address_id: '0xF73C0009bE9337C00651A0Cdd05051dA204418c3',
          transaction_hash: '0xde2142cb2de6841b26160d2cff5ceb5acdaf4de30cbd58d4b607ab07a3e0bae5',
          transaction_link: 'https://sepolia.basescan.org/tx/0xde2142cb2de6841b26160d2cff5ceb5acdaf4de30cbd58d4b607ab07a3e0bae5',
          unsigned_payload: ''
        }
      }
    }
    ETH balance after claim: 0.0014
    ```
  </Tab>

  <Tab value="python" title="Python">
    ```console
    ETH balance before request: 0.0039
    Current Transaction Status: pending
    Transaction is not yet complete...

    Faucet Transaction successfully completed:
    FaucetTransaction: (transaction_hash: 0x637d0bc6789740906f73e5066d0482d2e391ef3aa28b7806e391e6f1f1153080, transaction_link: https://sepolia.basescan.org/tx/0x637d0bc6789740906f73e5066d0482d2e391ef3aa28b7806e391e6f1f1153080, status: complete, network_id: base-sepolia)
    ETH balance after claim: 0.004
    ```
  </Tab>
</Tabs>

## Video: Watch and learn

**Watch this video for a walkthrough of using faucets in CDP Portal:**

<iframe width="100%" height="400" src="https://www.youtube.com/embed/Z94JYQld7UA" title="Using Faucets in CDP Portal Walkthrough" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen />

<br />

## What to read next

* [Faucets: Welcome](/faucets/introduction/welcome): An overview of faucets on CDP
* [Server Wallet documentation](/server-wallets/v1/concepts/wallets): Create and manage wallets using the CDP SDK
* [Server Wallet Reference](/api-reference/rest-api/wallets/create-wallet): Create and manage wallets using our REST API
