import axios from 'axios'

class Client {

  /**
   * Initialize client with the required parameters
   * @param {String} lfsServer LFS Server url
   * @param {String} authToken token to access LFS Server
   * @param {Array} transferAdapters Transfer adapters method
   */
  constructor(lfsServer, authToken=null, transferAdapters=['multipart-basic','basic']) {
    this.url = lfsServer.replace(/\/+$/g,'');
    this.authToken = authToken;
    this.transferAdapters = transferAdapters;
    this.lfsMimeType = 'application/vnd.git-lfs+json'; 
  }

  async batch(prefix, operation, objects, ref=null, transfers) {
    const url = this._urlFor(null,prefix, 'objects', 'batch');
    if (!transfers) {
        transfers = this.transferAdapters;
    }

    const payload = { transfers,
                      operation,
                      objects
                    };
    if (ref) payload['ref'] = 'ref';

    const headers = {
      'Content-type': this.lfsMimeType,
      'Accept': this.lfsMimeType
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const response = await axios({
      method: 'post',
      url: url,
      data: payload,
      headers: headers
    });

    const { status, data } = response
    
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
}

export { Client }