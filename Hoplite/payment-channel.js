"use strict";

let { Client, Blockchain, utils } = require('spartan-gold');
let UtxoClient = require('./utxo-client.js');

module.exports = class PaymentChannel  extends UtxoClient {

  /**
   * @constructor
   * @param {...any} args - Arguments needed for UtxoClient constructor.
   */
	constructor(...args) {
		super(...args);
	}


  /**
   * Initializes all needed fields to make this class a functional payment channel,
   * including a balance sheet and map of keypairs.
   * 
   * @param {Array} commitment - An array containing the clients and the 
   * 							funds they would like to lock into the channel.
   * @returns {Array} - wallet addresses and private keys associated with the channel
   */
	createChannel(commitment) {

		if(this.clients !== undefined && this.clients.length === 2) {
			return;
		}

		this.clients = [commitment[0]['client'], commitment[1]['client']];

		this.clients[0].postTransaction([{ amount: commitment[0]['amount'], address: this.wallet[0]['address'] }]);
		this.clients[1].postTransaction([{ amount: commitment[1]['amount'], address: this.wallet[0]['address'] }]);
		
		let addr1 = this.clients[0].createAddress();
		let addr2 = this.clients[1].createAddress();

		this.keyPairs = new Map();
		this.keyPairs.set(addr1, this.clients[0].keyPair);
		this.keyPairs.set(addr2, this.clients[1].keyPair);

		this.balances = new Map();
		this.balances.set(addr1, commitment[0]['amount']);
		this.balances.set(addr2, commitment[1]['amount']);

		this.balances.set(addr1, this.balances.get(addr1) - Blockchain.DEFAULT_TX_FEE /2);
		this.balances.set(addr2, this.balances.get(addr2) - Blockchain.DEFAULT_TX_FEE /2);

		return [{address: addr1, privKey: this.keyPairs.get(addr1).private},
				{address: addr2, privKey: this.keyPairs.get(addr2).private}];
	}

  /**
   * Returns the balance sheet for this payment channel
   * 
   * @returns {Map} - Balance sheet.
   */
	getBalances() {
		return this.balances;
	}


  /**
   * Makes a transaction on the payment channel. Note that a "to" field 
   * is not specified since these channels only contain two parties.
   * 
   * @param {from} - from address. The party initiating a payment.
   * @param {amount} - amount being pushed to the other side of the channel.
   * @param {getSig} - callback function to get the transactor to sign the transaction
   * 
   * @returns {Boolean} - Whether transaction was successful or not.
   */
	makeTransaction(from, amount, getSig) {
		let tx = 
		{
			from: from,
			amount: amount
		};
		let sig = getSig(tx);

		if(this.verifyTransaction(from, tx, sig)) {
			this.updateBalances(tx);
			console.log(`***HOPLITE*** ${tx.from} transfered ${tx.amount} gold.`);
			return true;
		} else {
			return false;
		}
	}

  /**
   * Does preliminary checks on the transaction and verifies that the transaction signature
   * is valid. 
   * 
   * @param {from} - from address. The party initiating a payment.
   * @param {tx} - transaction messages
   * @param {sig} - signed transaction message
   * 
   * @returns {Boolean} - whether transaction passes all checks
   */
	verifyTransaction(from, tx, sig) {
		if(this.balances.get(from) && tx['amount'] > 0) {
			if(utils.verifySignature(this.keyPairs.get(from).public, tx, sig)) {
				if(tx['amount'] <= this.balances.get(from)) {
					console.log(`***HOPLITE*** Successfully verified transaction`);
					return true;
				} else {
					console.log(`***HOPLITE*** ${from} does not enough gold.`);
				}
			} else {
				console.log(`***HOPLITE*** Couldn't verify signature`);
			}
		}
		console.log(`***HOPLITE*** Transaction verification failed.`);
		return false;
	}


  /**
   * Does preliminary checks on the transaction and verifies that the transaction signature
   * is valid. 
   * @param {tx} - the transaction to update balances
   */
	updateBalances(tx) {
		this.balances.forEach((amount, address) => {
			if(tx['from'] === address) {
				this.balances.set(address, amount - tx['amount']);
			} else {
				this.balances.set(address, amount + tx['amount']);
			}
		});
		console.log(`***HOPLITE*** Updated balance sheet.`);
	}

  /**
   * Closes the payment channel and publishes the final balances sheet to the main 
   * block chain.
   */
	closeChannel() {
		let outputs = [];

		this.balances.forEach((amount, address) => {
			outputs.push({ amount:this.balances.get(address), address: address });
		})

		this.postTransaction(outputs);
	}
}