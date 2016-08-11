
"use strict";

const WebSocket = require("ws");
const child_process = require("child_process");

const Constants = require("../Constants");


class Controller {

  constructor() {
    this.websocket = null;

    this.token = null;
    this.connections = new Map();
  }

  play(guildId, url) {
    var connectionProcess = this.getConnection(guildId);

    connectionProcess.send({
      type: Constants.Operations.AUDIO_PLAY,
      data: {
        url: url
      }
    });
  }

  stop(guildId) {
    this.destroyConnection(guildId);
  }


  getConnection(guildId) {
    var connectionProcess = this.connections.get(guildId);

    if (!connectionProcess) {
      connectionProcess = this.createConnection(guildId);
    }

    return connectionProcess;
  }

  createConnection(guildId) {
    var connectionProcess = child_process.fork("../connection/connectionProcess", [guildId]);
    this.hookConnectionProccess(connectionProcess);
    this.connections.set(guildId, connectionProcess);

    return connectionProcess;
  }

  destroyConnection(guildId) {
    var connectionProcess = this.connections.get(guildId);
    if (!connectionProcess) return;

    connectionProcess.kill("SIGINT");
    this.connections.delete(guildId);
  }

  hookConnectionProccess(guildId, connectionProcess) {
    var self = this;

    const Events = Constants.Events;

    connectionProcess.on("message", (message) => {
      const type = message.type;
      const data = message.data;

      switch (type) {

        case Events.AUDIO_ENDED:
          var data = {
            op: Constants.OPCodes.DISPATCH,
            d: data
          };

          this.send(data);
          break;

        default:
          console.log(`Unknown IPC type: ${type}`);
          break;

      }
    });
  }

  connect() {
    if (this.websocket) return;

    this.websocket = new WebSocket("wss://something.com");

    var self = this;
    var ws = this.websocket;

    ws.on("open", () => {
      var data = {
        op: Constants.OPCodes.IDENTIFY,
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
        console.log(`Unknown WS op code: ${op}`);
        break;

    }
  }

  processWebsocketDispatch(packet) {
    const Operations = Constants.Operations;

    const type = packet.t;
    const data = packet.d;

    switch (type) {

      case Operations.AUDIO_PLAY:
        const guildId = data.guildId;
        const url = data.url;

        this.play(guildId, url);

        break;

      case Operations.AUDIO_STOP:
        const guildId = data.gulidId;

        this.stop(guildId);

        break;

      case Operations.AUDIO_VOLUME:

        break;

      case Operations.AUDIO_PAUSE:

        break;

      case Operations.AUDIO_RESUME:

        break;

      default:
        console.log(`Unknown WS packet type: ${type}`);
        break;

    }
  }
}


module.exports = Controller;
