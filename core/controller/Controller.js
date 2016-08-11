
"use strict";

const WebSocket = require("ws");

const Constants = require("./Constants");


class Controller {
  constructor() {
    this.websocket = null;

    this.token = null;
  }

  connect() {
    if (this.websocket) return;

    this.websocket = new WebSocket(Constants.WSS_URL);

    var self = this;
    var ws = this.websocket;

    ws.on("open", () => {
      var data = {
        op: Consants.OPCodes.IDENTIFY,
        d: {
          token: "magic"
        }
      };

      self.send(data);
    });

    ws.on("message", (data) => {
      self.processWebsocketMessage(data);
    });

    ws.on("close", () => {
      self.disconnected();
    });

    ws.on("error", (err) => {
      self.disconnected(err);
    });
  }

  disconnected(err) {
    if (err) {
      console.log(err);
    }

    this.websocket = null;
  }

  send(data) {
    var ws = this.websocket;
    if (!ws) return;

    ws.send(data);
  }

  processWebsocketMessage(e) {
    const OPCodes = Constants.OPCodes;

    const packet = JSON.parse(e);
    const op = packet.op;
    const data = packet.d;

    switch (packet.op) {

      case OPCodes.DISPATCH:
        this.processWebsocketDispatch(packet);
        break;

      case OPCodes.CONNECTED:
        this.token = data.token;
        break;

      default:
        console.log(`Unknown op code: ${op}`);
        break;

    }
  }

  processWebsocketDispatch(packet) {
    const Operations = Constants.Operations;

    const type = packet.t;

    switch (type) {

      case Operations.AUDIO_PLAY:

        break;

      case Operations.AUDIO_STOP:

        break;

      case Operations.AUDIO_VOLUME:

        break;

      case Operations.AUDIO_PAUSE:

        break;

      case Operations.AUDIO_RESUME:

        break;

      default:
        console.log(`Unknown packet type: ${type}`);
        break;

    }
  }
}


module.exports = Controller;
