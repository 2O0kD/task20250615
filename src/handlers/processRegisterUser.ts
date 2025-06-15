import { SNSEvent } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { User } from './types';
import { saveUser } from './storage';


type RegisterUserEvent = Omit<User, 'userId'>;

export const handler = async (event: SNSEvent) => {

  for (const record of event.Records) {
    try {
      const message: RegisterUserEvent = JSON.parse(record.Sns.Message);

      if (!message.name || !message.email) {
        console.warn('Invalid user registration event, skipping:', message);
        continue;
      }

      const user: User = {
        userId: uuidv4(),
        name: message.name,
        email: message.email,
      };

      await saveUser(user);

      console.log('User registered:', user);
    } catch (error) {
      console.error('Error processing user registration event:', error);
    }
  }
};