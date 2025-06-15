import axios from 'axios';
import { API_BASE, SQS_WAIT_TIME } from './config';
import { wait } from './util';

describe('Register user and retrieve by email', () => {
  const name = 'Integration Test User';
  const email = `user.${Date.now()}@test.com`;

  it('registers a user and allows retrieval by email', async () => {
    const registerRes = await axios.post(`${API_BASE}/register`, { name, email });

    expect(registerRes.status).toBe(202);

    await wait(SQS_WAIT_TIME);

    const lookupRes = await axios.get(`${API_BASE}/user`, {
      params: { email },
    });

    expect(lookupRes.status).toBe(200);
    expect(lookupRes.data).toHaveProperty('name', name);
    expect(lookupRes.data).toHaveProperty('email', email);
  });
});