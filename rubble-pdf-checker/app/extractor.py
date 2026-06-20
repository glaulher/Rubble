import glob
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from PIL import Image


def run_pdftotext(pdf_path: str) -> str:
    result = subprocess.run(
        ["pdftotext", "-layout", pdf_path, "-"],
        capture_output=True, text=True, timeout=60
    )
    return result.stdout


def _parse_size(raw: str) -> int:
    raw = raw.strip().upper()
    try:
        if raw.endswith("KB"):
            return int(float(raw[:-2]) * 1024)
        if raw.endswith("K"):
            return int(float(raw[:-1]) * 1024)
        if raw.endswith("MB"):
            return int(float(raw[:-2]) * 1024 * 1024)
        if raw.endswith("M"):
            return int(float(raw[:-1]) * 1024 * 1024)
        if raw.endswith("B"):
            return int(raw[:-1])
        return int(raw)
    except (ValueError, TypeError):
        return 0


def run_pdfimages(pdf_path: str, output_dir: str) -> list[dict]:
    result = subprocess.run(
        ["pdfimages", "-list", pdf_path],
        capture_output=True, text=True, timeout=30
    )
    subprocess.run(
        ["pdfimages", "-all", pdf_path, f"{output_dir}/img"],
        capture_output=True, timeout=30
    )

    images = []
    lines = result.stdout.strip().split("\n")
    for line in lines[2:]:
        parts = line.split()
        if len(parts) < 6:
            continue
        try:
            page = int(parts[0])
            num = int(parts[1])
            width = int(parts[3])
            height = int(parts[4])
        except (ValueError, IndexError):
            continue

        image_type = parts[2] if len(parts) > 2 else ""
        if image_type == "smask":
            continue

        size_raw = parts[-2] if len(parts) > 3 else "0"
        size_bytes = _parse_size(size_raw)
        images.append({
            "page": page,
            "num": num,
            "width": width,
            "height": height,
            "size_bytes": size_bytes,
        })

    return images


def extract_fields(text: str) -> dict:
    fields = {}

    nome = re.search(r"Nome:\s*(.+)", text)
    if nome:
        fields["nome_site"] = nome.group(1).strip()

    cidade = re.search(r"Cidade:\s*(.+)", text)
    if cidade:
        fields["cidade"] = cidade.group(1).strip()

    uf = re.search(r"UF:\s*(.+)", text)
    if uf:
        fields["uf"] = uf.group(1).strip()

    endereco = re.search(r"Endereço:\s*(.+)", text)
    if endereco:
        fields["endereco"] = endereco.group(1).strip()

    equipamento = re.search(r"CLIMA - (.+)", text)
    if equipamento:
        fields["equipamento"] = equipamento.group(1).strip()

    localizacao = re.search(r"Localização:\s*(.+)", text)
    if localizacao:
        fields["localizacao"] = localizacao.group(1).strip()

    fabricante = re.search(r"Fabricante:\s*(.+)", text)
    if fabricante:
        fields["fabricante"] = fabricante.group(1).strip()

    modelo = re.search(r"Modelo:\s*(.+)", text)
    if modelo:
        fields["modelo"] = modelo.group(1).strip()

    tipo = re.search(r"Tipo:\s*(.+)", text)
    if tipo:
        fields["tipo"] = tipo.group(1).strip()

    potencia = re.search(r"Potência\s*\(KVA\):\s*(.+)", text)
    if potencia:
        fields["potencia"] = potencia.group(1).strip()
    else:
        potencia = re.search(r"Potência\s*\(.*?\):\s*(.+)", text)
        if potencia:
            fields["potencia"] = potencia.group(1).strip()

    serie = re.search(r"Nº Série:\s*(.+)", text)
    if serie:
        fields["n_serie"] = serie.group(1).strip()

    propriedade = re.search(r"Propriedade:\s*(.+)", text)
    if propriedade:
        fields["propriedade"] = propriedade.group(1).strip()

    planta = re.search(r"Planta:\s*(.+)", text)
    if planta:
        fields["planta"] = planta.group(1).strip()

    status_rel = re.search(r"Status:\s*(.+)", text)
    if status_rel:
        fields["status_relatorio"] = status_rel.group(1).strip()

    ticket = re.search(r"Ticket\s*\n\s*(\d+)", text)
    if ticket:
        fields["ticket"] = ticket.group(1).strip()

    situacao = re.search(r"Situação\s*\n\s*(.+)", text)
    if situacao:
        fields["situacao"] = situacao.group(1).strip()

    sit_final = re.search(r"1-\s*Situação Final:\s*(.+)", text)
    if sit_final:
        fields["situacao_final"] = sit_final.group(1).strip()

    realizada_por = re.search(r"3\s*-\s*Realizada por:\s*(.+)", text)
    if realizada_por:
        fields["realizada_por"] = realizada_por.group(1).strip()

    return fields


