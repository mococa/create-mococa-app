import { safewrapper } from '../common';

export const handler = safewrapper(async (event) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'Hello from GET Lambda!',
      queryParams: event.queryStringParameters,
    }),
  };
});
