export async function POST(request: Request) {
  const body = await request.json();

  const userMessage = body.message;

  return Response.json({
    reply: `我收到你的消息了：${userMessage}`,
  });
}