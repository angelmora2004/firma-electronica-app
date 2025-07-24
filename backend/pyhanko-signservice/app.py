from flask import Flask, request, send_file, jsonify
import tempfile
from pyhanko.sign import signers
from pyhanko.sign.fields import SigFieldSpec, enumerate_sig_fields
from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter

app = Flask(__name__)

@app.route('/sign-pdf', methods=['POST'])
def sign_pdf():
    pdf_file = request.files.get('pdf')
    p12_file = request.files.get('p12')
    p12_password = request.form.get('password', '')

    if not pdf_file or not p12_file:
        return jsonify({'error': 'Faltan archivos'}), 400

    with tempfile.NamedTemporaryFile(delete=False) as pdf_temp, \
         tempfile.NamedTemporaryFile(delete=False) as p12_temp:
        pdf_temp.write(pdf_file.read())
        pdf_temp.flush()
        p12_temp.write(p12_file.read())
        p12_temp.flush()

        signer = signers.SimpleSigner.load_pkcs12(
            p12_temp.name, passphrase=p12_password.encode('utf-8')
        )

        with open(pdf_temp.name, 'rb') as inf:
            w = IncrementalPdfFileWriter(inf)
            # Buscar campos de firma existentes y llenos
            existing_fields = set()
            filled_fields = set()
            for name, value, ref in enumerate_sig_fields(w):
                existing_fields.add(name)
                if value is not None:
                    filled_fields.add(name)
            # Determinar el nombre del campo de firma a usar
            base_field_name = 'FirmaDigital'
            field_name = base_field_name
            idx = 1
            while field_name in filled_fields:
                idx += 1
                field_name = f'{base_field_name}_{idx}'
            # Firmar usando el campo disponible o uno nuevo
            pdf_signed = signers.sign_pdf(
                w,
                signature_meta=signers.PdfSignatureMetadata(field_name=field_name),
                signer=signer
            )

        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as signed_temp:
            signed_temp.write(pdf_signed.getbuffer())
            signed_temp.flush()
            signed_path = signed_temp.name

        return send_file(signed_path, as_attachment=True, download_name='signed.pdf', mimetype='application/pdf')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)