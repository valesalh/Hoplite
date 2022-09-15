"use-strict";

module.exports = class HopliteNetwork {

// THIS CLASS IS INCOMPLETE

  /**
   * @constructor
   * @param {channels} args - A map/graph of all active payment channels.
   */
	constructor(channels) {

		this.channels = channels ? new Map(channels) : new Map();
	}

	getActiveChannels() {
		return this.channels;
	}

  /**
   * Add a new channel to the network
   */
	addChannel(PaymentChannel) {
		
	}

  /**
   * When a channel is closed, remove it from the network.
   */
	removeChannel() {

	}

  /**
   * A depth first search that looks for a series of channels that
   * meet the requirements to act as intermediaries for two parties
   * to transact indirectly
   * 
   * A more complex solution would find the most optimal path (i.e. shortest)
   * 
   * @returns a map of the channels that make up the path. if no path is available,
   * 			a channel will need to be created.
   */	
   findPath() {
   		// DFS
   			// check that source can be routed to endpoint through intermediaries
   			// verify that channel funds >= transaction amount
   }


  /**
   * Following the path, move funds from one side of channel to the other,
   * until endpoint is reached.
   * 
   * Channels that have 0 funds on one side (meaning one party has exhausted their funds)
   * may not necessarily need to be closed.
   * 
   * @param {path} - the path to follow for making the transaction
   */
   makeTransaction() {
   		// Iterate through path
   			// move transaction amount through channel
   			// when endpoint reached, return success
   }
}