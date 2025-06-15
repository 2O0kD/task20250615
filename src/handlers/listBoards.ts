import { APIGatewayProxyResult } from 'aws-lambda';
import { getBoards } from './storage';
import { HANDLER_RESULT_500, handlerResult } from './util';

export const handler = async (): Promise<APIGatewayProxyResult> => {
  try {
    const boards = await getBoards();
    return handlerResult(200, boards);
  } catch (error) {
    console.error('listBoards error:', error);
    return HANDLER_RESULT_500;
  }
};