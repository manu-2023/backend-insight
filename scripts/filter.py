import sys
import pandas as pd
import json
import os
import logging

logging.basicConfig(stream=sys.stderr, level=logging.INFO, format="%(levelname)s: %(message)s")

try:
    input_data = json.loads(sys.argv[1])
    file_path = input_data.get("filePath")
    filters = {k: v for k, v in input_data.items() if k != "filePath"}
except Exception as e:
    logging.error(f"Failed to parse input: {e}")
    print(json.dumps({"error": f"Failed to parse input: {e}"}))
    sys.exit(1)

try:
    _, ext = os.path.splitext(file_path)
    if ext == ".csv":
        df = pd.read_csv(file_path, low_memory=False)
    elif ext in [".xlsx", ".xls"]:
        df = pd.read_excel(file_path, sheet_name=0, header=1, engine='openpyxl')
    else:
        raise ValueError("Unsupported file type")
except Exception as e:
    logging.error(f"File load failed: {e}")
    print(json.dumps({"error": f"File load failed: {e}"}))
    sys.exit(1)

# Apply filters
try:
    for key, value in filters.items():
        if key not in df.columns:
            raise ValueError(f"Filter key '{key}' not found in file")
        df = df[df[key] == value]

    if df.empty:
        raise ValueError("No data matched the given filters")
except Exception as e:
    logging.error(f"Filtering failed: {e}")
    print(json.dumps({"error": f"Filtering failed: {e}"}))
    sys.exit(1)

# Output filtered data
try:
    result = df.to_dict(orient="records")
    print(df.where(pd.notnull(df), None).to_json(orient="records"))
except Exception as e:
    logging.error(f"Failed to convert data to JSON: {e}")
    print(json.dumps({"error": f"Failed to convert data to JSON: {e}"}))
    sys.exit(1)
