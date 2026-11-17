#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
ponto_pdf_extractor.py
Extrai dados estruturados de espelhos de ponto em PDF para o Rubble.
Reutiliza a lógica de regex e parsing testada do Tempo Fechado.
"""

import sys
import os
import re
import json
import argparse
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    pdfplumber = None


def extrair_matricula(texto: str) -> str:
    m = re.search(r"Matr[ií]cula:\s*\d*\s*-?\s*(\d+)", texto, re.IGNORECASE)
    if m:
        return m.group(1).strip()
    m2 = re.search(r"Chapa:\s*(\d+)", texto, re.IGNORECASE)
    return m2.group(1).strip() if m2 else ""


def extrair_nome(texto: str) -> str:
    m = re.search(r"Nome:\s*(.+?)\s+(?:Chapa|CPF|C\.C\.|Função|Turno):", texto, re.IGNORECASE)
    if m:
        return m.group(1).strip()
    m2 = re.search(r"Colaborador:\s*(.+?)\s+(?:Matrícula|CPF|CC):", texto, re.IGNORECASE)
    return m2.group(1).strip() if m2 else ""


def extrair_cc(texto: str) -> str:
    m = re.search(r"C\.C\.\:\s*(.+?)\s+(?:CPF|Função|Turno|Admissão):", texto, re.IGNORECASE)
    if m:
        return m.group(1).strip()
    m2 = re.search(r"Centro de Custo:\s*(.+?)\s+", texto, re.IGNORECASE)
    return m2.group(1).strip() if m2 else ""


def extrair_funcao(texto: str) -> str:
    m = re.search(r"Funç[aã]o:\s*(.+?)\s+(?:C\.C\.|Turno|CPF|Admissão):", texto, re.IGNORECASE)
    return m.group(1).strip() if m else ""


def extrair_turno(texto: str) -> str:
    m = re.search(r"Turno:\s*(.+?)\s+(?:Admissão|Escala|Horário|\n):", texto, re.IGNORECASE)
    return m.group(1).strip() if m else ""


def extrair_resumo_banco_horas(texto: str) -> dict:
    resumo = {
        "saldo_anterior": "00:00",
        "debito": "00:00",
        "credito": "00:00",
        "saldo_atual": "00:00",
    }
    linhas = [l.strip() for l in texto.split("\n") if l.strip()]
    for i, linha in enumerate(linhas):
        if "Banco de Horas" in linha:
            for j in range(i + 1, min(i + 6, len(linhas))):
                valores = re.findall(r"-?\d+[:,\.]\d{2}", linhas[j])
                if len(valores) >= 4:
                    resumo["saldo_anterior"] = valores[0].replace(",", ":")
                    resumo["debito"] = valores[1].replace(",", ":")
                    resumo["credito"] = valores[2].replace(",", ":")
                    resumo["saldo_atual"] = valores[3].replace(",", ":")
                    return resumo
    return resumo


PADRAO_DATA_LINHA = re.compile(r"^(\d{2}/\d{2}/\d{4})\s+([A-Za-zçãéíóú]+)", re.IGNORECASE)
PADRAO_HORA = re.compile(r"\b\d{2}:\d{2}\b")


def parse_linha_ponto(linha: str) -> dict | None:
    m = PADRAO_DATA_LINHA.search(linha)
    if not m:
        return None

    data_str = m.group(1)
    dia_str = m.group(2)
    resto = linha[m.end():].strip()

    # Extrai todas as marcações de horário no padrão HH:MM
    horarios = PADRAO_HORA.findall(resto)

    e1 = horarios[0] if len(horarios) > 0 else ""
    s1 = horarios[1] if len(horarios) > 1 else ""
    e2 = horarios[2] if len(horarios) > 2 else ""
    s2 = horarios[3] if len(horarios) > 3 else ""
    e3 = horarios[4] if len(horarios) > 4 else ""
    s3 = horarios[5] if len(horarios) > 5 else ""
    e4 = horarios[6] if len(horarios) > 6 else ""
    s4 = horarios[7] if len(horarios) > 7 else ""

    he = ""
    absent = ""
    jornada = ""
    adnot = ""

    # Procura valores de H.E., Ausência e Adicional Noturno
    m_he = re.search(r"H\.?E\.?[:\s]*(\d{2}:\d{2})", resto, re.IGNORECASE)
    if m_he:
        he = m_he.group(1)

    m_abs = re.search(r"(?:Absent|Falta|Aus[êe]ncia)[:\s]*(\d{2}:\d{2})", resto, re.IGNORECASE)
    if m_abs:
        absent = m_abs.group(1)

    # Identifica texto de observação ou justificativa impressa (ex: DSR, Atestado, Férias)
    obs = ""
    for termo in ["DSR", "D.S.R", "COMPENSADO", "ATESTADO", "FÉRIAS", "FERIAS", "AFASTAMENTO", "FOLGA"]:
        if termo in resto.upper():
            obs = termo
            break

    return {
        "data": data_str,
        "dia": dia_str,
        "e1": e1,
        "s1": s1,
        "e2": e2,
        "s2": s2,
        "e3": e3,
        "s3": s3,
        "e4": e4,
        "s4": s4,
        "he": he,
        "absent": absent,
        "jornada": jornada,
        "adnot": adnot,
        "observacao": obs,
        "status": "OK",
    }


def processar_pdf(caminho_pdf: Path) -> list:
    if pdfplumber is None:
        raise RuntimeError("pdfplumber não está instalado neste ambiente.")

    colaboradores = {}

    with pdfplumber.open(str(caminho_pdf)) as pdf:
        for num_pagina, pagina in enumerate(pdf.pages, start=1):
            texto = pagina.extract_text() or ""
            if not texto.strip():
                continue

            matricula = extrair_matricula(texto)
            nome = extrair_nome(texto)

            if not matricula and not nome:
                matricula = f"PAG_{num_pagina}"
                nome = f"Colaborador {num_pagina}"

            chave = matricula or nome

            if chave not in colaboradores:
                colaboradores[chave] = {
                    "cabecalho": {
                        "matricula": matricula,
                        "nome": nome,
                        "cc": extrair_cc(texto),
                        "funcao": extrair_funcao(texto),
                        "turno": extrair_turno(texto),
                    },
                    "registros": [],
                    "banco_horas": extrair_resumo_banco_horas(texto),
                }

            # Itera linhas para extrair batidas de ponto
            for linha in texto.split("\n"):
                reg = parse_linha_ponto(linha)
                if reg:
                    colaboradores[chave]["registros"].append(reg)

    # Calcula dias com HE e ausência
    for colab in colaboradores.values():
        dias_he = sum(1 for r in colab["registros"] if r.get("he") and r["he"] != "00:00")
        dias_abs = sum(1 for r in colab["registros"] if r.get("absent") and r["absent"] != "00:00")
        colab["banco_horas"]["dias_com_he"] = dias_he
        colab["banco_horas"]["dias_com_ausencia"] = dias_abs

    return list(colaboradores.values())


def main():
    parser = argparse.ArgumentParser(description="Extrai dados de folhas de ponto em PDF para o Rubble.")
    parser.add_argument("--dir", help="Diretório contendo arquivos PDF")
    parser.add_argument("--file", help="Arquivo PDF específico")
    args = parser.parse_args()

    arquivos = []
    if args.dir:
        p_dir = Path(args.dir)
        if p_dir.is_dir():
            arquivos.extend(sorted([f for f in p_dir.iterdir() if f.is_file() and f.suffix.lower() == ".pdf"]))
    elif args.file:
        p_file = Path(args.file)
        if p_file.is_file():
            arquivos.append(p_file)

    if not arquivos:
        print(json.dumps({"success": False, "error": "Nenhum arquivo PDF encontrado para processamento."}))
        sys.exit(1)

    todos_colaboradores = []
    try:
        for arq in arquivos:
            resultado = processar_pdf(arq)
            todos_colaboradores.extend(resultado)

        print(json.dumps({
            "success": True,
            "total_arquivos": len(arquivos),
            "dados": todos_colaboradores
        }, ensure_ascii=False))
        sys.exit(0)
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
