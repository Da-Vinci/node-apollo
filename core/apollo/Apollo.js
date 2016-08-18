
"use strict";

const path = require('path');

const WebSocketServer = require("ws").Server;
const Controller = require("./Controller");

require('dotenv').config({ silent: true, path: path.join(__dirname, '../../.env') });


/**
 * The Apollo manager instance
 * @class Apollo
 * @param {Object} options Options for the apollo instance
 * @prop {WebSocketServer} wss The websocket server being managed
 * @prop {Array<Controller>} controllers Controllers connected to this Apollo instance
 * @prop {Map<Connection>} connections Registered connections
 */
class Apollo {

  constructor(options) {
    this.wss = null;
    this.controllers = [];

    this.connections = new Map();

    this.start();
  }


  /**
   * Get the controller with the lowest load
   * @returns Controller
  */
  get lowestLoadController() {
    return this.controllers.sort((a, b) => a.load - b.load)[0];
  }

  /**
   * Start the websocket server for controllers
   */
  start() {
    if (this.wss) return;

    if (!process.env.APOLLO_TOKEN) throw new Error("Missing environment variable APOLLO_TOKEN");

    console.log('Creating Apollo WSS Server on port 8443');

    this.wss = new WebSocketServer({port: 8443});

    let wss = this.wss;

    wss.on("connection", (ws) => {
      console.log('Controller connected.');
      let controller = new Controller(ws);
      this.controllers.push(controller);
    });

    wss.on("error", (e) => {
      console.error(e);
    });
  }

}


module.exports = Apollo;
