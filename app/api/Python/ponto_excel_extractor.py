#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
ponto_excel_extractor.py
Extrai registros diários e colaboradores da planilha consolidada do Tempo Fechado.
Usa openpyxl no modo read_only para consumo mínimo de memória.
"""

import sys
import os
import re
import json
import argparse
import unicodedata
from datetime import datetime, date, time
from pathlib import Path

try:
    import openpyxl
except ImportError:
    openpyxl = None


def normalize_col(name: str) -> str:
    if not name:
        return ""
    h = unicodedata.normalize("NFD", str(name)).encode("ascii", "ignore").decode("utf-8").lower().strip()
    h_clean = re.sub(r"[^a-z0-9]", "", h)
    if h_clean in ["matricula", "chapa"]:
        return "matricula"
    if h_clean in ["nome", "colaborador", "funcionario"]:
        return "nome"
    if h_clean in ["cc", "centrocusto", "centrodecusto"]:
        return "cc"
    if h_clean in ["funcao", "cargo"]:
        return "funcao"
    if h_clean in ["turno"]:
        return "turno"
    if h_clean in ["data", "dt"]:
        return "data"
    if h_clean in ["dia", "diasemana"]:
        return "dia"
    if h_clean in ["1ae", "1e", "e1", "entrada1"]:
        return "e1"
    if h_clean in ["1as", "1s", "s1", "saida1"]:
        return "s1"
    if h_clean in ["2ae", "2e", "e2", "entrada2"]:
        return "e2"
    if h_clean in ["2as", "2s", "s2", "saida2"]:
        return "s2"
    if h_clean in ["3ae", "3e", "e3", "entrada3"]:
        return "e3"
    if h_clean in ["3as", "3s", "s3", "saida3"]:
        return "s3"
    if h_clean in ["4ae", "4e", "e4", "entrada4"]:
        return "e4"
    if h_clean in ["4as", "4s", "s4", "saida4"]:
        return "s4"
    if h_clean in ["he", "horasextras", "horaextra"]:
        return "he"
    if h_clean in ["absent", "ausencias", "ausencia", "falta", "faltas"]:
        return "absent"
    if h_clean in ["jornada", "jornadacontratual"]:
        return "jornada"
    if h_clean in ["adnot", "adicionalnoturno"]:
        return "adnot"
    if h_clean in ["observacao", "observacao", "obs"]:
        return "observacao"
    if h_clean in ["status", "statusvalidacao"]:
        return "status"
    if h_clean in ["saldoatual", "saldocalculado", "saldoinformado"]:
        return "saldo_atual"
    return h_clean


def format_cell_value(val):
    if val is None:
        return ""
    if isinstance(val, (datetime, date)):
        return val.strftime("%Y-%m-%d")
    if isinstance(val, time):
        return val.strftime("%H:%M")
    s = str(val).strip()
    if s.lower() in ["none", "nan", "nat"]:
        return ""
    return s


def extract_excel_consolidado(excel_path: str, output_path: str = None) -> dict:
    if openpyxl is None:
        res = {"ok": False, "erro": "Biblioteca openpyxl não está instalada no ambiente Python."}
        if output_path:
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(res, f)
        return res

    path = Path(excel_path)
    if not path.is_file():
        res = {"ok": False, "erro": f"Arquivo Excel não encontrado: {excel_path}"}
        if output_path:
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(res, f)
        return res

    try:
        wb = openpyxl.load_workbook(filename=str(path), read_only=True, data_only=True)
    except Exception as e:
        res = {"ok": False, "erro": f"Erro ao abrir Excel: {e}"}
        if output_path:
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(res, f)
        return res

    # Localiza a melhor aba (Consolidado, Consolidado Historico ou primeira aba)
    sheet_name = None
    for name in wb.sheetnames:
        norm = name.strip().lower()
        if "consolidado" in norm:
            sheet_name = name
            break
    if not sheet_name and wb.sheetnames:
        sheet_name = wb.sheetnames[0]

    if not sheet_name:
        wb.close()
        res = {"ok": False, "erro": "Nenhuma aba encontrada no arquivo Excel."}
        if output_path:
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(res, f)
        return res

    ws = wb[sheet_name]
    rows_iter = ws.iter_rows(values_only=True)

    # Localiza cabeçalho
    header_raw = None
    header_mapped = {}
    for row in rows_iter:
        if not row or not any(row):
            continue
        mapped = {}
        for idx, cell in enumerate(row):
            col_name = normalize_col(str(cell or ""))
            if col_name:
                mapped[idx] = col_name
        # Checa se parece um cabeçalho de ponto (precisa ter nome ou matricula e data)
        mapped_values = set(mapped.values())
        if ("nome" in mapped_values or "matricula" in mapped_values) and "data" in mapped_values:
            header_raw = row
            header_mapped = mapped
            break

    if not header_mapped:
        wb.close()
        res = {"ok": False, "erro": "Cabeçalho com colunas 'Nome' e 'Data' não encontrado na aba."}
        if output_path:
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(res, f)
        return res

    registros = []
    colaboradores_vistos = {}

    for row in rows_iter:
        if not row or not any(row):
            continue

        item = {}
        for idx, col_name in header_mapped.items():
            if idx < len(row):
                item[col_name] = format_cell_value(row[idx])
            else:
                item[col_name] = ""

        nome = item.get("nome", "").strip()
        data_str = item.get("data", "").strip()
        if not nome or not data_str:
            continue

        mat = item.get("matricula", "").strip()
        cc = item.get("cc", "").strip()
        funcao = item.get("funcao", "").strip()
        turno = item.get("turno", "").strip()

        colab_key = mat or nome.lower()
        if colab_key not in colaboradores_vistos:
            colaboradores_vistos[colab_key] = {
                "matricula": mat,
                "nome": nome,
                "cc": cc,
                "funcao": funcao,
                "turno": turno,
            }

        registros.append(item)

    wb.close()

    result = {
        "ok": True,
        "sheet": sheet_name,
        "total_colaboradores": len(colaboradores_vistos),
        "total_registros": len(registros),
        "colaboradores": list(colaboradores_vistos.values()),
        "registros": registros,
    }

    if output_path:
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False)

    return result


def main():
    parser = argparse.ArgumentParser(description="Extrator de Excel do Tempo Fechado para MariaDB Rubble")
    parser.add_argument("--file", required=True, help="Caminho do arquivo Excel (.xlsx)")
    parser.add_argument("--output", help="Caminho do arquivo JSON de saída (opcional)")
    args = parser.parse_args()

    res = extract_excel_consolidado(args.file, args.output)
    if not args.output:
        print(json.dumps(res, ensure_ascii=False))


if __name__ == "__main__":
    main()
