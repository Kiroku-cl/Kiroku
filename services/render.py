import os


def replace_markers_with_images(script, photos):
    """
    Reemplaza [[FOTO:<id>]] con sintaxis Markdown de imagen.
    Usa imagen estilizada si existe, si no la original.
    """
    for photo in photos:
        marker = f"[[FOTO:{photo['photo_id']}]]"
        img_path = photo.get("stylized_path") or photo.get("original_path")
        if img_path:
            img_name = os.path.basename(img_path)
            img_md = f"\n\n![Foto]({img_name})\n\n"
            script = script.replace(marker, img_md)

    return script
