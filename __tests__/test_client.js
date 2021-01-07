import axios from 'axios'
import moxios from 'moxios'
import { Client } from '../src';

jest.setTimeout(60000);

describe('Giftless client Test', () => {

  const file_object = {
    "oid": "4ae7c3b6ac0beff671efa8cf57386151c06e58ca53a78d83f36107316cec125f",
    "size": 12
  };

  const jsonObject = {
    transfer : "basic",
    objects: [{"oid": file_object['oid'],
                     "size": file_object['size'],
                     "actions": {
                        "download": {
                            "href": "https://storage.myserver.com/myorg/myrepo/getthatfile",
                            "header": {"Authorization": "Bearer sometoken"},
                            "expires_at": "2021-11-10T15:29:07Z"
                        }
                    }
              }]            
  };

  beforeEach(() => {
    moxios.install(axios);

    moxios.stubRequest('http://myserver.com/myorg/myrepo/objects/batch', {
      status: 200,
      response: jsonObject
    })
  });

  afterEach(() => {
    moxios.uninstall(axios);
  });

  it('should obtain result from the mock api', async () => {
    const client = new Client('http://myserver.com');
    const response = await client.batch('myorg/myrepo', 'download', [file_object])
    expect(response["transfer"]).toEqual('basic');
  });
});