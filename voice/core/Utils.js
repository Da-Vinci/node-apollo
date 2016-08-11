"use strict";
module.exports = {
  allocBuffer(size) {
    return Buffer.alloc ? Buffer.alloc(size) : new Buffer(size);
  },
  createArrayBuffer(source) {
    var view = new Uint8Array(new ArrayBuffer(source.length));
    for (var i = 0; i < view.length; i++)
      view[i] = source[i];
    return view.buffer;
  },
  createBuffer(source) {
    if (source instanceof Float32Array) {
      var buf = this.allocBuffer(source.length * 4);
      for (var i = 0; i < source.length; i++) {
        buf.writeFloatLE(source[i], i * 4);
      }
      return buf;
    }

    var view = new Uint8Array(source);
    var buf = this.allocBuffer(view.length);
    for (var i = 0; i < view.length; i++)
      buf[i] = view[i];
    return buf;
  },
  bindGatewayEventHandlers(source, event, map) {
    if (!event.type)
      throw new Error(`Invalid event '${event.type}'`);

    let handler = map[event.type];
    if (!handler) return;

    if (typeof handler !== "function")
      throw new Error(`Invalid handler ${handler} for event ${event.type}`);

    if (handler.call(source, event.data, event))
      event.handled = true;
  },
  privatify(target) {
    for (var k in target) {
      if (k.charCodeAt(0) != 95) // "_"
        continue;
      if (!target.hasOwnProperty(k)) continue;
      Object.defineProperty(target, k, {enumerable: false});
    }
  },
  definePrivate(target, kv) {
    for (var k in kv) {
      Object.defineProperty(target, k, {
        enumberable: false,
        writable: true,
        value: kv[k]
      });
    }
  },
  reorderObjects(array, target, position) {
    array = array.slice();
    array.sort((a, b) => (a.position > b.position));
    const from = Math.max(array.findIndex(c => (c.id == target.id)), 0);
    const to = Math.min(Math.max(position, 0), array.length - 1);

    if (from == to) return;

    const remove = (i) => array.splice(i, 1)[0];
    const insert = (i, v) => array.splice(i, 0, v);

    insert(to, remove(from));

    const updated = array.map((c, i) => ({id: c.valueOf(), position: i}));
    const changes = to > from ?
      updated.slice(from, to + 1) :
      updated.slice(to, from + 1);

    return changes;
  },
  imageToDataURL(buffer) {
    if (!buffer || !(buffer instanceof Buffer)) return null;

    const types = {
      0xFFD8FF: "image/jpg",
      0x89504E: "image/png"
    };

    const magic = buffer.readUIntBE(0, 3);
    const type = types[magic];
    if (!type) return null;

    return `data:${type};base64,` + buffer.toString("base64");
  },
  timestampFromSnowflake(id) {
    return id ? (+id / 4194304) + 1420070400000 : 0;
  },
  convertMentions(mentions) {
    if (!mentions) return mentions;
    if (mentions.map) return mentions.map(m => m.valueOf());
    return [mentions.valueOf()];
  },
  fileExists(path) {
    try {
      return require("fs").statSync(path).isFile();
    } catch (e) { return false; }
  }
};
