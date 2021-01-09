"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Client = void 0;

var _axios = _interopRequireDefault(require("axios"));

var _transfer = require("./transfer");

var _utils = require("./utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_axios.default.defaults.adapter = require('axios/lib/adapters/http');

class Client {
  /**
   * Initialize client with the required parameters
   * @param {String} lfsServer LFS Server url
   * @param {String} authToken token to access LFS Server
   * @param {Array} transferAdapters Transfer adapters method
   */
  constructor(lfsServer, authToken = null, transferAdapters = ['multipart-basic', 'basic']) {
    this.url = lfsServer.replace(/\/+$/g, '');
    this.authToken = authToken;
    this.transferAdapters = transferAdapters;
    this.lfsMimeType = 'application/vnd.git-lfs+json';
    this.transferClass = {
      'basic': _transfer.GitLfsBasicTransfer,
      'multipart-basic': _transfer.GitLfsMultipartTransfer
    };
  }
  /**
   * 
   * @param {String} prefix 
   * @param {String} operation 
   * @param {Array of Object} objects 
   * @param {String} ref 
   * @param {String} transfers 
   */


  async batch(prefix, operation, objects, ref = null, transfers) {
    const url = this._urlFor(null, prefix, 'objects', 'batch');

    if (!transfers) {
      transfers = this.transferAdapters;
    }

    const payload = {
      transfers,
      operation,
      objects
    };
    if (ref) payload['ref'] = ref;
    const headers = {
      'Content-type': this.lfsMimeType,
      'Accept': this.lfsMimeType
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const response = await (0, _axios.default)({
      method: 'post',
      url: url,
      data: payload,
      headers: headers
    });
    const {
      status,
      data
    } = response;

    if (status !== 200) {
      throw new Error(`Unexpected response from LFS server: ${response.status} - ${response.statusText}`);
    }

    return {
      status,
      data
    };
  }

  _urlFor(kwargs, ...args) {
    const path = args.join('/');
    let url = `${this.url}/${path}`;

    if (kwargs) {
      url = `${url}?${this._urlEncode(kwargs)}`;
    }

    return url;
  }

  _urlEncode(obj) {
    let str = [];

    for (let key in obj) {
      str.push(encodeURIComponent(key) + "=" + encodeURIComponent(obj[key]));
    }

    return str.join("&");
  }
  /**
   * Upload a file using Git LFS Server
   * @param {File} file 
   * @param {String} organizationId 
   * @param {String} datasetId 
   * @param {String} onProgress 
   */


  async upload(file, organizationId, datasetId, onProgress) {
    const prefix = `${organizationId}/${datasetId}`;
    const ref = {
      name: 'refs/heads/master'
    };
    const objects = [{
      oid: await (0, _utils.getFileHash)(file, 'sha256'),
      size: file.size
    }];
    const response = await this.batch(prefix, 'upload', objects, ref);

    if (response.status !== 200) {
      throw `'batch' request failed: ${response.status}`;
    }

    const negotiatedTransfer = response.data.transfer;
    const objectSpec = response.data.objects[0];

    if (!objectSpec.actions) {
      return false;
    }

    const transferClass = this.transferClass[negotiatedTransfer];

    if (!transferClass) {
      throw `Unknown negotiated tranfer mode: ${negotiatedTransfer}`;
    }

    const transferAdapter = new transferClass(objectSpec.actions, file, onProgress);
    await transferAdapter.upload();
    return true;
  }

}

exports.Client = Client;