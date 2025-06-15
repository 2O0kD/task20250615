import WebSocket from 'ws';
import axios from 'axios';
import { API_BASE, SQS_WAIT_TIME, WS_URL } from './config';
import { wait } from './util';

describe('Message WebSocket integration', () => {
  let ws: WebSocket;
  let boardId: string;

  beforeAll((done) => {
    ws = new WebSocket(WS_URL);
    ws.on('open', done);
  });

  afterAll(() => {
    ws.close();
  });

  it('should create a board and receive message over WebSocket', async () => {
    const createRes = await axios.post(`${API_BASE}/boards`, {
      name: 'WS Test Board',
      createdBy: 'ws-user',
    });

    expect(createRes.status).toBe(202);

    await wait(SQS_WAIT_TIME);

    const boardsRes = await axios.get(`${API_BASE}/boards`);
    const board = boardsRes.data.find((b: any) => b.name === 'WS Test Board');
    boardId = board.boardId;

    const messagePromise = new Promise<any>((resolve) => {
      ws.once('message', (data) => resolve(JSON.parse(data.toString())));
    });

    await axios.post(`${API_BASE}/boards/${boardId}/messages`, {
      content: 'Hello via WebSocket',
      authorId: 'ws-user',
    });

    const message = await messagePromise;

    expect(message).toHaveProperty('data');
    expect(message.data).toHaveProperty('content', 'Hello via WebSocket');
    expect(message.data).toHaveProperty('boardId', boardId);
  });
});