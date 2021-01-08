# giftless-client-js

<div align="center">
  
[![The MIT License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](http://opensource.org/licenses/MIT)

</div>

Javascript implementation of [giftless-client](https://github.com/datopian/giftless-client)

## Installation

You can install directly from npm:

```bash
$ npm i giftless-client
```

## API

This implementation of giftless-client exposes a main class called `Client` which contains a low-level LFS API commands callled `batch`.

### instantiating Client

```js
import { Client } from "giftless-client";

client = new Client("https://git-lfs.example.com", "somer4nd0mT0ken==", [
  "basic",
]);
```

### Sending an LFS batch API request

```js
client.batch(
  "myorg/myrepo",
  "download",
  [
    {
      oid: "12345678",
      size: 123,
    }
  ]
  )
);
```

### Upload to Gitless LFS Server

Resources can be uploaded to lfs server using the client upload method `upload(file, organisationId, datasetId, onProgress)`

```js
import { open } from 'frictionlessjs`;

const file = open('/path/resource.csv');
await client.upload(file, 'my-org','dataset-name');

```

## License

Giftless Client Javascript is free software distributed under the terms of the MIT license. See [LICENSE](LICENSE) for details.

Giftless Client Javascript is (c) 2020 Datopian / Viderum Inc.
