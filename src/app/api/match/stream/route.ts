export async function POST(request: Request) {
  const backendUrl = 'http://localhost:8000/api/match/stream';

  try {
    const body = await request.json();
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return new Response(response.body, {
        status: response.status,
        headers: response.headers,
      });
    }

    const stream = response.body!.pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          controller.enqueue(chunk);
        },
      })
    );

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: '代理请求失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}