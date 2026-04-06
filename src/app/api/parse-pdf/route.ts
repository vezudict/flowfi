import pdfParse from "pdf-parse";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    console.log("🔥 API HIT");

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file" }), {
        status: 400,
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const data = await pdfParse(buffer);

    console.log("✅ Extracted length:", data.text.length);

    return Response.json({ text: data.text });
  } catch (err) {
    console.error("💥 ERROR:", err);
    return new Response(JSON.stringify({ error: "Parsing failed" }), {
      status: 500,
    });
  }
}
