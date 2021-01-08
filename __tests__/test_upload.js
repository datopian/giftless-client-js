import { Client } from '../src';
import nock from 'nock';
import axios from 'axios';
import { open } from 'frictionless.js';
import { getFileHash } from '../src/utils';

axios.defaults.adapter = require('axios/lib/adapters/http');

const config = {
  authToken: 'be270cae-1c77-4853-b8c1-30b6cf5e9878',
  api: 'http://127.0.0.1',
  lfs: 'http://127.0.0.1',
  organizationId: 'myorg',
  datasetId: 'dataset-name',
}

const ckanAuthzConfig = {
  body: {
    scopes: [`obj:${config.organizationId}/${config.datasetId}/*:write`],
  },
}

const accessGranterConfig = {
  body: {
      operation: 'upload',
      transfers: [ 'multipart-basic', 'basic' ],
      ref: { name: 'refs/heads/master' },
      objects: [
        {
          oid: '7b28186dca74020a82ed969101ff551f97aed110d8737cea4763ce5be3a38b47',
          size: 701
        }
      ]
    },
  headers: {
    Accept: 'application/vnd.git-lfs+json',
    'Content-Type': 'application/vnd.git-lfs+json',
    Authorization:
      'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzY29wZXMi===',
  },
}

const cloudStorageConfig = {
  api: 'https://myaccount.blob.core.windows.net/mycontainer',
  path: '/my-blob',
  body: {},
}

/**
 * Mock
 */
const ckanAuthzMock = nock('http://127.0.0.1')
  .persist()
  .post('/api/3/action/authz_authorize', ckanAuthzConfig.body)
  .reply(200, {
    help: 'http://localhost:5000/api/3/action/help_show?name=authz_authorize',
    success: true,
    result: {
      requested_scopes: ['obj:myorg/dataset-name/*:write'],
      granted_scopes: [],
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzY29wZXMiOiIiLCJ== ',
      user_id: 'admin',
      expires_at: '2020-04-22T20:08:41.102934+00:00',
    },
  })

const mainAuthzMock_forCloudStorageAccessGranterServiceMock = nock(config.api)
  .persist()
  .post(
    `/${config.organizationId}/${config.datasetId}/objects/batch`,
    accessGranterConfig.body
  )
  .reply(200, {
    transfer: 'basic',
    objects: [
      {
        oid:
          '8857053d874453bbe8e7613b09874e2d8fc9ddffd2130a579ca918301c31b369',
        size: 701,
        authenticated: true,
        actions: {
          upload: {
            href:
              'https://myaccount.blob.core.windows.net/mycontainer/my-blob',
            header: accessGranterConfig.headers,
            expires_in: 86400,
          },
          verify: {
            href: 'https://some-verify-callback.com',
            header: {
              Authorization: 'Bearer TOKEN',
            },
            expires_in: 86400,
          },
        },
      },
    ],
  })

const cloudStorageMock = nock(cloudStorageConfig.api, {
  reqheaders:{
    Accept: 'application/vnd.git-lfs+json',
    'Content-Type': 'application/octet-stream',
    Authorization:
      'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzY29wZXMi===',
  },
})
  .persist()
  .filteringRequestBody((body) => cloudStorageConfig.body)
  .put(cloudStorageConfig.path, cloudStorageConfig.body)
  .reply(201, { success: true }) // The return of the azure is only 201 - ok

const verifyFileUploadMock = nock('https://some-verify-callback.com')
  .persist()
  .post('/')
  .reply(200, {
    message: 'Verify Uploaded Successfully',
    success: true,
  })

const doUploadMock = nock('https://myaccount.blob.core.windows.net')
  .persist()
  .put('/mycontainer/my-blob', {
    path: './__test__/data/sample.csv',
    pathType: 'local',
    name: 'sample',
    format: 'csv',
    mediatype: 'text/csv',
    encoding: 'UTF-8'
  })
  .reply(200, {})

  describe('Gifless client Upload', () => {
    it('should push work with packaged dataset', async () => {
      const token = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzY29wZXMi==='
      const client  = new Client(config.api, token);
      const file = open('./__tests__/data/sample.csv')
      await client.upload(file, config.organizationId, config.datasetId);
      
    })
  });