def parse_checklists(text: str) -> list[dict]:
    items = []
    current_section = "Geral"
    lines = text.split("\n")
    i = 0

    section_keywords = {
        "INSPEÇÃO": "Inspeção",
        "LIMPEZA": "Limpeza",
        "HIDRÁULICA": "Hidráulica",
        "ALINHAMENTO": "Alinhamento",
        "FIXAÇÃO": "Fixação",
    }

    while i < len(lines):
        line = lines[i].strip()

        upper_line = line.upper()
        for kw, name in section_keywords.items():
            if kw in upper_line and len(line) < 30:
                current_section = name
                break

        item_match = re.match(r"(\d+)\s*-\s*(.+)", line)
        if item_match:
            item_num = item_match.group(1)
            raw_desc = item_match.group(2)

            initial = ""
            final = ""

            # Try to detect status on same line (pdftotext -layout puts columns on same line)
            same_line = re.match(
                r"(.+?)\s{2,}(OK|NOK|NA)(?:\s{2,}(OK|NOK|NA))?\s*$", raw_desc, re.IGNORECASE
            )
            if same_line:
                item_desc = same_line.group(1).strip()
                initial = same_line.group(2).upper()
                final = same_line.group(3).upper() if same_line.group(3) else initial
            else:
                item_desc = raw_desc.strip()
                if i + 1 < len(lines):
                    next_line = lines[i + 1].strip()
                    if next_line in ("OK", "NOK", "NA"):
                        initial = next_line
                        if i + 2 < len(lines):
                            n2 = lines[i + 2].strip()
                            if n2 in ("OK", "NOK", "NA"):
                                final = n2
                            elif i + 3 < len(lines) and lines[i + 3].strip() in ("OK", "NOK", "NA"):
                                final = lines[i + 3].strip()
                            else:
                                final = n2
                    elif i + 2 < len(lines) and lines[i + 2].strip() in ("OK", "NOK", "NA"):
                        initial = next_line
                        final = lines[i + 2].strip()
                    elif next_line in ("OK", "NOK", "NA"):
                        initial = next_line
                        final = next_line
                    else:
                        initial = next_line

            items.append({
                "numero": item_num,
                "descricao": item_desc,
                "secao": current_section,
                "inicial": initial,
                "final": final
            })

        i += 1

    return items


def parse_measurements(text: str) -> dict:
    measurements = {}

    tensao_r = re.search(r"Tensão.*?Fase\s*R.*?\n\s*([\d.]+)", text, re.DOTALL)
    if tensao_r:
        measurements["tensao_r"] = tensao_r.group(1).strip()

    tensao_s = re.search(r"Tensão.*?Fase\s*S.*?\n\s*([\d.]+)", text, re.DOTALL)
    if tensao_s:
        measurements["tensao_s"] = tensao_s.group(1).strip()

    tensao_t = re.search(r"Tensão.*?Fase\s*T.*?\n\s*([\d.]+)", text, re.DOTALL)
    if tensao_t:
        measurements["tensao_t"] = tensao_t.group(1).strip()

    corrente_r = re.search(r"Corrente.*?Fase\s*R.*?\n\s*([\d.]+)", text, re.DOTALL)
    if corrente_r:
        measurements["corrente_r"] = corrente_r.group(1).strip()

    corrente_s = re.search(r"Corrente.*?Fase\s*S.*?\n\s*([\d.]+)", text, re.DOTALL)
    if corrente_s:
        measurements["corrente_s"] = corrente_s.group(1).strip()

    corrente_t = re.search(r"Corrente.*?Fase\s*T.*?\n\s*([\d.]+)", text, re.DOTALL)
    if corrente_t:
        measurements["corrente_t"] = corrente_t.group(1).strip()

    pressao = re.search(r"Pressão\s*[:\s]+([\d.,]+)", text, re.IGNORECASE)
    if pressao:
        measurements["pressao"] = pressao.group(1).strip().replace(",", ".")

    return measurements


