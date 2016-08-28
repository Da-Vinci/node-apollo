
"use strict";

const child_process = require("child_process");
const os = require("os");

const WebSocket = require("ws");

const Constants = require("../Constants");
const OPCodes = Constants.OPCodes;
const Operations = Constants.Operations;
const Events = Constants.Events;


/**
 * Controller manages Apollo requests
 * @class Controller
 * @param {Object} options Controller options
 * @param {String} options.id An identifier for the controller, optional
 * @param {String} options.wsURL The websocket url to connect to
 * @param {Number} options.reconnectTimeout The timeout (in seconds) before attempting to re-connect to a closed websocket
 * @prop {WebSocket} websocket The websocket of the controller
 * @prop {Number} heartbeatInterval The interval ID of the heartbeat interval
 * @prop {String} token The bot token, retrieved from the Apollo server
 * @prop {Map<Connections>} connections Connection processes managed by this controller
 */
class Controller {

  constructor(options) {
    this.id = process.env.APOLLO_ID || Math.floor(Math.random() * 100000).toString(36);
    this.wsURL = options.wsURL;
    this.reconnectTimeout = options.reconnectTimeout || 5000;

    this.websocket = null;
    this.heartbeatInterval = null;

    this.token = null;
    this.connections = new Map();

    this.connect();
  }


  /**
   * Play audio from a URL
   * @param {Object} voiceData Data for the voice socket (see Player for more information)
   * @param {String} url The URL for the audio source
   * @private
   */
  play(voiceData, url) {
    let connectionProcess = this.getConnection(voiceData);

    let data = {
      type: Operations.AUDIO_PLAY,
      data: {
        voiceData: voiceData,
        url: url
      }
    };

    connectionProcess.send(data);

    this.heartbeat();
  }

  /**
   * Close a connection and stop playing audio
   * @param {Number} guildId The guild id of the connection to close
   * @private
   */
  stop(guildId) {
    this.destroyConnection(guildId);
  }


  /**
   * Get the connection from a guild id (created if non-existant)
   * @param {Number} guildId The guild id of the connection
   * @returns ChildProcess
   * @private
   */
  getConnection(voiceData) {
    let connectionProcess = this.connections.get(voiceData.guildId);

    if (!connectionProcess || connectionProcess.spawnargs[6] !== voiceData.sessionId) {
      this.destroyConnection(voiceData.guildId);
      connectionProcess = this.createConnection(voiceData);
    }

    return connectionProcess;
  }

  /**
   * Creates a connection process
   * @param {Number} guildId The guild id of the connection
   * @returns ChildProcess
   * @private
   */
  createConnection(voiceData) {
    let connectionProcess = child_process.fork("./core/connection/connectionProcess", [
      voiceData.endpoint,
      voiceData.guildId,
      voiceData.channelId,
      voiceData.userId,
      voiceData.sessionId,
      voiceData.token
    ]);

    this.hookConnectionProccess(voiceData.guildId, connectionProcess);
    this.connections.set(voiceData.guildId, connectionProcess);

    return connectionProcess;
  }

  /**
   * Destroys a connection process
   * @param {Number} guildId The guild id of the connection
   * @private
   */
  destroyConnection(guildId) {
    let connectionProcess = this.connections.get(guildId);
    if (!connectionProcess) return;

    connectionProcess.kill("SIGINT");
    this.connections.delete(guildId);
  }

  /**
   * Sends a message to a connection process
   * @param {Number} guildId The guild id of the connection
   * @param {Object} data The data to send the connection
   * @private
   */
  sendConnection(guildId, data) {
    let connectionProcess = this.connections.get(guildId);
    if (!connectionProcess) return;

    connectionProcess.send(data);
  }

  /**
   * Replicates a websokcet packet to the target connection process
   * @param {Object} packet The packet object
   * @param {Number} packet.t The packet type
   * @param {Object} packet.d The packet data
   * @private
   */
  replicatePacket(packet) {
    const type = packet.t;
    const data = packet.d;

    this.sendConnection(data.guildId, {
      type: type,
      data: data
    });
  }

  /**
   * Hook into the IPC channel of a connection process
   * @param {Number} guildId The guild id of the connection
   * @param {ChildProcess} connectionProcess The connection process instance
   * @private
   */
  hookConnectionProccess(guildId, connectionProcess) {
    connectionProcess.on("message", (message) => {

      const type = message.type;
      const data = message.data;

      switch (type) {

      case Events.AUDIO_RESUME:
        var readyData = {
          op: OPCodes.DISPATCH,
          t: Events.AUDIO_READY,
          d: data
        };

        this.sendWS(readyData);
        break;

      case Events.AUDIO_START:
        var startData = {
          op: OPCodes.DISPATCH,
          t: Events.AUDIO_START,
          d: data
        };

        this.sendWS(startData);
        break;

      case Events.AUDIO_END:
        var endData = {
          op: OPCodes.DISPATCH,
          t: Events.AUDIO_END,
          d: data
        };

        this.sendWS(endData);
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

  /**
   * Connect to the Apollo websocket server
   * @private
   */
  connect() {
    if (this.websocket) return;

    if (!process.env.APOLLO_TOKEN) throw new Error("Missing environment variable APOLLO_TOKEN");

    this.websocket = new WebSocket(this.wsURL);

    let ws = this.websocket;

    ws.on("open", () => {
      console.log('Apollo connection open.');
      const data = {
        op: OPCodes.IDENTIFY,
        d: {
          id: this.id,
          token: process.env.APOLLO_TOKEN
        }
      };

      this.heartbeatInterval = setInterval(() => {
        this.heartbeat();
      }, (30 * 1000));

      this.sendWS(data);
    });

    ws.on("message", (data) => {
      this.processWSMessage(data);
    });

    ws.on("close", () => {
      this.disconnected();
    });

    ws.on("error", (err) => {
      this.disconnected(err);
    });
  }

  /**
   * Called when the websocket gets disconnected
   * @param {Error} err The error, if one occurred
   * @private
   */
  disconnected(err) {
    if (err) {
      console.log(err);
    }

    console.log('Apollo connection closed.');

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    delete this.websocket;
    delete this.heartbeatInterval;

    setTimeout(this.connect.bind(this), this.reconnectTimeout);
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
   * Send a heartbeat packet
   * @private
   */
  heartbeat() {
    this.sendWS({
      op: OPCodes.HEARTBEAT,
      d: {
        timestamp: Date.now(),
        loadavg: os.loadavg(),
        cpus: os.cpus().length
      }
    });
  }

  /**
   * Process a websocket message
   * @param {Object} message The websocket message
   * @param {Number} message.op The OP code for the message
   * @param {Object} message.d The data passed in this message
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

    case OPCodes.CONNECTED:


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

    case Operations.AUDIO_PLAY:
      var voiceData = {
        endpoint:   data.endpoint,
        guildId:    data.guildId,
        channelId:  data.channelId,
        userId:     data.userId,
        sessionId:  data.sessionId,
        token:      data.token
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
