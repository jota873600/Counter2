export const dynamic = "force-dynamic";

/** Health check para a hospedagem (não depende de banco de dados). */
export async function GET() {
  return Response.json({ ok: true });
}
