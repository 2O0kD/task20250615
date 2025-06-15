import { SQSEvent } from 'aws-lambda';
import { Board } from './types';
import { createBoard } from './storage';

export const handler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    try {
      const board: Board = JSON.parse(record.body);

      if (!board.boardId || !board.name || !board.createdBy) {
        console.warn('Invalid board data, skipping:', board);
        continue;
      }

      await createBoard(board);

      console.log('Board created:', board);
    } catch (error) {
      console.error('Error processing board creation message:', error);
    }
  }
};