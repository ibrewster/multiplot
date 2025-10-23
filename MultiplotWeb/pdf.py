import io

import flask
import plotly.graph_objects as go
import pymupdf

from . import app

def clean_layout(layout, mode):
    if mode == 'dark':
        layout['paper_bgcolor'] = 'rgb(24, 28, 30)'
        

@app.route('/generatePDF', methods=["POST"])
def generate_pdf():
    data = flask.request.json
    plots = data['plots']
    mode = data['mode']
    
    # Adjust the bottom margin and height of the plot
    plots[-1]['layout']['height'] += plots[-1]['layout']['margin']['b']
    plots[-1]['layout']['margin']['b'] *= 2
    
    pdf_buffers = []
    
    total_height = 0
    for plotDict in plots:
        clean_layout(plotDict['layout'], mode)
        
        plot = go.Figure(plotDict)
        
        img_bytes = plot.to_image(format='pdf')
        with open('/Users/israel/Downloads/test.pdf', 'wb') as f:
            f.write(img_bytes)
            
        pdf = pymupdf.open("pdf", img_bytes)
        total_height += pdf[0].rect.height
        pdf_buffers.append(pdf)
        
        
    width = pdf_buffers[0][0].rect.width
    left = 0
    pageWidth = width
    
    if data.get('widthMode', 'display') == "letter":
        pageWidth = 612
        left = (pageWidth - width) / 2
        
    output = pymupdf.open()
    output_page = output.new_page(width=pageWidth, height=total_height)
    
    if mode == 'dark':
        bg_color = (0, 0, 0)
        rect = output_page.rect
        output_page.draw_rect(rect, color=None, fill=bg_color)
    
    y_offset = 0
    for plot in pdf_buffers:
        page = plot[0]
        page_height = page.rect.height
        
        target_rect = pymupdf.Rect(left, y_offset, left + width, y_offset + page_height)
        output_page.show_pdf_page(target_rect, plot, 0)
        y_offset += page_height
    
    output_buffer = io.BytesIO()
    output.save(output_buffer, garbage=4, deflate=True)
    output.close()
    output_buffer.seek(0)
    
    return flask.send_file(
        output_buffer,
        mimetype="application/pdf",
        as_attachment=True,
        download_name="plots.pdf"
    )