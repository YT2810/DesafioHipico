const sampleText = `
1ERA CARRERA
DISTANCIA: 1.200 METROS
HORA: 1:00 P.M.
CONDICIONES: 3 AÑOS Y MAYOR. GANADORAS DE UNA. 54 KG.
1 L.BZ.P.CC.V.M.LA. 54-2 SOL VIVA LA PAZ(USA) JUAN CARLOS RODRIGUEZ GABRIEL MARCANO 1
2 L.OT.LA. 53.5 ALL ABOUT YOU (USA) FRANCISCO COELLO ROBERTO GOMEZ 2
3 L.V.BB.M.LA. 53 BULMA OMAR GOMEZ JORGE PEREZ 3
`;

async function main() {
  const { processDocumentWithGemini } = await import('../src/services/ai/pdfGeminiParser');
  try {
    const result = await processDocumentWithGemini(sampleText);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
