import { SNSEvent } from 'aws-lambda';
import { MessageWithWebSocketUrl } from './types';
import { saveMessage, sendMessage } from './storage';

export const handler = async (event: SNSEvent) => {
  for (const record of event.Records) {
    try {
      const message: MessageWithWebSocketUrl = JSON.parse(record.Sns.Message);

      await saveMessage(message);
      await sendMessage(message);

      console.log('Message processed and broadcasted:', message);
    } catch (error) {
      console.error('Error processing posted message:', error);
    }
  }
};