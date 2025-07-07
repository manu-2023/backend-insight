import pandas as pd
import sys
import json
import os

try:
    # 📥 Input arguments
    file_path = sys.argv[1]
    requested_headers = sys.argv[2:]

    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    ext = os.path.splitext(file_path)[1].lower()

    # 🧪 Preview first 10 rows to find header row
    if ext == '.csv':
        df_preview = pd.read_csv(file_path, header=None, nrows=10, encoding='utf-8', on_bad_lines='skip')
    elif ext == '.xlsx':
        df_preview = pd.read_excel(file_path, header=None, nrows=10, engine='openpyxl')
    elif ext == '.xls':
        df_preview = pd.read_excel(file_path, header=None, nrows=10, engine='xlrd')
    else:
        raise ValueError(f"Unsupported file format: {ext}")

    # 🔍 Find first row with >2 non-null values
    header_row_index = None
    for i, row in df_preview.iterrows():
        if row.count() > 2:
            header_row_index = i
            break

    if header_row_index is None:
        print("❌ No valid header row found", file=sys.stderr)
        sys.exit(1)

    # 📄 Load full file using detected header row
    if ext == '.csv':
        df = pd.read_csv(file_path, header=header_row_index, encoding='utf-8', on_bad_lines='skip')
    else:
        engine = 'openpyxl' if ext == '.xlsx' else 'xlrd'
        df = pd.read_excel(file_path, header=header_row_index, engine=engine)

    # ✅ Validate headers
    missing = [col for col in requested_headers if col not in df.columns]
    if missing:
        raise ValueError(f"Missing columns: {missing}")

    # 📊 Extract unique values
    result = {
        col: df[col].dropna().astype(str).unique().tolist()
        for col in requested_headers
    }

    # ✅ Print result as JSON to stdout
    print(json.dumps(result, ensure_ascii=False))

except Exception as e:
    print(json.dumps({"error": str(e)}))
    sys.exit(1)
