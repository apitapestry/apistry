import path from 'path';
import { useTestServer } from '../server.js';

const CONTRACT_PATH = path.resolve(process.cwd(), 'tests/cars.v1.yaml');
export const harness = useTestServer(CONTRACT_PATH);
