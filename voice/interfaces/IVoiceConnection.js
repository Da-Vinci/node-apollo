"use strict";

const Utils = require("../core/Utils");
const ExternalEncoderFactory = require("../voice/players/ExternalEncoderFactory");

function initInterface(_interface, _options) {
  if (!_interface)
    throw new TypeError("Invalid interface");
  if (_options) _interface.initialize(_options);
  return _interface;
}

/**
 * @interface
 */
class IVoiceConnection {
  constructor(voiceSocket) {
    // todo: ssrc to user
    //discordie.Dispatcher.on(Events.VOICE_SPEAKING, e => {
    //  if (e.socket == voicews) this.emit("speaking", - bla - resolve ssrc)
    //});

    this._voiceSocket = voiceSocket;
    this._lastChannelId = null;
    Utils.privatify(this);

    // if (!this.canStream)
    //   throw new Error("Failed to create IVoiceConnection");
  }
  dispose() {
    this._lastChannelId = this.channelId;
    this._voiceSocket = null;
  }

  /**
   * Checks whether this voice connection is no longer valid.
   * @returns {boolean}
   * @readonly
   */
  get disposed() {
    return !this._voiceSocket;
  }

  /**
   * Checks whether this voice connection is fully initialized.
   * @returns {boolean}
   * @readonly
   */
  get canStream() {
    return this._voiceSocket && this._voiceSocket.canStream;
  }

  /**
   * Gets channel id of this voice connection.
   *
   * Returns last channel id it was connected to if voice connection has been
   * disposed.
   * @returns {String|null}
   * @readonly
   */
  get channelId() {
    if (this._lastChannelId) return this._lastChannelId;
    return voiceState.channelId;
  }

  /**
   * Gets guild id of this voice connection.
   *
   * Returns null if this is a private call.
   * @returns {String|null}
   * @readonly
   */
  get guildId() {
    return this._voiceSocket ? this._voiceSocket.guildId : null;
  }

  /**
   * Initializes encoder and gets stream for this voice connection.
   *
   * Calls without arguments return existing encoder without reinitialization.
   *
   * See `AudioEncoder.initialize()` method for list of options.
   * @param [options]
   * @returns {AudioEncoderStream}
   */
  getEncoderStream(options) {
    const encoder = this.getEncoder(options);
    if (!encoder) return null;
    return encoder._stream;
  }
  createDecoderStream(options) {

  }

  /**
   * Creates an external encoder.
   *
   * Accepts options object with `type` property (default `{type: "ffmpeg"}`).
   * Each type supports additional options.
   * See docs for returned classes for usage info.
   * @param {Object} [options]
   * @returns {FFmpegEncoder|
   *           OggOpusPlayer|
   *           WebmOpusPlayer}
   */
  createExternalEncoder(options) {
    if (!this._voiceSocket) return null;
    return ExternalEncoderFactory.create(this, options);
  }

  /**
   * Initializes encoder instance for this voice connection.
   *
   * Calls without arguments return existing encoder without reinitialization.
   *
   * See `AudioEncoder.initialize()` method for list of options.
   * @param {Object} [options]
   * @returns {AudioEncoder}
   */
  getEncoder(options) {
    if (!this._voiceSocket) return null;
    return initInterface(this._voiceSocket.audioEncoder, options);
  }

  /**
   * Initializes decoder instance for this voice connection.
   *
   * Calls without arguments return existing decoder without reinitialization.
   * @param {Object} [options]
   * @returns {AudioDecoder}
   */
  getDecoder(options) {
    if (!this._voiceSocket) return null;
    return initInterface(this._voiceSocket.audioDecoder, options);
  }

  /**
   * Disconnects this voice connection.
   */
  disconnect() {
    this._disconnect();
  }

  _disconnect(error) {
    // TODO: implement
  }
}

module.exports = IVoiceConnection;
