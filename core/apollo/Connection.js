
"use strict";

const EventEmitter = require("events").EventEmitter;

const Constants = require("../Constants");
const OPCodes = Constants.OPCodes;
const Operations = OPCodes.Operations;


/**
 * Connection interface object
 * @class Connection
 * @extends EventEmitter
 * @param {Object} data The connection data
 * @param {String} data.endpoint The voice endpoint
 * @param {Number} data.guildId The guild id of the connection
 * @param {Number} data.userId The id of the user the connection exists for
 * @param {Number} data.sessionId The id of the current session
 * @prop {Apollo} apollo The Apollo instance this Connection is managed by (null if not yet registered)
 */
class Connection extends EventEmitter {

  constructor(data) {
    super();

    this.endpoint   = data.endpoint;
    this.guildId    = data.guildId;
    this.channelId  = data.channelId;
    this.userId     = data.userId;
    this.sessionId  = this.sessionId;

    this.apollo = null;
    this.controller = null;
  }


  /**
   * Get the controller for this connection
   * @returns Controller
   * @private
   */
  getController() {
    if (!this.apollo) throw new Error("Connection is not registered yet");
    if (this.controller) return this.controller;

    let controller = this.apollo.lowestLoadController;
    this.controller = controller;

    // Hook events
    controller.on("start", (data) => {
      if (data.guildId === this.guildId) return this.emit("start", data);
    });

    controller.on("end", (data) => {
      if (data.guildId === this.guildId) return this.emit("end", data);
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
        sessionId: this.sessionId
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
  }

}


module.exports = Connection;
