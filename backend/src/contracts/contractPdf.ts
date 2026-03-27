import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function contractTextToPdfBytes(params: {
  title?: string;
  text: string;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageSize: [number, number] = [595.28, 841.89]; // A4 portrait (pt)
  const margin = 48;
  const fontSize = 11;
  const lineHeight = 14;
  const titleSize = 14;

  const lines = wrapText({
    text: params.text ?? "",
    maxWidth: pageSize[0] - margin * 2,
    font,
    fontSize,
  });

  let page = doc.addPage(pageSize);
  let y = pageSize[1] - margin;

  const title = (params.title ?? "").trim();
  if (title) {
    page.drawText(title, {
      x: margin,
      y: y - titleSize,
      size: titleSize,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    y -= titleSize + 12;
  }

  for (const line of lines) {
    if (y - lineHeight < margin) {
      page = doc.addPage(pageSize);
      y = pageSize[1] - margin;
    }
    page.drawText(line, {
      x: margin,
      y: y - fontSize,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });
    y -= lineHeight;
  }

  return await doc.save();
}

function wrapText(params: {
  text: string;
  maxWidth: number;
  font: any;
  fontSize: number;
}): string[] {
  const raw = (params.text ?? "").replace(/\r\n/g, "\n");
  const paragraphs = raw.split("\n");
  const out: string[] = [];

  for (const p of paragraphs) {
    const s = p.replace(/\s+/g, " ").trim();
    if (!s) {
      out.push("");
      continue;
    }

    const words = s.split(" ");
    let line = "";

    for (const w of words) {
      const candidate = line ? `${line} ${w}` : w;
      const width = params.font.widthOfTextAtSize(candidate, params.fontSize);
      if (width <= params.maxWidth) {
        line = candidate;
      } else {
        if (line) out.push(line);
        // se a palavra sozinha for maior que a linha, quebra "na raça"
        line = breakLongWord(w, params);
        // breakLongWord pode retornar múltiplas linhas em `out` via \n
        if (line.includes("\n")) {
          const parts = line.split("\n");
          out.push(...parts.slice(0, -1));
          line = parts[parts.length - 1] ?? "";
        }
      }
    }
    if (line) out.push(line);
  }

  return out;
}

function breakLongWord(
  word: string,
  params: { maxWidth: number; font: any; fontSize: number }
): string {
  let cur = "";
  const lines: string[] = [];
  for (const ch of word) {
    const cand = cur + ch;
    const w = params.font.widthOfTextAtSize(cand, params.fontSize);
    if (w <= params.maxWidth) {
      cur = cand;
    } else {
      if (cur) lines.push(cur);
      cur = ch;
    }
  }
  if (cur) lines.push(cur);
  return lines.join("\n");
}

