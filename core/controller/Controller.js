
"use strict";

const WebSocket = require("ws");
const child_process = require("child_process");

const Constants = require("../Constants");


class Controller {

  constructor(wssUrl) {
    this.wssUrl = wssUrl;
    this.websocket = null;

    this.token = null;
    this.connections = new Map();
  }

  play(voiceData, url) {
    let connectionProcess = this.getConnection(voiceData.guildId);

    let data = {
      type: Constants.Operations.AUDIO_PLAY,
      data: {
        voiceData: voiceData,
        url: url
      }
    };

    connectionProcess.send(data);
  }

  stop(guildId) {
    this.destroyConnection(guildId);
  }


  getConnection(guildId) {
    let connectionProcess = this.connections.get(guildId);

    if (!connectionProcess) {
      connectionProcess = this.createConnection(guildId);
    }

    return connectionProcess;
  }

  createConnection(guildId) {
    let connectionProcess = child_process.fork("../connection/connectionProcess", [guildId]);
    this.hookConnectionProccess(connectionProcess);
    this.connections.set(guildId, connectionProcess);

    return connectionProcess;
  }

  destroyConnection(guildId) {
    let connectionProcess = this.connections.get(guildId);
    if (!connectionProcess) return;

    connectionProcess.kill("SIGINT");
    this.connections.delete(guildId);
  }

  sendConnection(guildId, data) {
    let connectionProcess = this.connections.get(guildId);
    if (!connectionProcess) return;

    connectionProcess.send(data);
  }

  replicatePacket(packet) {
    const type = packet.t;
    const data = packet.d;

    this.sendConnection(data.guildId, {
      type: type,
      data: data
    });
  }

  hookConnectionProccess(guildId, connectionProcess) {
    const Events = Constants.Events;

    connectionProcess.on("message", (message) => {
      const type = message.type;
      const data = message.data;

      switch (type) {

      case Events.AUDIO_ENDED:
        var eventData = {
          op: Constants.OPCodes.DISPATCH,
          d: data
        };

        this.send(eventData);
        break;

      default:
        console.log(`Unknown IPC type: ${type}`);
        break;

      }
    });

    connectionProcess.on("SIGINT", () => {
      this.destroyConnection(guildId);
    });
  }

  connect() {
    if (this.websocket) return;

    this.websocket = new WebSocket(this.wssUrl);

    let self = this;
    let ws = this.websocket;

    ws.on("open", () => {
      const data = {
        op: Constants.OPCodes.IDENTIFY,
        d: {
          token: "magic"
        }
      };

      self.sendWS(data);
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

  sendWS(data) {
    let ws = this.websocket;
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
      var voiceData = {
        endpoint:   data.endpoint,
        channelId:  data.channelId,
        userId:     data.userId,
        sessionId:  data.sessionId
      };

      this.play(voiceData, data.url);

      break;

    case Operations.AUDIO_STOP:
      this.stop(data.guildId);

      break;

    case Operations.AUDIO_VOLUME:
      this.replicatePacket(packet);

      break;

    case Operations.AUDIO_PAUSE:
      this.replicatePacket(packet);

      break;

    case Operations.AUDIO_RESUME:
      this.replicatePacket(packet);

      break;

    default:
      console.log(`Unknown WS packet type: ${type}`);
      break;

    }
  }
}


module.exports = Controller;
