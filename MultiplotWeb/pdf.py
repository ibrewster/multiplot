import io

import flask
import plotly.graph_objects as go
import pymupdf

from . import app

def clean_layout(layout):
    layout['paper_bgcolor'] = 'rgb(24, 28, 30)'
        

@app.route('/generatePDF', methods=["POST"])
def generate_pdf():
    plots = flask.request.json
    
    # Adjust the bottom margin and height of the plot
    plots[-1]['layout']['height'] += plots[-1]['layout']['margin']['b']
    plots[-1]['layout']['margin']['b'] *= 2
    
    pdf_buffers = []
    
    total_height = 0
    for plotDict in plots:
        clean_layout(plotDict['layout'])
        
        plot = go.Figure(plotDict)
        
        img_bytes = plot.to_image(format='pdf')
        with open('/Users/israel/Downloads/test.pdf', 'wb') as f:
            f.write(img_bytes)
            
        pdf = pymupdf.open("pdf", img_bytes)
        total_height += pdf[0].rect.height
        pdf_buffers.append(pdf)
        
        
    width = pdf_buffers[0][0].rect.width
    
    output = pymupdf.open()
    output_page = output.new_page(width=width, height=total_height)
    
    bg_color = (0, 0, 0)
    rect = output_page.rect
    output_page.draw_rect(rect, color=None, fill=bg_color)
    
    y_offset = 0
    for plot in pdf_buffers:
        page = plot[0]
        page_height = page.rect.height
        
        target_rect = pymupdf.Rect(0, y_offset, width, y_offset + page_height)
        output_page.show_pdf_page(target_rect, plot, 0)
        y_offset += page_height
    
    output_buffer = io.BytesIO()
    output.save(output_buffer)
    output.close()
    output_buffer.seek(0)
    
    return flask.send_file(
        output_buffer,
        mimetype="application/pdf",
        as_attachment=True,
        download_name="plots.pdf"
    )