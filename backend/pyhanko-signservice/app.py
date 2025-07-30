from flask import Flask, request, send_file, jsonify
import tempfile
from pyhanko.sign import signers
from pyhanko.sign.fields import SigFieldSpec, enumerate_sig_fields
from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter
from pyhanko.pdf_utils.reader import PdfFileReader
import io

app = Flask(__name__)

@app.route('/sign-pdf', methods=['POST'])
def sign_pdf():
    try:
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

            # Estrategia 1: Intentar con configuración estándar
            try:
                with open(pdf_temp.name, 'rb') as inf:
                    w = IncrementalPdfFileWriter(inf)
                    
                    # Buscar campos de firma existentes
                    existing_fields = set()
                    filled_fields = set()
                    for name, value, ref in enumerate_sig_fields(w):
                        existing_fields.add(name)
                        if value is not None:
                            filled_fields.add(name)
                    
                    # Determinar nombre del campo
                    base_field_name = 'FirmaDigital'
                    field_name = base_field_name
                    idx = 1
                    while field_name in filled_fields:
                        idx += 1
                        field_name = f'{base_field_name}_{idx}'
                    
                    # Intentar firma estándar
                    pdf_signed = signers.sign_pdf(
                        w,
                        signature_meta=signers.PdfSignatureMetadata(field_name=field_name),
                        signer=signer
                    )
                    
                    # Si llega aquí, la firma fue exitosa
                    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as signed_temp:
                        signed_temp.write(pdf_signed.getbuffer())
                        signed_temp.flush()
                        signed_path = signed_temp.name
                    
                    return send_file(signed_path, as_attachment=True, download_name='signed.pdf', mimetype='application/pdf')
                    
            except Exception as e:
                error_msg = str(e).lower()
                app.logger.info(f"Primer intento falló: {error_msg}")
                
                # Estrategia 2: Si es error de referencias cruzadas, intentar sin especificar campo
                if "hybrid cross-reference" in error_msg or "xref" in error_msg:
                    try:
                        app.logger.info("Intentando firma sin especificar campo de firma")
                        with open(pdf_temp.name, 'rb') as inf:
                            w = IncrementalPdfFileWriter(inf)
                            pdf_signed = signers.sign_pdf(
                                w,
                                signature_meta=signers.PdfSignatureMetadata(),
                                signer=signer
                            )
                            
                            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as signed_temp:
                                signed_temp.write(pdf_signed.getbuffer())
                                signed_temp.flush()
                                signed_path = signed_temp.name
                            
                            return send_file(signed_path, as_attachment=True, download_name='signed.pdf', mimetype='application/pdf')
                            
                    except Exception as e2:
                        app.logger.info(f"Segundo intento falló: {str(e2)}")
                        
                        # Estrategia 3: Intentar con configuración mínima
                        try:
                            app.logger.info("Intentando con configuración mínima")
                            with open(pdf_temp.name, 'rb') as inf:
                                w = IncrementalPdfFileWriter(inf)
                                pdf_signed = signers.sign_pdf(
                                    w,
                                    signature_meta=signers.PdfSignatureMetadata(
                                        field_name=None,
                                        md_algorithm='sha256'
                                    ),
                                    signer=signer
                                )
                                
                                with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as signed_temp:
                                    signed_temp.write(pdf_signed.getbuffer())
                                    signed_temp.flush()
                                    signed_path = signed_temp.name
                                
                                return send_file(signed_path, as_attachment=True, download_name='signed.pdf', mimetype='application/pdf')
                                
                        except Exception as e3:
                            app.logger.error(f"Tercer intento falló: {str(e3)}")
                            raise e3
                else:
                    # Si no es error de referencias cruzadas, re-lanzar el error original
                    raise e

    except Exception as e:
        app.logger.error(f"Error al firmar PDF: {str(e)}")
        return jsonify({'error': f'Error al firmar el documento: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001) 