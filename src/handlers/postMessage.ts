import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { Message } from './types';
import { sendMessageToSns } from './storage';
import { z } from 'zod';
import { HANDLER_RESULT_500, handlerResult } from './util';

export const PostMessageInputSchema = z.object({
  content: z.string(),
  authorId: z.string(),
});

export type PostMessageInput = z.infer<typeof PostMessageInputSchema>;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const boardId = event.pathParameters?.boardId;
    if (!boardId) {
      return handlerResult(400, { error: 'Missing path parameter: boardId.' });
    }

    const body: PostMessageInput = JSON.parse(event.body || '{}');
    if (!PostMessageInputSchema.safeParse(body).success) {
      return handlerResult(400, { error: 'Missing required fields: content and authorId.' });
    }

    const message: Message = {
      messageId: uuidv4(),
      boardId,
      userId: body.authorId,
      content: body.content,
    };

    await sendMessageToSns(message);

    return handlerResult(202, { message: 'Message post request accepted.' });
  } catch (error) {
    console.error('postMessage error:', error);
    return HANDLER_RESULT_500;
  }
};