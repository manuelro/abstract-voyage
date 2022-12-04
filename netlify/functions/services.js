import fetch from 'node-fetch';

exports.handler = async function services(event) {
  if (event.body === null) {
    return {
      statusCode: 400,
      body: JSON.stringify('Payload required'),
    };
  }

  const requestBody = JSON.parse(event.body);

  try {
    await fetch(`${process.env.URL}/.netlify/functions/emails/services`, {
      headers: {
        'netlify-emails-secret': process.env.NETLIFY_EMAILS_SECRET,
      },
      method: 'POST',
      body: JSON.stringify({
        from: requestBody.from,
        to: requestBody.to,
        subject: requestBody.subject,
        parameters: {
          name: requestBody.name,
          email: requestBody.to,
        },
      }),
    });

    return {
      statusCode: 200,
      body: JSON.stringify(event.body),
    };
  } catch (e) {
    return {
      statusCode: 200,
      body: JSON.stringify(e),
    };
  }
};
