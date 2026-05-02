import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { getContracts } from '../../src/commands/utils/getContracts.js';
import { mergeContracts } from '../../src/commands/utils/mergeContracts.js';

function makeTempDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'apistry-contracts-'));
}

function writeYaml(filePath, content) {
    fs.writeFileSync(filePath, content, 'utf8');
}

describe('contracts utils', () => {
    const tempDirs = new Set();

    afterEach(() => {
        for (const dir of tempDirs) {
            fs.rmSync(dir, { recursive: true, force: true });
        }
        tempDirs.clear();
    });

    it('getContracts returns a cleaned filename->spec map', () => {
        const dir = makeTempDir();
        tempDirs.add(dir);

        const filePath = path.join(dir, 'one.yaml');
        writeYaml(
            filePath,
            `openapi: 3.0.0
info:
  title: One
  version: 1.0.0
paths:
  /hello:
    get:
      parameters:
        - in: query
          name: q
          schema:
            type: string
          example: hi
      responses:
        '200':
          description: ok
components:
  schemas:
    Foo:
      type: object
      properties:
        bar:
          type: string
          x-etl-transforms:
            - upcase
`
        );

        const apiSpecs = getContracts(filePath);
        expect(apiSpecs instanceof Map).toBe(true);
        expect(apiSpecs.size).toBe(1);

        const spec = apiSpecs.get('one.yaml');
        expect(spec.paths['/hello'].get.parameters[0].example).toBeUndefined();
        expect(spec.components.schemas.Foo.properties.bar['x-etl-transforms']).toBeUndefined();
    });

    it('mergeContracts merges a cleaned map and writes openapi.yml for multiple specs', () => {
        const dir = makeTempDir();
        tempDirs.add(dir);

        writeYaml(
            path.join(dir, 'a.yaml'),
            `openapi: 3.0.0
info:
  title: A
  version: 1.0.0
paths:
  /a:
    get:
      responses:
        '200':
          description: ok
`
        );

        writeYaml(
            path.join(dir, 'b.yaml'),
            `openapi: 3.0.0
info:
  title: B
  version: 1.0.0
paths:
  /b:
    get:
      responses:
        '200':
          description: ok
`
        );

        const apiSpecs = getContracts(dir);
        const apiSpec = mergeContracts(
            apiSpecs,
            dir,
            'Merged API',
            'Merged Desc',
            'debug'
        );

        expect(apiSpec.info.title).toBe('Merged API');
        expect(apiSpec.info.description).toBe('Merged Desc');
        expect(apiSpec.paths['/a']).toBeDefined();
        expect(apiSpec.paths['/b']).toBeDefined();
        expect(apiSpec.servers).toEqual([{ url: '/' }]);

        const mergedPath = path.join(dir, 'openapi.yml');
        expect(fs.existsSync(mergedPath)).toBe(true);
    });
});
