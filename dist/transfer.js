"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.GitLfsMultipartTransfer = exports.GitLfsBasicTransfer = void 0;

var _utils = require("./utils");

var _axios = _interopRequireDefault(require("axios"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @typedef {Object} BasicLfsAction An LFS basic transfer mode action descriptor
 * @property {String} href
 * @property {Object<String, String>} header
 * @property {Number} expires_in
 */
class GitLfsBasicTransfer {
  /**
   * Create a new 'basic' transfer adapter
   *
   * @param {Object} actions
   * @param {BasicLfsAction} actions.upload
   * @param {BasicLfsAction} actions.verify
   * @param {File} file
   * @param {CallableFunction} onProgress
   */
  constructor(actions, file, onProgress) {
    this.file = file;
    this.onProgess = onProgress;
    this.uploadAction = actions.upload || null;
    this.verifyAction = actions.verify || null;
  }
  /**
   * Upload the file to storage, using the protocol specified by the
   * transfer adapter
   *
   * @returns {Promise<boolean>}
   */


  async upload() {
    let response;

    if (this.uploadAction) {
      response = await this._doUpload();

      if (!(response.status >= 200 && response.status < 300)) {
        throw `'upload' action failed with HTTP ${response.status}`;
      }
    }

    if (this.verifyAction) {
      response = await this._doVerify();

      if (response.status !== 200) {
        if (response.message) {
          throw response.message;
        } else {
          throw `'verify' action failed with HTTP ${response.status}`;
        }
      }
    }

    return true;
  }

  async _doUpload() {
    const {
      href,
      header
    } = this.uploadAction;
    const body = this.file.descriptor;
    const config = {
      headers: {
        "Content-type": this.file.descriptor.type || 'application/octet-stream',
        ...header
      }
    };

    if (this.onProgess) {
      config.onUploadProgress = this.onProgess;
    }

    const {
      status,
      message
    } = await _axios.default.put(href, body, config);
    return {
      status,
      message
    };
  }

  async _doVerify() {
    const body = JSON.stringify({
      oid: await (0, _utils.getFileHash)(this.file, 'sha256'),
      size: this.file.size
    });
    const config = {
      headers: {
        'Accept': 'application/vnd.git-lfs+json',
        'Content-Type': 'application/vnd.git-lfs+json',
        ...this.verifyAction.header
      }
    };
    const {
      status,
      message
    } = await _axios.default.post(this.verifyAction.href, body, config);
    return {
      status,
      message
    };
  }

}
/**
 * @typedef {Object} MultipartLfsActions
 * @property {MultipartLfsAction} init
 * @property {MultipartLfsAction} commit
 * @property {BasicLfsAction} verify
 * @property {Array<MultipartLfsPartAction>} parts
 */


exports.GitLfsBasicTransfer = GitLfsBasicTransfer;

class GitLfsMultipartTransfer {
  /**
   * Create a new LFS multipart-basic transfer adapter
   *
   * @param {MultipartLfsActions} actions
   * @param {File} file
   * @param {CallableFunction} onProgress
   */
  constructor(actions, file, onProgress) {
    this.file = file;
    this.externalProgressCallback = onProgress;
    this.actions = actions;
    this.bytesTotal = 0;
    this.bytesUploaded = 0;
  }
  /**
   * Upload a file using multipart-basic transfer mode
   *
   * @returns {Promise<void>}
   */


  async upload() {
    let response;

    if (this.actions.init) {
      response = await this._doInit(this.actions.init);

      if (!(response.status >= 200 && response.status < 300)) {
        throw `'init' action failed with HTTP ${response.status}`;
      }
    }

    const parts = this.actions.parts || [];
    this.bytesTotal = this.file.size;
    this.bytesUploaded = this.bytesTotal - this._getBytesToUpload(parts);

    for (let i = 0; i < parts.length; i++) {
      console.log(`Uploading part ${i + 1}/${parts.length}`);
      response = await this._uploadPart(parts[i]);

      if (!(response.status >= 200 && response.status < 300)) {
        throw `'part upload failed for part ${i + 1}/${parts.length} with HTTP ${response.status}`;
      }

      this.bytesUploaded += this._getBytesForPart(parts[i]);
    }

    if (this.actions.commit) {
      response = await this._doCommit(this.actions.commit);

      if (!(response.status >= 200 && response.status < 300)) {
        throw `'commit' action failed with HTTP ${response.status}`;
      }
    }

    if (this.actions.verify) {
      response = await this._doVerify(this.actions.verify);

      if (response.status !== 200) {
        if (response.message) {
          throw response.message;
        } else {
          throw `'verify' action failed with HTTP ${response.status}`;
        }
      }
    }
  }
  /**
   *
   * @param {MultipartLfsAction} initAction
   * @returns {Promise<AxiosResponse<any>>}
   * @private
   */


  async _doInit(initAction) {
    const config = {
      method: initAction.method || 'POST',
      url: initAction.href,
      headers: initAction.header || {},
      data: initAction.body || null
    };
    const {
      status,
      message
    } = await _axios.default.request(config);
    return {
      status,
      message
    };
  }
  /**
   * Upload a single part
   *
   * @param {MultipartLfsPartAction} partAction
   * @returns {Promise<AxiosResponse<any>>}
   * @private
   */


  async _uploadPart(partAction) {
    const startPos = partAction.pos || 0;
    const partSize = partAction.size || null;
    const part = await this._readChunk(startPos, partSize);
    const headers = partAction.header || {};

    if (partAction.want_digest) {
      await this._setContentDigestHeaders(part, partAction.want_digest, headers);
    }

    const config = {
      method: partAction.method || 'PUT',
      url: partAction.href,
      headers: headers,
      data: part,
      onUploadProgress: e => {
        return this._onUploadProgress(e);
      }
    };
    const {
      status,
      message
    } = await _axios.default.request(config);
    return {
      status,
      message
    };
  }
  /**
   * Send the 'commit' action
   *
   * @param {MultipartLfsAction} commitAction
   * @returns {Promise<AxiosResponse<any>>}
   * @private
   */


  async _doCommit(commitAction) {
    const config = {
      method: commitAction.method || 'POST',
      url: commitAction.href,
      headers: commitAction.header || {},
      data: commitAction.body || null
    };
    const {
      status,
      message
    } = await _axios.default.request(config);
    return {
      status,
      message
    };
  }
  /**
   * Send the 'verify' action
   *
   * @param {BasicLfsAction} verifyAction
   * @returns {Promise<AxiosResponse<any>>}
   * @private
   */


  async _doVerify(verifyAction) {
    const body = JSON.stringify({
      oid: await (0, _utils.getFileHash)(this.file, 'sha256'),
      size: this.file.size
    });
    const config = {
      headers: {
        Accept: 'application/vnd.git-lfs+json',
        'Content-Type': 'application/vnd.git-lfs+json',
        ...verifyAction.header
      }
    };
    const {
      status,
      message
    } = await _axios.default.post(verifyAction.href, body, config);
    return {
      status,
      message
    };
  }
  /**
   * Read a chunk of a file
   *
   * @param {Number} start
   * @param {Number | null} size
   * @returns {Promise<Blob>}
   * @private
   */


  async _readChunk(start, size) {
    if (size === null) {
      return this.file.descriptor.slice(start);
    } else {
      return this.file.descriptor.slice(start, start + size);
    }
  }
  /**
   *
   * @param {Blob} part
   * @param {String} wantDigest
   * @param {Object <String, String>} headers
   * @returns {Promise<void>}
   * @private
   */


  async _setContentDigestHeaders(part, wantDigest, headers) {
    // TODO: negotiate digest algorithm and set headers accordingly
    // TODO: add support for Digest algorithms (SHA1, SHA256, etc.)
    // if (wantDigest === 'contentMD5') {
    //   headers['Content-MD5'] = await computeHash(part, part.size, 'md5', null, 'base64');
    // }
    console.log(`Don't know how to specify digest for '${wantDigest}', ignoring`);
  }
  /**
   * Progress event handler
   *
   * This is passed as the progress handler for Axios, and is in turn
   * responsible for calling the passed in progress callback with data that
   * will mimic the native progress event but will represent progress taking
   * into account all parts to be uploaded
   *
   * @param {ProgressEvent} progressEvent
   * @private
   */


  _onUploadProgress(progressEvent) {
    if (!this.externalProgressCallback) {
      return;
    }

    let loaded = this.bytesUploaded;
    let total = this.bytesTotal;

    if (progressEvent.lengthComputable) {
      loaded += progressEvent.loaded;
    }

    const realProgress = new ProgressEvent('ProgressEvent', {
      lengthComputable: true,
      loaded,
      total
    });
    this.externalProgressCallback(realProgress);
  }
  /**
   * Get total bytes to upload from all parts
   *
   * @param {Array <MultipartLfsPartAction>} parts
   * @returns {Number} Total bytes
   * @private
   */


  _getBytesToUpload(parts) {
    return parts.reduce((total, currentPart) => total + this._getBytesForPart(currentPart), 0);
  }
  /**
   * Get bytes to upload for a part; This is not always straightforward.
   *
   * @param {MultipartLfsPartAction} part
   * @returns {Number}
   * @private
   */


  _getBytesForPart(part) {
    if (part.size) {
      return part.size;
    }

    if (part.pos) {
      return this.file.size - part.pos;
    }

    return this.file.size;
  }

}

exports.GitLfsMultipartTransfer = GitLfsMultipartTransfer;