import axios from 'axios';
import { API_BASE, SQS_WAIT_TIME } from './config';
import { wait } from './util';

const name = 'Integration Test Board';

describe('Board integration tests', () => {
  test('should create a board and list it', async () => {
    const createRes = await axios.post(`${API_BASE}/boards`, {
      name,
      createdBy: 'test-user',
    });

    expect(createRes.status).toBe(202);

    await wait(SQS_WAIT_TIME);

    const listRes = await axios.get(`${API_BASE}/boards`);
    expect(listRes.status).toBe(200);
    const board = listRes.data.find((b: any) => b.name === name);
    expect(board).toBeDefined();
  });
});