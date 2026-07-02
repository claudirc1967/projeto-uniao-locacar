export function onlyDigits(raw: string) {
  return raw.replace(/\D/g, "");
}

function formatCpfDigits(digits: string) {
  const d = digits.slice(0, 11);
  const p1 = d.slice(0, 3);
  const p2 = d.slice(3, 6);
  const p3 = d.slice(6, 9);
  const p4 = d.slice(9, 11);
  if (d.length <= 3) return p1;
  if (d.length <= 6) return `${p1}.${p2}`;
  if (d.length <= 9) return `${p1}.${p2}.${p3}`;
  return `${p1}.${p2}.${p3}-${p4}`;
}

function formatCnpjDigits(digits: string) {
  const d = digits.slice(0, 14);
  const p1 = d.slice(0, 2);
  const p2 = d.slice(2, 5);
  const p3 = d.slice(5, 8);
  const p4 = d.slice(8, 12);
  const p5 = d.slice(12, 14);
  if (d.length <= 2) return p1;
  if (d.length <= 5) return `${p1}.${p2}`;
  if (d.length <= 8) return `${p1}.${p2}.${p3}`;
  if (d.length <= 12) return `${p1}.${p2}.${p3}/${d.slice(8, 12)}`;
  return `${p1}.${p2}.${p3}/${p4}-${p5}`;
}

/** Máscara genérica CPF/CNPJ (detecta por quantidade de dígitos). */
export function maskCpfCnpj(raw: string) {
  const d = onlyDigits(raw);
  if (!d) return "";
  return d.length <= 11 ? formatCpfDigits(d) : formatCnpjDigits(d);
}

export function maskCpf(raw: string) {
  return formatCpfDigits(onlyDigits(raw));
}
