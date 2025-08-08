
from flask import Flask, request, jsonify
from surya.ocr import run_ocr
from surya.model.detection import segformer
from surya.model.recognition import vit
from surya.postprocessing import run_postprocessing
from PIL import Image
import io
import base64

app = Flask(__name__)

# Load models
det_model = segformer.load_model()
det_processor = segformer.load_processor()
rec_model = vit.load_model()
rec_processor = vit.load_processor()

@app.route('/api/ocr', methods=['POST'])
def ocr():
    if 'image' not in request.json:
        return jsonify({'error': 'No image provided'}), 400

    image_data = request.json['image']
    # Decode the base64 image
    try:
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
    except Exception as e:
        return jsonify({'error': f'Invalid image data: {e}'}), 400

    # Perform OCR
    langs = ["en"] # Add languages as needed
    predictions = run_ocr([image], [langs], det_model, det_processor, rec_model, rec_processor)
    
    # Postprocess the results
    post_processed_predictions = run_postprocessing(image, predictions[0])

    return jsonify(post_processed_predictions)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
