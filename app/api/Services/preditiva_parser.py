#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Script de processamento e merge de planilha Infratel CLIMA com o template Preditiva_parse.
Rubble Maintenance System.
"""

import sys
import os
import argparse
import json
import warnings
warnings.filterwarnings('ignore')
import openpyxl
from datetime import datetime, date


def clean_str(val):
    if val is None:
        return ""
    return str(val).strip()


def normalize_key(site, equip):
    return (clean_str(site).upper(), clean_str(equip).upper())


def format_observation(justificativa, acao_tecnico):
    just = clean_str(justificativa)
    acao = clean_str(acao_tecnico)

    is_just_empty = not just or just.upper() == "N/A"
    is_acao_empty = not acao or acao.upper() == "N/A"

    if is_just_empty and is_acao_empty:
        return "N/A"
    elif not is_just_empty and not is_acao_empty:
        if just == acao:
            return just
        return f"{just} | {acao}"
    elif not is_just_empty:
        return just
    else:
        return acao


def format_date_value(val):
    if val is None:
        return None
    if isinstance(val, (datetime, date)):
        return val
    s = clean_str(val)
    if not s or s.upper() == "N/A":
        return None
    # Tenta converter formatos comuns
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d/%m/%Y %H:%M:%S", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            pass
    return s


def load_excel_safe(path: str, data_only: bool = False):
    """
    Carrega planilha Excel com segurança mesmo que o caminho temporário
    não possua extensão .xlsx (ex: arquivos temporários do PHP /tmp/phpXXXXXX).
    """
    try:
        if str(path).lower().endswith(('.xlsx', '.xlsm', '.xltx', '.xltm')):
            return openpyxl.load_workbook(path, data_only=data_only)
    except Exception:
        pass

    with open(path, 'rb') as f:
        return openpyxl.load_workbook(f, data_only=data_only)


def process_preditiva_excel(clima_path: str, template_path: str, output_path: str) -> dict:
    if not os.path.exists(clima_path):
        raise FileNotFoundError(f"Arquivo CLIMA não encontrado: {clima_path}")
    if not os.path.exists(template_path):
        raise FileNotFoundError(f"Arquivo Template não encontrado: {template_path}")

    # 1. Carrega a planilha CLIMA e constrói o dicionário de busca
    wb_clima = load_excel_safe(clima_path, data_only=True)
    ws_clima = wb_clima.active
    
    clima_dict = {}
    for r in range(2, ws_clima.max_row + 1):
        site_val = ws_clima.cell(r, 1).value
        eq_val = ws_clima.cell(r, 8).value
        if not site_val or not eq_val:
            continue
        
        key = normalize_key(site_val, eq_val)
        
        inicio_val = ws_clima.cell(r, 4).value
        fim_val = ws_clima.cell(r, 5).value
        fato_val = ws_clima.cell(r, 6).value
        status_val = ws_clima.cell(r, 9).value
        executor_val = ws_clima.cell(r, 10).value
        just_val = ws_clima.cell(r, 17).value
        acao_val = ws_clima.cell(r, 18).value
        
        # Guarda o registro (se houver duplicatas na planilha CLIMA, prioriza a que tem fim/status preenchido)
        clima_dict[key] = {
            "inicio": inicio_val,
            "fim": fim_val,
            "fato": clean_str(fato_val),
            "status": clean_str(status_val).upper(),
            "executor": clean_str(executor_val),
            "observacao": format_observation(just_val, acao_val)
        }

    # 2. Carrega a planilha Template (preserva todas as abas e formatações)
    wb_template = load_excel_safe(template_path)
    
    sheet_name = 'PREVENTIVAS_PARSE' if 'PREVENTIVAS_PARSE' in wb_template.sheetnames else wb_template.sheetnames[0]
    ws_dest = wb_template[sheet_name]

    total_rows = 0
    matched_rows = 0
    unmatched_rows = 0

    # Iterar a partir da linha 2
    for r in range(2, ws_dest.max_row + 1):
        site_infratel = ws_dest.cell(r, 15).value  # Coluna 15: Site Infratel
        tags_equip = ws_dest.cell(r, 5).value       # Coluna 5: TAG'S

        if site_infratel is None and tags_equip is None:
            continue

        total_rows += 1
        key = normalize_key(site_infratel, tags_equip)

        if key in clima_dict:
            matched_rows += 1
            clima_info = clima_dict[key]

            # EXECUTADAS <- Fim (col 10)
            fim_date = format_date_value(clima_info["fim"])
            if fim_date is not None:
                ws_dest.cell(r, 10).value = fim_date
                if isinstance(fim_date, (datetime, date)):
                    ws_dest.cell(r, 10).number_format = 'yyyy-mm-dd hh:mm:ss'

            # TÉCNICO <- Executor (col 11)
            if clima_info["executor"]:
                ws_dest.cell(r, 11).value = clima_info["executor"]

            # CONFORMIDADE <- Fato (col 12)
            if clima_info["fato"]:
                ws_dest.cell(r, 12).value = clima_info["fato"]

            # STATUS <- Status em MAIÚSCULAS (col 13)
            if clima_info["status"]:
                ws_dest.cell(r, 13).value = clima_info["status"]

            # OBSERVAÇÃO <- Justificativas + Ação Técnico (col 14)
            if clima_info["observacao"]:
                ws_dest.cell(r, 14).value = clima_info["observacao"]
        else:
            unmatched_rows += 1

    # 3. Salva no destino
    output_dir = os.path.dirname(os.path.abspath(output_path))
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)

    wb_template.save(output_path)

    return {
        "success": True,
        "total_rows": total_rows,
        "matched_rows": matched_rows,
        "unmatched_rows": unmatched_rows,
        "output_path": output_path
    }


def main():
    parser = argparse.ArgumentParser(description="Processa planilha Infratel CLIMA e preenche Preditiva_parse")
    parser.add_argument("--clima", required=True, help="Caminho do arquivo CLIMA_*.xlsx")
    parser.add_argument("--template", required=True, help="Caminho do arquivo template Preditiva_parse.xlsx")
    parser.add_argument("--output", required=True, help="Caminho do arquivo de saída gerado")

    args = parser.parse_args()

    try:
        stats = process_preditiva_excel(args.clima, args.template, args.output)
        print(json.dumps(stats, ensure_ascii=False))
        sys.exit(0)
    except Exception as e:
        error_res = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(error_res, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
