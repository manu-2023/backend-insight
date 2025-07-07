import sys
import pandas as pd
import json
import os

try:
    file_path = sys.argv[1]

    if not os.path.exists(file_path):
        print(json.dumps({"error": "File not found"}))
        sys.exit(1)

    ext = os.path.splitext(file_path)[1].lower()

    # Read the file depending on its extension
    if ext == '.csv':
        df = pd.read_csv(file_path, header=None, encoding='utf-8', on_bad_lines='skip', low_memory=False)
    elif ext == '.xlsx':
        df = pd.read_excel(file_path, header=None, engine='openpyxl')
    elif ext == '.xls':
        df = pd.read_excel(file_path, header=None, engine='xlrd')
    else:
        print(json.dumps({"error": f"Unsupported file format: {ext}"}))
        sys.exit(1)

    header_row_index = -1
    headers = []

    for i, row in df.iterrows():
        if row.count() >= 3:  # heuristic: first row with at least 3 non-empty cells
            headers = row.fillna('').astype(str).tolist()
            header_row_index = i
            break

    result = {
        "headers": headers,
        "headerRowIndex": header_row_index
    }

    print(json.dumps(result))

except Exception as e:
    print(json.dumps({"error": str(e)}))
    sys.exit(1)
