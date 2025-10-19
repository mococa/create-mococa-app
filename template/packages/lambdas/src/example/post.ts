import { safewrapper } from '../common';

export const handler = safewrapper(async (event) => {
  const body = JSON.parse(event.body || '{}');

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'Hello from POST Lambda!',
      receivedData: body,
    }),
  };
});
