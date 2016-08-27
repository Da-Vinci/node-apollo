
"use strict";

const EventEmitter = require("events").EventEmitter;

const Constants = require("../Constants");
const OPCodes = Constants.OPCodes;
const Operations = Constants.Operations;
const apollo = require('./Apollo');

/**
 * Connection interface object
 * @class Connection
 * @extends EventEmitter
 * @param {Apollo} apollo The Apollo instance
 * @param {Object} data The connection data
 * @param {String} data.endpoint The voice endpoint
 * @param {Number} data.guildId The guild id of the connection
 * @param {Number} data.userId The id of the user the connection exists for
 * @param {Number} data.sessionId The id of the current session
 * @param {String} data.token The connection's voice token
 * @prop {Apollo} apollo The Apollo instance this Connection is managed by (null if not yet registered)
 */
class Connection extends EventEmitter {

  constructor(channel, client, session, token, server, endpoint) {
    super();

    this.apollo = apollo();

    this.endpoint   = endpoint;
    this.guildId    = server.id;
    this.channelId  = channel.id;
    this.userId     = client.user.id;
    this.sessionId  = session;
    this.token      = token;

    console.log(this.apollo);
    console.log(this.endpoint, this.guildId, this.channelId, this.userId, this.sessionId, this.token);

    this.controller = null;

    this.playing = false;
    this.paused = false;
    
    process.nextTick(()=>this.emit("ready"))
  }


  /**
   * Get the controller for this connection
   * @returns Controller
   * @private
   */
  getController() {
    if (!this.apollo) throw new Error("Apollo instance not present, did you initialize the Connection properly?");
    if (this.controller && this.apollo.controllers.has(this.controller.id)) return this.controller;

    let controller = this.apollo.lowestLoadController;
    this.controller = controller;

    if (!controller) {
      return null;
    }

    // Hook events
    controller.on("start", (data) => {
      if (data.guildId === this.guildId) return this.started();
    });

    controller.on("end", (data) => {
      if (data.guildId === this.guildId) return this.ended();
    });
    //

    return controller;
  }

  /**
   * Play a URL on this connection
   * @param {String} url The URL to play
   */
  play(url) {
    let controller = this.getController();

    controller.sendWS({
      op: OPCodes.DISPATCH,
      t: Operations.AUDIO_PLAY,
      d: {
        url: url,
        endpoint: this.endpoint,
        guildId: this.guildId,
        channelId: this.channelId,
        userId: this.userId,
        sessionId: this.sessionId,
        token: this.token
      }
    });
  }

  /**
   * Stop playing on this connection
   */
  stop() {
    let controller = this.getController();

    controller.sendWS({
      op: OPCodes.DISPATCH,
      t: Operations.AUDIO_STOP,
      d: {
        guildId: this.guildId
      }
    });
  }

  /**
   * Set the volume of this connection
   * @param {Number} volume The new volume
   */
  setVolume(volume) {
    let controller = this.getController();

    controller.sendWS({
      op: OPCodes.DISPATCH,
      t: Operations.AUDIO_VOLUME,
      d: {
        guildId: this.guildId,
        volume: volume
      }
    });
  }

  /**
   * Pause playback on this connection
   */
  pause() {
    let controller = this.getController();

    controller.sendWS({
      op: OPCodes.DISPATCH,
      t: Operations.AUDIO_PAUSE,
      d: {
        guildId: this.guildId
      }
    });

    this.paused = true;
  }

  /**
   * Resume playback on this connection
   */
  resume() {
    let controller = this.getController();

    controller.sendWS({
      op: OPCodes.DISPATCH,
      t: Operations.AUDIO_RESUME,
      d: {
        guildId: this.guildId
      }
    });

    this.paused = false;
  }


  /**
   * Called when the audio starts playing
   */
  started() {
    this.playing = true;
    this.emit("ready");
  }

  ended() {
    this.playing = false;
    this.emit("end");
  }

}


module.exports = Connection;
