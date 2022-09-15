"use strict";

const { Blockchain, FakeNet, utils } = require('spartan-gold');

const UtxoBlock = require('./utxo-block.js');
const UtxoClient = require('./utxo-client.js');
const UtxoMiner = require('./utxo-miner.js');
const UtxoTransaction = require('./utxo-transaction.js');
const PaymentChannel = require('./payment-channel.js');

console.log("Starting simulation.  This may take a moment...");

let fakeNet = new FakeNet();

// Clients
let alice = new UtxoClient({name: "Alice", net: fakeNet});
let bob = new UtxoClient({name: "Bob", net: fakeNet});
let charlie = new UtxoClient({name: "Charlie", net: fakeNet});

// Miners
let minnie = new UtxoMiner({name: "Minnie", net: fakeNet});
let mickey = new UtxoMiner({name: "Mickey", net: fakeNet});

// Payment Channels
let channel = new PaymentChannel({name: "HopliteChannel", net: fakeNet});
let channel2 = new PaymentChannel({name: "HopliteChannel2", net: fakeNet});

// Creating genesis block
let genesis = Blockchain.makeGenesis({
  blockClass: UtxoBlock,
  transactionClass: UtxoTransaction,
  clientBalanceMap: new Map([
    [alice, 233],
    [bob, 99],
    [charlie, 67],
    [minnie, 200],
    [mickey, 200],
    [channel, 0],
    [channel2, 0],
  ]),
});

function showBalances() {
  console.log();
  console.log(`Alice's balance is ${alice.availableGold}.`);
  alice.showAllUtxos();

  console.log();
  console.log(`Bob's balance is ${bob.availableGold}.`);
  bob.showAllUtxos();

  console.log();
  console.log(`Charlie's balance is ${charlie.availableGold}.`);
  charlie.showAllUtxos();

  console.log();
  console.log(`HopliteChannel's balance is ${channel.availableGold}.`);
  channel.showAllUtxos();

  console.log();
  console.log(`HopliteChannel2's balance is ${channel2.availableGold}.`);
  channel2.showAllUtxos();

  // console.log();
  // console.log(`Minnie's balance is ${minnie.availableGold}.`);
  // minnie.showAllUtxos();

  // console.log();
  // console.log(`Mickey's balance is ${mickey.availableGold}.`);
  // mickey.showAllUtxos();
}

// Showing the initial balances from Alice's perspective, for no particular reason.
console.log("Initial balances:");
showBalances();

fakeNet.register(alice, bob, charlie, minnie, mickey, channel, channel2);

// Miners start mining.
minnie.initialize();
mickey.initialize();


let aliceChannelAddr, bobChannelAddr, aliceChannelAddr2, charlieChannelAddr;

console.log(`***HOPLITE*** Creating a bidirectional channel between Alice and Bob`);
[aliceChannelAddr, bobChannelAddr] = channel.createChannel([{client: alice, amount: 40}, 
  {client: bob, amount: 10}]);

setTimeout(() => {
  console.log(`***HOPLITE*** Creating a bidirectional channel between Alice and Charlie`);
  [aliceChannelAddr2, charlieChannelAddr] = channel2.createChannel([{client: alice, amount: 50}, 
    {client: charlie, amount: 30}]);
}, 4000);

setTimeout(() => {
  channelTransactions();
}, 7000);

setTimeout(() => {
  console.log(`***HOPLITE*** Closing channel and committing ending balances to the mainchain.`);
  channel.closeChannel();
}, 9000);

setTimeout(() => {
  console.log(`***HOPLITE*** Closing channel2 and committing ending balances to the mainchain.`);
  channel2.closeChannel();
}, 13000);


// Print out the final balances after it has been running for some time.
setTimeout(() => {
  console.log();
  showBalances();

  console.log();
  console.log("Showing all UTXOs, unorganized:");
  alice.showAllBalances();

  console.log();
  console.log(`Minnie's chain length is ${minnie.currentBlock.chainLength}.`);

  process.exit(0);
}, 18000);


// Just a series of transactions made on channel and channel2
// Alice transfers a total of 62 gold, receives 27 from Bob, 12 from Charlie
// Bob transfers a total of 27 gold, receives 22 from Alice
// Charlie transfers a total of 12 gold, receives 40 from Alice
// Alice pays 6 gold total in transaction fees
// Bob pays 3 gold total in transaction fees
// Charlie pays 3 gold total in transaction fees
// Alice: 204, Bob: 91, Charlie: 92
function channelTransactions() {
  console.log(`***HOPLITE*** Alice is transferring gold to Bob`);
  channel.makeTransaction(aliceChannelAddr.address, 5, (tx) => {
    return utils.sign(aliceChannelAddr.privKey, tx);
  });

  console.log(`***HOPLITE*** Alice is transferring gold to Charlie`);
  channel2.makeTransaction(aliceChannelAddr2.address, 15, (tx) => {
    return utils.sign(aliceChannelAddr2.privKey, tx);
  });

  console.log(`***HOPLITE*** Alice is transferring gold to Bob`);
  channel.makeTransaction(aliceChannelAddr.address, 2, (tx) => {
    return utils.sign(aliceChannelAddr.privKey, tx);
  });

  console.log(`***HOPLITE*** Charlie is transferring gold to Alice`);
  channel2.makeTransaction(charlieChannelAddr.address, 12, (tx) => {
    return utils.sign(charlieChannelAddr.privKey, tx);
  });

  console.log(`***HOPLITE*** Alice is transferring gold to Bob`);
  channel.makeTransaction(aliceChannelAddr.address, 10, (tx) => {
    return utils.sign(aliceChannelAddr.privKey, tx);
  });

  console.log(`***HOPLITE*** Bob is transferring gold to Alice`);
  channel.makeTransaction(bobChannelAddr.address, 12, (tx) => {
    return utils.sign(bobChannelAddr.privKey, tx);
  });

  console.log(`***HOPLITE*** Alice is transferring gold to Bob`);
  channel.makeTransaction(aliceChannelAddr.address, 5, (tx) => {
    return utils.sign(aliceChannelAddr.privKey, tx);
  });

  console.log(`***HOPLITE*** Alice is transferring gold to Charlie`);
  channel2.makeTransaction(aliceChannelAddr2.address, 25, (tx) => {
    return utils.sign(aliceChannelAddr2.privKey, tx);
  });

  console.log(`***HOPLITE*** Bob is transferring gold to Alice`);
  channel.makeTransaction(bobChannelAddr.address, 15, (tx) => {
    return utils.sign(bobChannelAddr.privKey, tx);
  });

  // THIS TRANSACTION FAILS
  console.log(`***HOPLITE*** Bob is transferring gold to Alice`);
  channel.makeTransaction(bobChannelAddr.address, 5, (tx) => {
    return utils.sign(bobChannelAddr.privKey, tx);
  });
}
