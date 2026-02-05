from services import project_store
from services.export.script_parser import parse_script, render_nodes_to_html


def convert_script_to_html(content, project_id, embed_images=True):
    project_dir = project_store.get_project_dir(project_id)
    nodes = parse_script(content)
    return render_nodes_to_html(nodes, project_dir, embed_images=embed_images)
