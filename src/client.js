import axios from 'axios'

export default class Client {
  /**
   * Initialize client with the required parameters
   * @param {*} lfs_server string
   * @param {*} auth_token string
   * @param {*} transfer_adapters string[]
   */
  constructor(lfs_server, auth_token=null, transfer_adapters=['multipart-basic','basic']) {
    this._url = lfs_server.replace(/\/+$/g,'');
    this._auth_token = auth_token;
    this._transfer_adapters = transfer_adapters;
    this.LFS_MIME_TYPE = 'application/vnd.git-lfs+json'; 
  }

  async batch(prefix, operation, objects, ref=null, transfers=null) {
    const url = this._url_for(null,prefix, 'objects', 'batch');
    if (!transfers) {
        transfers = this.transfer_adapters;
    }

    const payload = {'transfer': transfers,
                     'operations': operation,
                     'object': objects
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

    return response;
  }

  _url_for(kwargs, ...args) {
    const path = args.join('/');
    let url = `${this._url}/${path}`;

    if (kwargs) {
      url = `${url}?${this._urlencode(kwargs)}`;
    }
    return url;
  }

  _urlencode = function(obj) {
    let str = [];
    for (let key in obj) {
      str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
    }
    return str.join("&");
  }
}
