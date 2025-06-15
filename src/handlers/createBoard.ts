import { APIGatewayProxyEvent } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { sendUserToSqs } from './storage';
import { Board, BoardSchema } from './types';
import z from 'zod';
import { HANDLER_RESULT_500, handlerResult } from './util';

export const CreateBoardInputSchema = BoardSchema.pick({
  name: true,
  createdBy: true,
});

export type CreateBoardInput = z.infer<typeof CreateBoardInputSchema>;

export const handler = async (event: APIGatewayProxyEvent) => {
  try {
    const body: CreateBoardInput = JSON.parse(event.body || '{}');

    if (!CreateBoardInputSchema.safeParse(body).success) {
      return handlerResult(400, { error: 'Missing required fields' });
    }

    const board: Board = {
      boardId: uuidv4(),
      name: body.name,
      createdBy: body.createdBy,
    };

    await sendUserToSqs(board);

    return handlerResult(202, { message: 'Board creation request accepted.' });
  } catch (error) {
    console.error('createBoard error:', error);
    return HANDLER_RESULT_500;
  }
};