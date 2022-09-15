"use strict";

const { Blockchain, utils } = require('spartan-gold');

/**
 * Mixes in shared behavior between clients and miners for handling UTXO transactions.
 */
module.exports = {

  /**
   * In the UTXO model, a client should have a collection of addresses.
   * We refer to this collection as a "wallet".
   * 
   * In our design, the wallet will be a queue of addresses (first-in, first-out).
   * We represent this with an array.
   */
  setupWallet: function() {
    // A wallet has utxos of the form { address, keyPair }
    this.wallet = [];

    // Adding initial balance to wallet.
    this.wallet.push({ address: this.address, keyPair: this.keyPair });
  },

  /**
   * With the UTXO model, we must sum up all balances associated with
   * addresses in the wallet.
   */
  getConfirmedBalance: function() {
    // Go through all addresses and get the balances according to
    // the last confirmed block, then return the total.

    let total = 0;
    let amount = 0;
    this.wallet.forEach(({ address }) => {
      amount = this.lastConfirmedBlock.balanceOf(address);
      total += amount;
    });
    return total;
  },

  /**
   * Creates a new address/keypair combo and adds it to the wallet.
   * 
   * @returns Newly created address.
   */
  createAddress: function() {
    // Create a new keypair, derive the address from the public key,
    // add these details to the wallet, and return the address.

    this.keyPair = utils.generateKeypair();
    this.address = utils.calcAddress(this.keyPair.public);
    this.wallet.push({ address: this.address, keyPair: this.keyPair });
    return this.address;
  },

  /**
   * Utility method that prints out a table of all UTXOs.
   * (That is, the amount of gold for all addresses that
   * have not yet been spent.)
   * 
   * This table also includes a "**TOTAL**" entry at the end
   * summing up the total amount of UTXOs.
   */
  showAllUtxos: function() {
    let table = [];
    this.wallet.forEach(({ address }) => {
      let amount = this.lastConfirmedBlock.balanceOf(address);
      table.push({ address: address, amount: amount });
    });
    table.push({ address: "***TOTAL***", amount: this.confirmedBalance });
    console.table(table);
  },

  /**
   * Broadcasts a transaction from the client giving gold to the clients
   * specified in 'outputs'. A transaction fee may be specified, which can
   * be more or less than the default value.
   * 
   * The method gathers sufficient UTXOs, starting with the oldest addresses
   * in the wallet.  If the amount of gold exceeds the amount needed, a
   * new "change address" is created, which will receive any additional coins.
   * 
   * @param {Array} outputs - The list of outputs of other addresses and
   *    amounts to pay.
   * @param {number} [fee] - The transaction fee reward to pay the miner.
   * 
   * @returns {Transaction} - The posted transaction.
   */
  postTransaction: function(outputs, fee=Blockchain.DEFAULT_TX_FEE) {

    // Calculate the total value of gold needed and make sure the client has sufficient gold.
    //
    // If they do, gather up UTXOs from the wallet (starting with the oldest) until the total
    // value of the UTXOs meets or exceeds the gold required.
    //
    // Determine by how much the collected UTXOs exceed the total needed.
    // Create a new address to receive this "change" and add it to the list of outputs.
    //
    // Call `Blockchain.makeTransaction`, noting that 'from' and 'pubKey' are arrays
    // instead of single values.  The nonce field is not needed, so set it to '0'.
    //
    // Once the transaction is created, sign it with all private keys for the UTXOs used.
    // The order that you call the 'sign' method must match the order of the from and pubKey fields.

    // Preliminary checks
    let totalPayments = outputs.reduce((acc, {amount}) => acc + amount, 0) + fee;
    if (totalPayments > this.availableGold) {
      throw new Error(`Requested ${totalPayments}, but account only has ${this.availableGold}.`);
    }

    // Gathering all UTXOs from the wallet
    let total = 0;
    let amount = 0;
    let usedUTXOs = [];
    this.wallet.every((item) => {
      amount = this.lastConfirmedBlock.balanceOf(item.address);
      total += amount;
      usedUTXOs.push(item);
      if(total > totalPayments) return false;
      return true;
    });

    // Dealing with transaction change
    let change = total - totalPayments;
    if(change !== 0) {
      console.log(`*** Need to make ${change} change, with ${total} in and ${totalPayments} out.\n`)
      outputs.push({amount: change, address: this.createAddress()});
    }

    // Creating the transaction on the blockchain
    let addresses = usedUTXOs.map(({ address }) => address);
    let publicKeys = usedUTXOs.map(({keyPair}) => keyPair.public);
    let tx = Blockchain.makeTransaction(
      Object.assign({
          from: addresses,
          nonce: 0,
          pubKey: publicKeys,
        }, {outputs: outputs, fee: fee}));

    // Signing the transaction and deleting the used UTXOs from the wallet
    usedUTXOs.forEach((utxo) => {
      tx.sign(utxo.keyPair.private);
      let index = this.wallet.indexOf(utxo);
      if (index > -1) {
        this.wallet.splice(index, 1);
      }
    });

    // Adding transaction to pending.
    this.pendingOutgoingTransactions.set(tx.id, tx);

    this.net.broadcast(Blockchain.POST_TRANSACTION, tx);

    // If the client is a miner, add the transaction to the current block.
    if (this.addTransaction !== undefined) {
      this.addTransaction(tx, this);
    }

    return tx;
  },
  
}
