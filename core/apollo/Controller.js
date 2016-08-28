
"use strict";

const EventEmitter = require("events").EventEmitter;

const Constants = require("../Constants");
const OPCodes = Constants.OPCodes;
const Events = Constants.Events;


/**
 * Controller interface object
 * @class Controller
 * @extends EventEmitter
 * @param {WebSocket} websocket The websocket connection belonging to this controller
 * @param {String?} id The ID of this controller
 * @prop {Array<Number>} loadavg The loadavg of this controller
 * @prop {Number} cpus The number of cpus of this controller
 * @prop {Number} load Loadavg in the last minute as a percentage, normalized to [0-1]
 */
class Controller extends EventEmitter {

  constructor(websocket) {
    super();

    this.websocket = websocket;

    this.id = null;

    this.loadavg = [0, 0, 0];
    this.cpus = 0;
    this.load = 0;

    this.start();
  }


  /**
   * Start listening for websocket messages
   * @private
   */
  start() {
    this.websocket.on("message", (message) => {
      this.processWSMessage(message);
    });
  }

  /**
   * Send data through the websocket
   * @param {Object} data The data to send
   * @private
   */
  sendWS(data) {
    let ws = this.websocket;
    if (!ws) return;

    ws.send(JSON.stringify(data));
  }

  /**
   * Process a websocket message
   * @param {Object} message The websocket message
   * @param {Number} message.op The OP code for the message
   * @param {Object} message.data The data passed in this message
   * @private
   */
  processWSMessage(message) {
    const packet = JSON.parse(message);
    const op = packet.op;
    const data = packet.d;

    switch (packet.op) {

    case OPCodes.DISPATCH:
      this.processWSDispatch(packet);
      break;

    case OPCodes.IDENTIFY:
      this.emit("identify", data);

      break;

    case OPCodes.HEARTBEAT:
      this.loadavg = data.loadavg;
      this.cpus = data.cpus;

      this.load = (this.loadavg[0] / this.cpus);
      break;

    default:
      console.log(`Unknown WS op code: ${op}`);
      break;

    }
  }

  /**
   * Process a websocket dispatch
   * @param {Object} packet The websocket dispatch packet
   * @param {Number} packet.t The packet type
   * @param {Object} packet.d The packet data
   * @private
   */
  processWSDispatch(packet) {
    const type = packet.t;
    const data = packet.d;

    switch (type) {

    case Events.AUDIO_READY:
      this.emit("ready", data);
      break;

    case Events.AUDIO_START:
      this.emit("start", data);
      break;

    case Events.AUDIO_END:
      this.emit("end", data);
      break;

    default:
      console.log(`Unknown WS packet type: ${type}`);
      break;

    }
  }

}


module.exports = Controller;
