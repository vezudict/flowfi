import pdfParse from "pdf-parse";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file uploaded. Choose a PDF and try again." }),
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const data = await pdfParse(buffer);

    return Response.json({ text: data.text });
  } catch {
    return new Response(
      JSON.stringify({
        error:
          "We couldn't read that PDF. Try another file or export the statement again from your bank.",
      }),
      { status: 500 },
    );
  }
}
