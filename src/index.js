import axios from 'axios'
import { GitLfsBasicTransfer, GitLfsMultipartTransfer} from './transfer';
import { getFileHash } from './utils';
axios.defaults.adapter = require('axios/lib/adapters/http');
class Client {
  /**
   * Initialize client with the required parameters
   * @param {*} lfs_server string
   * @param {*} auth_token string
   * @param {*} transferAdapters string[]
   */
  constructor(lfs_server, auth_token=null, transferAdapters=['multipart-basic','basic']) {
    this._url = lfs_server.replace(/\/+$/g,'');
    this._auth_token = auth_token;
    this._transferAdapters = transferAdapters;
    this.LFS_MIME_TYPE = 'application/vnd.git-lfs+json'; 
    this._transferClass = {
      'basic': GitLfsBasicTransfer,
      'multipart-basic': GitLfsMultipartTransfer
    }
  }

  /**
   * 
   * @param {String} prefix 
   * @param {String} operation 
   * @param {Array of Object} objects 
   * @param {String} ref 
   * @param {String} transfers 
   */
  async batch(prefix, operation, objects, ref=null, transfers=null) {
    const url = this._urlFor(null,prefix, 'objects', 'batch');
    if (!transfers) {
        transfers = this._transferAdapters;
    }

    const payload = {'transfers': transfers,
                     'operation': operation,
                     'objects': objects
                    };
    if (ref) payload['ref'] = ref;

    const headers = {
      'Content-type': this.LFS_MIME_TYPE,
      'Accept': this.LFS_MIME_TYPE
    };

    if (this._auth_token) {
      headers['Authorization'] = `Bearer ${this.auth_token}`;
    }
    const response = await axios({
      method: 'post',
      url: url,
      data: payload,
      headers: headers
    });

    if (response.status !== 200) {
      throw new Error(`Unexpected response from LFS server: ${response.status}`);
    }

    return response;
  }

  _urlFor(kwargs, ...args) {
    const path = args.join('/');
    let url = `${this._url}/${path}`;

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
    let prefix = `${organizationId}/${datasetId}`;
    let ref = {name: 'refs/heads/master' };
    let objects = [{
      oid: await getFileHash(file, 'sha256'),
      size: file.size,
    }]
    let response = await this.batch(prefix, 'upload',objects,ref);

    if (response.status !== 200) {
      throw `'batch' request failed: ${response.status}`;
    }

    const negotiatedTransfer = response.data.transfer;
    const objectSpec = response.data.objects[0];

    if (!objectSpec.actions) {
      return false;
    }

    const transferClass = this._transferClass[negotiatedTransfer];
    if (!transferClass) {
      throw `Unknown negotiated tranfer mode: ${negotiatedTransfer}`;
    }
    
    const transferAdapter = new transferClass(objectSpec.actions, file, onProgress);
    await transferAdapter.upload();

    return true;
  }
}

export {Client}