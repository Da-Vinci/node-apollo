
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
 * @prop {Map<Controller>} controllers Controllers connected to this Apollo instance
 */
class Apollo {

  constructor(options) {
    this.wss = null;

    this.unavailableControllers = [];
    this.controllers = new Map();

    this.start();
  }


  /**
   * Get the controller with the lowest load
   * @returns Controller
  */
  get lowestLoadController() {
    return [...this.controllers.values()].sort((a, b) => a.load - b.load)[0];
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
      let controller = new Controller(ws);
      this.unavailableControllers.push(controller);

      ws.once("close", () => {
        if (controller.id) {
          this.controllers.delete(controller.id);
        }
      });

      var identify = (data) => {
        clearTimeout(timeout);
        this.unavailableControllers.splice(this.unavailableControllers.indexOf(controller), 1);

        if (data.token === process.env.APOLLO_TOKEN) {
          controller.id = data.id;
          this.controllers.set(data.id, controller);
        }
        else {
          ws.close();
        }
      };

      let timeout = setTimeout(() => {
        controller.removeListener("identify", identify);
        this.unavailableControllers.splice(this.unavailableControllers.indexOf(controller), 1);
      }, (10 * 1000));

      controller.once("identify", identify);
    });

    wss.on("error", (e) => {
      console.error(e);
    });
  }

}


module.exports = Apollo;
