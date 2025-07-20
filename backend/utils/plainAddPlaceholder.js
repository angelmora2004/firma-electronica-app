// plainAddPlaceholder.js
// Basado en https://github.com/vbuch/node-signpdf/blob/main/src/helpers/plainAddPlaceholder.js
const DEFAULT_SIGNATURE_LENGTH = 8192;

function plainAddPlaceholder({
    pdfBuffer,
    reason = '',
    signatureLength = DEFAULT_SIGNATURE_LENGTH,
}) {
    if (!Buffer.isBuffer(pdfBuffer)) {
        throw new Error('pdfBuffer must be a Buffer');
    }
    // Busca el final del PDF
    const pdfString = pdfBuffer.toString('latin1');
    const byteRangePlaceholder = '**********';
    const signaturePlaceholder = Buffer.from(Array(signatureLength).fill(0).map(() => 0x30));
    const placeholder =
        '\n/Type /Sig' +
        '\n/Filter /Adobe.PPKLite' +
        '\n/SubFilter /adbe.pkcs7.detached' +
        (reason ? `\n/Reason (${reason})` : '') +
        '\n/ByteRange [0 ' + byteRangePlaceholder + ' ' + byteRangePlaceholder + ' ' + byteRangePlaceholder + ']' +
        '\n/Contents <' + signaturePlaceholder.toString('hex').toUpperCase() + '>';

    // Inserta el placeholder antes de %%EOF
    const eofIndex = pdfString.lastIndexOf('%%EOF');
    if (eofIndex === -1) {
        throw new Error('No EOF found in PDF');
    }
    const before = pdfBuffer.slice(0, eofIndex);
    const after = pdfBuffer.slice(eofIndex);
    const placeholderBuffer = Buffer.from(placeholder, 'latin1');
    return Buffer.concat([before, placeholderBuffer, after]);
}

module.exports = plainAddPlaceholder; 