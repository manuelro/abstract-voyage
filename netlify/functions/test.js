exports.handler = async function test() {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Hello world!!!' }),
  };
};