def analyze_image(image_path: str) -> dict:
    try:
        img = Image.open(image_path)
        img_gray = img.convert("L")
        pixels = list(img_gray.getdata())
        avg_brightness = sum(pixels) / len(pixels) if pixels else 128
        hist = img_gray.histogram()

        dark_pct = sum(hist[:25]) / len(pixels) * 100
        light_pct = sum(hist[-25:]) / len(pixels) * 100

        return {
            "brightness": round(avg_brightness, 1),
            "dark_ratio": round(dark_pct, 1),
            "light_ratio": round(light_pct, 1),
            "too_dark": dark_pct > 50,
            "too_light": light_pct > 50,
            "width": img.width,
            "height": img.height
        }
    except Exception as e:
        return {
            "error": str(e),
            "too_dark": False,
            "too_light": False
        }


def extract_photo_labels(text: str) -> list[str]:
    labels = []
    in_fotos = False
    lines = text.split("\n")
    for line in lines:
        stripped = line.strip()
        if "Fotos do Relatório" in stripped or "FOTOS DO RELATÓRIO" in stripped.upper():
            in_fotos = True
            continue
        if in_fotos:
            if "Página" in stripped or "Infratel" in stripped:
                continue
            if stripped and len(stripped) > 3:
                parts = re.split(r"\s{4,}", stripped)
                for part in parts:
                    part = part.strip()
                    if part:
                        labels.append(part)

    return labels


def extract(pdf_path: str) -> tuple[dict, str]:
    text = run_pdftotext(pdf_path)
    if not text.strip():
        raise ValueError("Falha ao extrair texto do PDF. Verifique se o arquivo é válido.")

    tmpdir = tempfile.mkdtemp(prefix="pdf-extract-")
    try:
        images = run_pdfimages(pdf_path, tmpdir)

        analyzed_images = []
        for img_idx, img in enumerate(images):
            matches = glob.glob(os.path.join(tmpdir, f"img-{img['num']:03d}.*"))
            if not matches:
                matches = glob.glob(os.path.join(tmpdir, f"img-{img['num']:04d}.*"))
            actual_path = Path(matches[0]) if matches else Path()

            analysis = {}
            if actual_path.exists():
                analysis = analyze_image(str(actual_path))

            analyzed_images.append({
                "page": img["page"],
                "num": img_idx,
                "orig_num": img["num"],
                "width": img["width"],
                "height": img["height"],
                "size_bytes": img["size_bytes"],
                "path": str(actual_path) if actual_path.exists() else "",
                "analysis": analysis,
            })

        image_quality = "ok"
        for img in analyzed_images:
            if img.get("analysis", {}).get("too_dark") or img.get("analysis", {}).get("too_light"):
                image_quality = "problema"
            if img.get("size_bytes", 0) < 10240:
                image_quality = "problema"

        fields = extract_fields(text)
        checklists = parse_checklists(text)
        measurements = parse_measurements(text)
        photo_labels = extract_photo_labels(text)

        nok_items = [i for i in checklists if i["final"] == "NOK"]

        empty_fields = [k for k, v in fields.items() if not v or v in ("NA", "0", "")]

        missing_measurements = []
        for key in ["tensao_r", "tensao_s", "tensao_t", "corrente_r", "corrente_s", "corrente_t", "pressao"]:
            if key not in measurements or not measurements[key]:
                missing_measurements.append(key)

        result = {
            "success": True,
            "fields": fields,
            "checklist": checklists,
            "nok_items": nok_items,
            "measurements": measurements,
            "missing_measurements": missing_measurements,
            "images": analyzed_images,
            "image_count": len(analyzed_images),
            "image_quality": image_quality,
            "empty_fields": empty_fields,
            "photo_labels": photo_labels,
            "has_images": len(analyzed_images) > 0,
        }

        return result, tmpdir

    except Exception:
        shutil.rmtree(tmpdir, ignore_errors=True)
        raise
