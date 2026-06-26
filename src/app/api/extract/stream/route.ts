export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fileUrl = searchParams.get('fileUrl');

  if (!fileUrl) {
    return new Response(JSON.stringify({ error: '缺少 fileUrl 参数' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const backendUrl = `http://localhost:8000/api/extract/stream?fileUrl=${encodeURIComponent(fileUrl)}`;

  try {
    const response = await fetch(backendUrl);

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