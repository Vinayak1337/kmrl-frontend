/** Log in through the same endpoint as the UI; Node fetch has no browser cookie jar. */
export async function testAuthCookie(apiUrl: string): Promise<string> {
  if (process.env.TEST_SESSION) return `kmrl_session=${process.env.TEST_SESSION}`;
  const response = await fetch(`${apiUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.TEST_EMAIL || 'admin@example.com', password: process.env.TEST_PASSWORD || 'admin123' }),
  });
  const cookie = response.headers.get('set-cookie')?.split(';')[0];
  if (!response.ok || !cookie) throw new Error('Test login failed. Set TEST_EMAIL and TEST_PASSWORD to a test administrator account.');
  return cookie;
}
