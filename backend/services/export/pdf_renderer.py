from weasyprint import HTML

from services.export.html_renderer import convert_script_to_html


def render_pdf_bytes(content, project_id, project_dir):
    html = convert_script_to_html(content, project_id, embed_images=False)
    pdf_bytes = HTML(string=html, base_url=project_dir).write_pdf()
    return pdf_bytes
