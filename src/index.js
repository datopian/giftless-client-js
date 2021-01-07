import axios from 'axios'

class Client {
  
  /**
   * Initialize client with the required parameters
   * @param {String} lfs_server LFS Server url
   * @param {String} auth_token token to access LFS Server
   * @param {Array} transfer_adapters Transfer adapters method
   */
  constructor(lfs_server, auth_token=null, transfer_adapters=['multipart-basic','basic']) {
    this._url = lfs_server.replace(/\/+$/g,'');
    this._auth_token = auth_token;
    this._transfer_adapters = transfer_adapters;
    this.LFS_MIME_TYPE = 'application/vnd.git-lfs+json'; 
  }

  async batch(prefix, operation, objects, ref=null, transfers) {
    const url = this._urlFor(null,prefix, 'objects', 'batch');
    if (!transfers) {
        transfers = this._transfer_adapters;
    }

    const payload = { transfers,
                    operation,
                     objects
                    };
    if (ref) payload['ref'] = 'ref';

    const headers = {
      'Content-type': this.LFS_MIME_TYPE,
      'Accept': this.LFS_MIME_TYPE
    };

    if (this._auth_token) {
      headers['Authorization'] = `Bearer ${this._auth_token}`;
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

    return response.data;
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
}

export { Client }